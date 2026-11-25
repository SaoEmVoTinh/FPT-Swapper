import base64
import pathlib
import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.communication import Conversation
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.chat.schemas import ConversationResponse, MessageCreate, MessageResponse
from app.modules.chat.service import ChatService
from app.modules.realtime.hub import realtime_hub
from app.modules.realtime.router import build_chat_message_event
from app.modules.views import conversation_view

router = APIRouter(prefix="/conversations", tags=["Chat"])

_UPLOAD_DIR = pathlib.Path(__file__).resolve().parents[3] / "uploads" / "chat"
_SAFE_FILENAME_RE = re.compile(r"^[0-9a-f-]{36}\.(png|jpg|jpeg|webp)$")
_MAX_IMAGE_BYTES = 2 * 1024 * 1024  # 2 MB


class ChatImageUploadRequest(BaseModel):
    data_url: str = Field(min_length=20, max_length=3_200_000)


class ChatImageUploadResponse(BaseModel):
    attachment_url: str


def _detect_image_ext(raw: bytes) -> str | None:
    if raw.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if raw.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if raw.startswith(b"RIFF") and raw[8:12] == b"WEBP":
        return "webp"
    return None


@router.get("/attachments/{filename}")
def get_chat_attachment(filename: str):
    if not _SAFE_FILENAME_RE.match(filename):
        raise HTTPException(404, "Attachment not found")
    path = _UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(404, "Attachment not found")
    return FileResponse(path)


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return [
        conversation_view(db, conv, current_student.id)
        for conv in ChatService.list_conversations(db, current_student.id)
    ]


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    conv = ChatService.get_conversation(db, conversation_id, current_student.id)
    return conversation_view(db, conv, current_student.id)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ChatService.list_messages(db, conversation_id, current_student.id, limit, before)


@router.post("/{conversation_id}/attachments", response_model=ChatImageUploadResponse)
def upload_chat_attachment(
    conversation_id: uuid.UUID,
    payload: ChatImageUploadRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    ChatService.get_conversation(db, conversation_id, current_student.id)
    raw_input = payload.data_url.strip()
    if "," in raw_input and raw_input.startswith("data:"):
        _, b64_part = raw_input.split(",", 1)
    else:
        b64_part = raw_input
    try:
        decoded = base64.b64decode(b64_part, validate=True)
    except Exception:
        raise HTTPException(422, "Dữ liệu ảnh không hợp lệ.")
    if len(decoded) > _MAX_IMAGE_BYTES:
        raise HTTPException(413, "Ảnh TKB tối đa 2MB.")
    ext = _detect_image_ext(decoded)
    if ext is None:
        raise HTTPException(422, "Chỉ hỗ trợ ảnh PNG, JPG hoặc WEBP.")

    _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    (_UPLOAD_DIR / filename).write_bytes(decoded)
    return ChatImageUploadResponse(attachment_url=f"/api/v1/conversations/attachments/{filename}")


@router.post("/{conversation_id}/read")
def mark_conversation_read(
    conversation_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    conv, read_at = ChatService.mark_read(db, conversation_id, current_student.id)
    member_ids = [m.student_id for m in conv.members]
    realtime_hub.emit_from_sync(
        member_ids,
        {
            "type": "chat.read",
            "data": {
                "conversation_id": str(conversation_id),
                "reader_id": str(current_student.id),
                "read_at": read_at.isoformat(),
            },
        },
    )
    return {"conversation_id": str(conversation_id), "read_at": read_at.isoformat()}


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: uuid.UUID,
    data: MessageCreate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    msg = ChatService.send_message(db, conversation_id, current_student.id, data)
    conv = db.get(Conversation, conversation_id)
    if conv:
        member_ids = [m.student_id for m in conv.members]
        realtime_hub.emit_from_sync(member_ids, build_chat_message_event(msg))
    return msg
