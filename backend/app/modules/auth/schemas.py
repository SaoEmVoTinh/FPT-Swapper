import uuid

from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    student_code: str = Field(min_length=4, max_length=32)
    full_name: str = Field(min_length=2, max_length=120)
    major: str = Field(min_length=2, max_length=120)
    class_name: str | None = Field(default=None, max_length=32)
    campus_id: uuid.UUID | str
    password: str = Field(min_length=8, max_length=128)
    agree_privacy_terms: bool = True

    @field_validator("agree_privacy_terms")
    @classmethod
    def must_agree_privacy_terms(cls, v: bool) -> bool:
        if not v:
            raise ValueError(
                "Bạn cần đồng ý với Chính sách Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP) và Điều khoản sử dụng."
            )
        return v

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("student_code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("class_name")
    @classmethod
    def normalize_class_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        cleaned = v.strip().upper()
        if not cleaned:
            return None
        if len(cleaned) < 2:
            raise ValueError("Tên lớp phải có ít nhất 2 ký tự.")
        return cleaned


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
    class_name: str | None = None
    campus_id: uuid.UUID
    campus_code: str | None = None
    campus_name: str | None = None
    avatar_url: str | None = None
    bio: str | None = None
    totp_enabled: bool = False
    share_contact_after_match: bool = False
    notify_email: bool = True
    notify_push: bool = True
    trust_score: float = 5.0
    completed_swaps_count: int = 0
    no_show_count: int = 0


class TokenResponse(BaseModel):
    token_type: str = "bearer"
    access_token: str
    expires_in: int  # seconds
    user: StudentPublicResponse | None = None
