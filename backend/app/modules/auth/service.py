import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.common.enums import AccountStatus, UserRole
from app.core.config import settings
from app.core.security import create_refresh_token, hash_password, verify_password
from app.core.totp import verify_totp
from app.database.models import AuditLog, Campus, RefreshToken, Student, StudentProfile

MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _as_utc(dt: datetime) -> datetime:
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def resolve_campus(db: Session, campus_ref: uuid.UUID | str) -> Campus | None:
    """Resolve a campus by UUID or code (e.g. 'HL', 'HN', 'DN')."""
    if isinstance(campus_ref, uuid.UUID):
        return db.get(Campus, campus_ref)
    cleaned = str(campus_ref).strip()
    try:
        return db.get(Campus, uuid.UUID(cleaned))
    except ValueError:
        pass
    by_code = db.query(Campus).filter(func.lower(Campus.code) == cleaned.lower()).first()
    if by_code is not None:
        return by_code
    return db.query(Campus).filter(func.lower(Campus.name) == cleaned.lower()).first()


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> Student | None:
        return (
            self.db.query(Student)
            .filter(func.lower(Student.email) == email.strip().lower())
            .first()
        )

    def get_by_identifier(self, identifier: str) -> Student | None:
        """Look up a student by email OR student_code (e.g. 'HE180123')."""
        cleaned = identifier.strip()
        if not cleaned:
            return None
        if "@" in cleaned:
            return self.get_by_email(cleaned)
        by_code = (
            self.db.query(Student)
            .filter(Student.student_code == cleaned.upper())
            .first()
        )
        if by_code is not None:
            return by_code
        return self.get_by_email(cleaned)

    def get_by_id(self, student_id: uuid.UUID) -> Student | None:
        return self.db.get(Student, student_id)

    def register(
        self,
        email: str,
        student_code: str,
        full_name: str,
        major: str,
        campus_id: uuid.UUID | str,
        password: str,
        class_name: str | None = None,
    ) -> Student:
        campus = resolve_campus(self.db, campus_id)
        if campus is None:
            raise ValueError("Campus không tồn tại.")

        if self.get_by_email(email):
            raise ValueError("Email này đã được đăng ký.")

        existing_code = (
            self.db.query(Student)
            .filter(Student.student_code == student_code.upper())
            .first()
        )
        if existing_code:
            raise ValueError("Mã sinh viên này đã được đăng ký.")

        role = (
            UserRole.SUPER_ADMIN
            if email.strip().lower() == settings.ADMIN_EMAIL.lower()
            else UserRole.STUDENT
        )
        student = Student(
            email=email.lower(),
            student_code=student_code.upper(),
            password_hash=hash_password(password),
            role=role,
            status=AccountStatus.ACTIVE,
            campus_id=campus.id,
            consent_accepted_at=_utcnow(),
            consent_version="2026-ND13-v1",
        )
        self.db.add(student)
        self.db.flush()

        profile = StudentProfile(
            student_id=student.id,
            full_name=full_name.strip(),
            major=major.strip(),
            class_name=class_name.strip().upper() if class_name and class_name.strip() else None,
        )
        self.db.add(profile)

        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="AUTH_REGISTER",
                entity_type="student",
                entity_id=student.id,
                details={
                    "email": student.email,
                    "student_code": student.student_code,
                    "campus_code": campus.code,
                },
            )
        )

        self.db.commit()
        self.db.refresh(student)
        return student

    def authenticate(
        self,
        identifier: str,
        password: str,
        totp_code: str | None = None,
        allow_pending_restore: bool = False,
    ) -> Student | None:
        student = self.get_by_identifier(identifier)
        if student is None:
            return None

        now = _utcnow()
        if student.locked_until is not None:
            locked_until = _as_utc(student.locked_until)
            if locked_until > now:
                remaining_min = max(1, int((locked_until - now).total_seconds() // 60) + 1)
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Tài khoản tạm khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau {remaining_min} phút.",
                )
            student.locked_until = None
            student.failed_login_attempts = 0

        if not verify_password(password, student.password_hash):
            student.failed_login_attempts = int(student.failed_login_attempts) + 1
            if student.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                student.locked_until = now + timedelta(minutes=LOCKOUT_MINUTES)
                self.db.add(
                    AuditLog(
                        actor_id=student.id,
                        action="AUTH_LOCKOUT",
                        entity_type="student",
                        entity_id=student.id,
                        details={"attempts": student.failed_login_attempts},
                    )
                )
                self.db.commit()
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Bạn đã nhập sai mật khẩu {MAX_FAILED_ATTEMPTS} lần liên tiếp. Tài khoản bị tạm khóa {LOCKOUT_MINUTES} phút.",
                )
            self.db.commit()
            return None

        if student.status == AccountStatus.CLOSED and not allow_pending_restore:
            if student.scheduled_purge_at is not None and _as_utc(student.scheduled_purge_at) > now:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản đang trong thời gian chờ xóa (14 ngày). Bạn có thể chọn khôi phục tài khoản.",
                    headers={"X-Account-Pending-Delete": "true"},
                )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa hoặc đóng.",
            )

        if student.status == AccountStatus.SUSPENDED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Tài khoản đã bị khóa.",
            )

        if student.totp_enabled and student.totp_secret:
            if not totp_code or not totp_code.strip():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Tài khoản quản trị yêu cầu mã xác thực 2FA (6 chữ số).",
                    headers={"X-2FA-Required": "true"},
                )
            if not verify_totp(student.totp_secret, totp_code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Mã xác thực 2FA không chính xác.",
                )

        student.failed_login_attempts = 0
        student.locked_until = None

        if student.email.lower() == settings.ADMIN_EMAIL.lower() and student.role != UserRole.SUPER_ADMIN:
            student.role = UserRole.SUPER_ADMIN

        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="AUTH_LOGIN",
                entity_type="student",
                entity_id=student.id,
                details={"email": student.email},
            )
        )
        self.db.commit()
        self.db.refresh(student)
        return student

    def issue_refresh_token(self, student: Student) -> str:
        jti = uuid.uuid4().hex
        expires_at = _utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        self.db.add(
            RefreshToken(
                student_id=student.id,
                token_jti=jti,
                expires_at=expires_at,
            )
        )
        self.db.commit()
        return create_refresh_token(
            str(student.id),
            jti=jti,
            token_version=int(student.token_version),
        )

    def revoke_all_tokens(self, student: Student) -> None:
        now = _utcnow()
        student.token_version = int(student.token_version) + 1
        self.db.query(RefreshToken).filter(
            RefreshToken.student_id == student.id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)
        self.db.commit()

    def rotate_refresh_token(self, student: Student, jti: str | None) -> str:
        now = _utcnow()
        if jti:
            record = (
                self.db.query(RefreshToken)
                .filter(RefreshToken.token_jti == jti)
                .first()
            )
            if record is None or record.student_id != student.id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token không hợp lệ.",
                )
            if record.revoked_at is not None:
                # Reuse detected -> revoke all active sessions of this student
                self.revoke_all_tokens(student)
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token đã bị thu hồi.",
                )
            if _as_utc(record.expires_at) <= now:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Refresh token đã hết hạn.",
                )
            record.revoked_at = now
        return self.issue_refresh_token(student)
