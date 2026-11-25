import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.chat.schemas import ConversationResponse, MessageCreate, MessageResponse
from app.modules.chat.service import ChatService

router = APIRouter(prefix="/conversations", tags=["Chat"])


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ChatService.list_conversations(db, current_student.id)


@router.get("/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ChatService.get_conversation(db, conversation_id, current_student.id)


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: uuid.UUID,
    limit: int = Query(50, ge=1, le=100),
    before: datetime | None = Query(None),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ChatService.list_messages(db, conversation_id, current_student.id, limit, before)


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
def send_message(
    conversation_id: uuid.UUID,
    data: MessageCreate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ChatService.send_message(db, conversation_id, current_student.id, data)
