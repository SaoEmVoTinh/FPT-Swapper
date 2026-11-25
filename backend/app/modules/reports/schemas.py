import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import ReportStatus


class ReportCreateRequest(BaseModel):
    reported_student_id: uuid.UUID | None = None
    conversation_id: uuid.UUID | None = None
    reason: str = Field(min_length=2, max_length=120)
    details: str | None = Field(default=None, max_length=2000)


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    reporter_id: uuid.UUID | None
    reported_student_id: uuid.UUID | None
    conversation_id: uuid.UUID | None
    reason: str
    details: str | None
    status: ReportStatus
    resolution_note: str | None = None
    created_at: datetime
    updated_at: datetime
