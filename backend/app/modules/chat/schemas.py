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
    # Viewer-relative display fields (filled by views.conversation_view)
    match_id: uuid.UUID | None = None
    partner_name: str | None = None
    course_code: str | None = None
    my_class_code: str | None = None
    partner_class_code: str | None = None
    match_status: str | None = None
    last_message: str | None = None
    last_message_at: datetime | None = None
    last_message_sender_id: uuid.UUID | None = None
