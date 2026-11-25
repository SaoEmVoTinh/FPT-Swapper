import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    student_code: str = Field(min_length=4, max_length=32)
    full_name: str = Field(min_length=2, max_length=120)
    major: str = Field(min_length=2, max_length=120)
    campus_id: uuid.UUID | str
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("student_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()


class LoginRequest(BaseModel):
    email: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    totp_code: str | None = Field(default=None, max_length=12)


class RestoreAccountRequest(BaseModel):
    email: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=1, max_length=128)
    totp_code: str | None = Field(default=None, max_length=12)


class TwoFactorStatusResponse(BaseModel):
    totp_enabled: bool


class TwoFactorSetupResponse(BaseModel):
    secret: str
    otpauth_uri: str


class TwoFactorCodeRequest(BaseModel):
    code: str = Field(min_length=6, max_length=12)


class TwoFactorDisableRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    code: str = Field(min_length=6, max_length=12)


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
    bio: str | None = None
    totp_enabled: bool = False


class TokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    expires_in: int  # seconds
    user: StudentPublicResponse | None = None
