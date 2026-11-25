import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.common.enums import NotificationType


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    notification_type: NotificationType
    title: str
    body: str
    is_read: bool
    reference_id: uuid.UUID | None
    created_at: datetime
