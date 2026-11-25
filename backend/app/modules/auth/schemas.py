import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    student_code: str = Field(min_length=4, max_length=32)
    full_name: str = Field(min_length=2, max_length=120)
    major: str = Field(min_length=2, max_length=120)
    campus_id: uuid.UUID | str
    password: str = Field(min_length=6, max_length=128)

    @field_validator("email")
    @classmethod
    def fpt_email_only(cls, v: str) -> str:
        if not v.lower().endswith(("@fpt.edu.vn", "@fe.edu.vn")):
            raise ValueError("Chỉ chấp nhận email FPT (@fpt.edu.vn hoặc @fe.edu.vn).")
        return v.lower()

    @field_validator("student_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()


class LoginRequest(BaseModel):
    email: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=1, max_length=128)


class StudentPublicResponse(BaseModel):
    id: uuid.UUID
    email: str
    student_code: str
    role: str
    status: str
    full_name: str | None = None
    major: str | None = None
    campus_id: uuid.UUID
    campus_code: str | None = None
    campus_name: str | None = None
    avatar_url: str | None = None


class TokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    expires_in: int  # seconds
    user: StudentPublicResponse | None = None
