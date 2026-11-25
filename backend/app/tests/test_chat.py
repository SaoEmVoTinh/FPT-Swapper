"""Tests for Chat and Notifications (M6)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.database.session import get_db
from app.database.models import Campus  # noqa
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_chat.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    if not db.get(Campus, CAMPUS_ID):
        db.add(Campus(id=CAMPUS_ID, code="HN", name="Hà Nội"))
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import pathlib
    pathlib.Path("test_chat.db").unlink(missing_ok=True)


@pytest.fixture(scope="session")
def db_session():
    db = TestingSessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="session")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _make_conversation(db, student_a_id, student_b_id):
    from app.database.models.communication import Conversation, ConversationMember
    from app.common.enums import ConversationType, ConversationSourceType

    conv = Conversation(
        source_type=ConversationSourceType.CLASS_SWAP,
        source_id=uuid.uuid4(),
        conversation_type=ConversationType.DIRECT,
    )
    db.add(conv)
    db.flush()
    db.add(ConversationMember(conversation_id=conv.id, student_id=student_a_id))
    db.add(ConversationMember(conversation_id=conv.id, student_id=student_b_id))
    db.commit()
    db.refresh(conv)
    return conv


# ══════════════════════════════════════════════════════════════════
#  Chat tests
# ══════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def chat_ctx(db_session):
    student_a, token_a = make_student(db_session, "chat_a@fpt.edu.vn")
    student_b, token_b = make_student(db_session, "chat_b@fpt.edu.vn")
    outsider, token_out = make_student(db_session, "outsider@fpt.edu.vn")
    conv = _make_conversation(db_session, student_a.id, student_b.id)
    return {
        "token_a": token_a, "token_b": token_b, "token_out": token_out,
        "conv_id": str(conv.id),
    }


def test_list_conversations(client, chat_ctx):
    token_a = chat_ctx["token_a"]
    r = client.get("/api/v1/conversations", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_get_conversation(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_a = chat_ctx["token_a"]
    r = client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers(token_a))
    assert r.status_code == 200


def test_outsider_cannot_get_conversation(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_out = chat_ctx["token_out"]
    r = client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers(token_out))
    assert r.status_code == 403


def test_send_message(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_a = chat_ctx["token_a"]
    r = client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "Hello!", "client_message_id": "msg-001"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["content"] == "Hello!"


def test_idempotent_message(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_a = chat_ctx["token_a"]
    payload = {"content": "Idempotent", "client_message_id": "msg-idem-001"}
    r1 = client.post(f"/api/v1/conversations/{conv_id}/messages",
                     json=payload, headers=auth_headers(token_a))
    r2 = client.post(f"/api/v1/conversations/{conv_id}/messages",
                     json=payload, headers=auth_headers(token_a))
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]


def test_list_messages(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_a = chat_ctx["token_a"]
    r = client.get(f"/api/v1/conversations/{conv_id}/messages",
                   headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_outsider_cannot_send(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    token_out = chat_ctx["token_out"]
    r = client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "hack"},
        headers=auth_headers(token_out),
    )
    assert r.status_code == 403


# ══════════════════════════════════════════════════════════════════
#  Notifications tests
# ══════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def notif_ctx(db_session):
    from app.database.models.operations import Notification
    from app.common.enums import NotificationType

    student, token = make_student(db_session, "notif_user@fpt.edu.vn")
    notif = Notification(
        student_id=student.id,
        notification_type=NotificationType.MATCH,
        title="New Match!",
        body="You got a match for PRF192.",
        is_read=False,
    )
    db_session.add(notif)
    db_session.commit()
    return {"token": token, "notif_id": str(notif.id)}


def test_list_notifications(client, notif_ctx):
    token = notif_ctx["token"]
    r = client.get("/api/v1/notifications", headers=auth_headers(token))
    assert r.status_code == 200
    assert len(r.json()) >= 1
    assert r.json()[0]["is_read"] is False


def test_mark_notification_read(client, notif_ctx):
    notif_id = notif_ctx["notif_id"]
    token = notif_ctx["token"]
    r = client.patch(f"/api/v1/notifications/{notif_id}/read", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json()["is_read"] is True


def test_unread_only_filter(client, notif_ctx):
    token = notif_ctx["token"]
    r = client.get("/api/v1/notifications?unread_only=true", headers=auth_headers(token))
    assert r.status_code == 200
    assert r.json() == []


# ══════════════════════════════════════════════════════════════════
#  Realtime WebSocket tests
# ══════════════════════════════════════════════════════════════════

def test_ws_rejects_unauthenticated(client):
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as exc_info:
        with client.websocket_connect("/api/v1/ws"):
            pass
    assert exc_info.value.code == 4401


def test_ws_ticket_and_ping_pong(client, chat_ctx):
    r = client.get("/api/v1/auth/ws-ticket", cookies={"access_token": chat_ctx["token_a"]})
    assert r.status_code == 200
    ticket = r.json()["ticket"]

    with client.websocket_connect(f"/api/v1/ws?token={ticket}") as ws:
        ws.send_json({"type": "ping"})
        assert ws.receive_json() == {"type": "pong"}


def test_ws_realtime_chat_between_members(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    with client.websocket_connect(f"/api/v1/ws?token={chat_ctx['token_a']}") as ws_a:
        with client.websocket_connect(f"/api/v1/ws?token={chat_ctx['token_b']}") as ws_b:
            ws_a.send_json({
                "type": "chat.message.send",
                "conversation_id": conv_id,
                "content": "Realtime hello!",
                "client_message_id": "ws-msg-001",
            })
            evt_a = ws_a.receive_json()
            evt_b = ws_b.receive_json()

            assert evt_a["type"] == "chat.message.new"
            assert evt_b["type"] == "chat.message.new"
            assert evt_a["data"]["id"] == evt_b["data"]["id"]
            assert evt_b["data"]["content"] == "Realtime hello!"
            assert evt_b["data"]["client_message_id"] == "ws-msg-001"


def test_ws_outsider_cannot_send(client, chat_ctx):
    conv_id = chat_ctx["conv_id"]
    with client.websocket_connect(f"/api/v1/ws?token={chat_ctx['token_out']}") as ws_out:
        ws_out.send_json({
            "type": "chat.message.send",
            "conversation_id": conv_id,
            "content": "hack ws",
            "client_message_id": "ws-hack-001",
        })
        evt = ws_out.receive_json()
        assert evt["type"] == "error"
        assert evt["client_message_id"] == "ws-hack-001"
