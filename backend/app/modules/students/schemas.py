import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    major: str | None = Field(default=None, min_length=2, max_length=120)
    campus_id: uuid.UUID | str | None = None
    avatar_url: str | None = Field(default=None, max_length=512)
    bio: str | None = Field(default=None, max_length=1000)


class ProfileResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    full_name: str
    major: str
    campus_id: uuid.UUID | None = None
    avatar_url: str | None = None
    bio: str | None = None


class AccountUpdateRequest(BaseModel):
    email: EmailStr | None = None
    student_code: str | None = Field(default=None, min_length=4, max_length=32)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str | None) -> str | None:
        return v.strip().lower() if v is not None else None

    @field_validator("student_code")
    @classmethod
    def normalize_code(cls, v: str | None) -> str | None:
        return v.strip().upper() if v is not None else None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=6, max_length=128)


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class AccountSummaryResponse(BaseModel):
    id: uuid.UUID
    email: str
    student_code: str
    role: str
    status: str
    created_at: datetime
    full_name: str | None = None
    major: str | None = None
    campus_id: uuid.UUID
    campus_code: str | None = None
    campus_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    total_requests: int = 0
    active_requests: int = 0
    paused_requests: int = 0
    matched_requests: int = 0
    total_matches: int = 0
    confirmed_matches: int = 0
    unread_notifications: int = 0


class BulkRequestsActionResponse(BaseModel):
    updated_count: int
    status: str


class AccountDataExportResponse(BaseModel):
    exported_at: datetime
    account: dict[str, Any]
    requests: list[dict[str, Any]]
    notifications: list[dict[str, Any]]
