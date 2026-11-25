import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

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


class NotificationPreferencesResponse(BaseModel):
    notify_email: bool = True
    notify_push: bool = True
    vapid_public_key: str | None = None
    push_subscriptions_count: int = 0


class NotificationPreferencesUpdate(BaseModel):
    notify_email: bool | None = None
    notify_push: bool | None = None


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=4, max_length=255)
    auth: str = Field(min_length=4, max_length=255)


class PushSubscriptionCreate(BaseModel):
    endpoint: str = Field(min_length=8, max_length=1024)
    keys: PushSubscriptionKeys
    user_agent: str | None = Field(default=None, max_length=255)


class PushSubscriptionDelete(BaseModel):
    endpoint: str | None = None
