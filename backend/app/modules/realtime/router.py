import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.database.models.communication import Conversation
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.chat.schemas import MessageCreate, MessageResponse
from app.modules.chat.service import ChatService
from app.modules.realtime.hub import realtime_hub

router = APIRouter(tags=["Realtime"])


def _authenticate_websocket(websocket: WebSocket, db: Session) -> Student | None:
    token = websocket.cookies.get("access_token") or websocket.query_params.get("token")
    if not token:
        return None
    try:
        payload = decode_token(token)
        if payload.get("type") not in ("access", "ws_ticket"):
            return None
        student_id = uuid.UUID(payload.get("sub", ""))
    except (JWTError, ValueError):
        return None

    student = db.get(Student, student_id)
    if student is None or student.status.value != "ACTIVE":
        return None
    return student


def build_chat_message_event(msg: Any) -> dict[str, Any]:
    return {
        "type": "chat.message.new",
        "data": MessageResponse.model_validate(msg).model_dump(mode="json"),
    }


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    student = _authenticate_websocket(websocket, db)
    if student is None:
        await websocket.close(code=4401)
        return

    await realtime_hub.connect(student.id, websocket)
    try:
        while True:
            payload = await websocket.receive_json()
            if not isinstance(payload, dict):
                continue
            event_type = payload.get("type")

            if event_type == "ping":
                await websocket.send_json({"type": "pong"})
                continue

            if event_type == "chat.message.send":
                client_message_id = payload.get("client_message_id")
                try:
                    conv_id = uuid.UUID(str(payload.get("conversation_id", "")))
                    content = str(payload.get("content", "")).strip()
                    if not content:
                        raise HTTPException(422, "Message content cannot be empty")
                    msg = ChatService.send_message(
                        db,
                        conv_id,
                        student.id,
                        MessageCreate(content=content, client_message_id=client_message_id),
                    )
                    conv = db.get(Conversation, conv_id)
                    member_ids = [m.student_id for m in conv.members] if conv else [student.id]
                    await realtime_hub.publish_to_users(member_ids, build_chat_message_event(msg))
                except HTTPException as exc:
                    await websocket.send_json({
                        "type": "error",
                        "detail": exc.detail,
                        "client_message_id": client_message_id,
                    })
                except ValueError:
                    await websocket.send_json({
                        "type": "error",
                        "detail": "Invalid conversation_id",
                        "client_message_id": client_message_id,
                    })
    except WebSocketDisconnect:
        realtime_hub.disconnect(student.id, websocket)
    except Exception:
        realtime_hub.disconnect(student.id, websocket)
