import asyncio
import contextlib
import json
import logging
import uuid
from collections import defaultdict
from typing import Any

from fastapi import WebSocket

from app.core.config import settings

logger = logging.getLogger(__name__)

REDIS_EVENTS_CHANNEL = "fpt_classswap:ws:events"


class RealtimeHub:
    """Manages per-user WebSocket connections with optional Redis Pub/Sub fan-out."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._loop: asyncio.AbstractEventLoop | None = None
        self._redis: Any = None
        self._pubsub: Any = None
        self._listener_task: asyncio.Task[None] | None = None

    async def start(self) -> None:
        self._loop = asyncio.get_running_loop()
        if not settings.REDIS_URL:
            return
        try:
            import redis.asyncio as aioredis

            self._redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await self._redis.ping()
            self._pubsub = self._redis.pubsub()
            await self._pubsub.subscribe(REDIS_EVENTS_CHANNEL)
            self._listener_task = asyncio.create_task(self._listen_redis())
            logger.info("RealtimeHub connected to Redis Pub/Sub")
        except Exception as exc:
            logger.warning("Redis Pub/Sub unavailable, falling back to in-memory hub: %s", exc)
            await self.stop()

    async def stop(self) -> None:
        if self._listener_task:
            self._listener_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._listener_task
            self._listener_task = None
        if self._pubsub:
            with contextlib.suppress(Exception):
                await self._pubsub.unsubscribe(REDIS_EVENTS_CHANNEL)
                await self._pubsub.aclose()
            self._pubsub = None
        if self._redis:
            with contextlib.suppress(Exception):
                await self._redis.aclose()
            self._redis = None

    async def _listen_redis(self) -> None:
        assert self._pubsub is not None
        async for raw in self._pubsub.listen():
            if raw.get("type") != "message":
                continue
            try:
                envelope = json.loads(raw["data"])
                target_ids = [uuid.UUID(sid) for sid in envelope.get("target_student_ids", [])]
                event = envelope.get("event", {})
                await self._deliver_local(target_ids, event)
            except Exception as exc:
                logger.warning("Failed to process Redis WS event: %s", exc)

    async def connect(self, student_id: uuid.UUID, websocket: WebSocket) -> None:
        self._loop = asyncio.get_running_loop()
        await websocket.accept()
        self._connections[student_id].add(websocket)

    def disconnect(self, student_id: uuid.UUID, websocket: WebSocket) -> None:
        sockets = self._connections.get(student_id)
        if not sockets:
            return
        sockets.discard(websocket)
        if not sockets:
            self._connections.pop(student_id, None)

    async def _deliver_local(self, student_ids: list[uuid.UUID], event: dict[str, Any]) -> None:
        dead: list[tuple[uuid.UUID, WebSocket]] = []
        for sid in student_ids:
            for ws in list(self._connections.get(sid, ())):
                try:
                    await ws.send_json(event)
                except Exception:
                    dead.append((sid, ws))
        for sid, ws in dead:
            self.disconnect(sid, ws)

    async def publish_to_users(self, student_ids: list[uuid.UUID], event: dict[str, Any]) -> None:
        if not student_ids:
            return
        if self._redis is not None:
            try:
                payload = json.dumps({
                    "target_student_ids": [str(sid) for sid in student_ids],
                    "event": event,
                })
                await self._redis.publish(REDIS_EVENTS_CHANNEL, payload)
                return
            except Exception as exc:
                logger.warning("Redis publish failed, delivering locally: %s", exc)
        await self._deliver_local(student_ids, event)

    def emit_from_sync(self, student_ids: list[uuid.UUID], event: dict[str, Any]) -> None:
        """Schedule event delivery from a synchronous FastAPI route."""
        if not student_ids or self._loop is None or self._loop.is_closed():
            return
        asyncio.run_coroutine_threadsafe(self.publish_to_users(student_ids, event), self._loop)


realtime_hub = RealtimeHub()
