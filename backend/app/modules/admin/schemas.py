import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.common.enums import AccountStatus, SwapRequestStatus, UserRole


class AdminOverviewResponse(BaseModel):
    total_students: int
    active_students: int
    suspended_students: int
    total_requests: int
    active_requests: int
    matched_requests: int
    total_matches: int
    confirmed_matches: int
    completed_matches: int
    total_messages: int
    total_courses: int
    total_campuses: int


class AdminUserItem(BaseModel):
    id: uuid.UUID
    email: str
    student_code: str
    full_name: str | None = None
    major: str | None = None
    campus_id: uuid.UUID
    campus_code: str | None = None
    campus_name: str | None = None
    role: UserRole
    status: AccountStatus
    request_count: int = 0
    totp_enabled: bool = False
    scheduled_purge_at: datetime | None = None
    created_at: datetime


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    student_code: str = Field(min_length=4, max_length=32)
    full_name: str = Field(min_length=2, max_length=120)
    major: str = Field(min_length=2, max_length=120)
    campus_id: uuid.UUID | str
    password: str = Field(min_length=8, max_length=128)
    role: UserRole = UserRole.STUDENT

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("student_code")
    @classmethod
    def normalize_code(cls, v: str) -> str:
        return v.strip().upper()


class AdminUpdateStatusRequest(BaseModel):
    status: AccountStatus


class AdminUpdateRoleRequest(BaseModel):
    role: UserRole


class AdminResetPasswordRequest(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class AdminRequestItem(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    student_email: str
    student_code: str
    student_name: str | None = None
    campus_name: str | None = None
    course_code: str | None = None
    semester_name: str | None = None
    current_class_code: str | None = None
    target_class_code: str | None = None
    status: SwapRequestStatus
    note: str | None = None
    created_at: datetime


class AdminAuditLogItem(BaseModel):
    id: uuid.UUID
    actor_id: uuid.UUID | None = None
    actor_email: str | None = None
    action: str
    entity_type: str
    entity_id: uuid.UUID | None = None
    details: dict[str, Any] | None = None
    created_at: datetime
