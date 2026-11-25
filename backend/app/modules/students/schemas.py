import uuid

from pydantic import BaseModel, Field


class ProfileUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    major: str | None = Field(default=None, min_length=2, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=512)
    bio: str | None = Field(default=None, max_length=1000)


class ProfileResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    full_name: str
    major: str
    avatar_url: str | None = None
    bio: str | None = None
