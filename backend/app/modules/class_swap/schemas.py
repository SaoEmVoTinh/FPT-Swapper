import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, field_validator

from app.common.enums import SwapRequestStatus


class CreateRequestSchema(BaseModel):
    semester_id: uuid.UUID
    course_id: uuid.UUID
    current_class_id: uuid.UUID
    target_class_id: uuid.UUID
    note: str | None = None
    expires_at: datetime | None = None

    @field_validator("target_class_id")
    @classmethod
    def different_classes(cls, v: uuid.UUID, info) -> uuid.UUID:
        if "current_class_id" in info.data and v == info.data["current_class_id"]:
            raise ValueError("target_class_id must differ from current_class_id")
        return v


class UpdateRequestSchema(BaseModel):
    note: str | None = None
    expires_at: datetime | None = None
    status: SwapRequestStatus | None = None


class RequestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    semester_id: uuid.UUID
    course_id: uuid.UUID
    current_class_id: uuid.UUID
    target_class_id: uuid.UUID
    note: str | None
    expires_at: datetime | None
    status: SwapRequestStatus
    created_at: datetime
    updated_at: datetime
