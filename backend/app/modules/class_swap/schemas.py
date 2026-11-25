import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.common.enums import SwapRequestStatus


class CreateRequestSchema(BaseModel):
    semester_id: uuid.UUID
    course_id: uuid.UUID
    current_class_id: uuid.UUID | None = None
    target_class_id: uuid.UUID | None = None
    current_class_code: str | None = Field(default=None, max_length=64)
    target_class_code: str | None = Field(default=None, max_length=64)
    current_day_of_week: str | None = Field(default=None, max_length=40)
    current_slot: str | None = Field(default=None, max_length=64)
    target_day_of_week: str | None = Field(default=None, max_length=40)
    target_slot: str | None = Field(default=None, max_length=64)
    note: str | None = None
    expires_at: datetime | None = None

    @model_validator(mode="after")
    def validate_class_inputs(self) -> "CreateRequestSchema":
        cur_code = self.current_class_code.strip().upper() if self.current_class_code else None
        tgt_code = self.target_class_code.strip().upper() if self.target_class_code else None
        self.current_class_code = cur_code or None
        self.target_class_code = tgt_code or None

        if self.current_class_id is None and not self.current_class_code:
            raise ValueError("Vui lòng chọn hoặc nhập mã lớp hiện tại.")
        if self.target_class_id is None and not self.target_class_code:
            raise ValueError("Vui lòng chọn hoặc nhập mã lớp mong muốn.")
        if (
            self.current_class_id is not None
            and self.target_class_id is not None
            and self.current_class_id == self.target_class_id
        ):
            raise ValueError("target_class_id must differ from current_class_id")
        if (
            self.current_class_id is None
            and self.target_class_id is None
            and self.current_class_code == self.target_class_code
        ):
            raise ValueError("Lớp hiện tại và lớp mong muốn không được trùng nhau.")
        return self


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
    # Enriched display fields (filled by views.request_view)
    course_code: str | None = None
    course_name: str | None = None
    semester_name: str | None = None
    campus_id: uuid.UUID | None = None
    campus_name: str | None = None
    current_class_code: str | None = None
    current_schedule_text: str | None = None
    target_class_code: str | None = None
    target_schedule_text: str | None = None
    lecturer_current: str | None = None
    schedule_conflict_warning: str | None = None


class TimetableSlotItem(BaseModel):
    request_id: uuid.UUID | None = None
    course_code: str
    course_name: str
    class_code: str
    semester_name: str
    day_key: str
    day_label: str
    slot_key: str
    slot_label: str
    room: str | None = None
    lecturer: str | None = None
    status: str
