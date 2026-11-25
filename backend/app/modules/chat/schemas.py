import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.common.enums import ConversationStatus, MessageType


class MessageCreate(BaseModel):
    content: str
    client_message_id: str | None = None


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    content: str
    message_type: MessageType
    client_message_id: str | None
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime
