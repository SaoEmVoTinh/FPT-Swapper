import uuid

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.core.config import settings
from app.core.security import decode_token
from app.database.models import Student
from app.database.session import get_db


def _get_student_or_401(token: str, db: Session) -> Student:
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("wrong token type")
        student_id: str = payload.get("sub", "")
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    student = db.get(Student, uuid.UUID(student_id))
    if student is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student not found.")
    if "tv" in payload and int(payload["tv"]) != int(student.token_version):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Phiên đăng nhập đã bị thu hồi.",
        )
    if student.status.value != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is not active.")
    return student


def get_current_student(
    access_token: str | None = Cookie(default=None, alias="access_token"),
    db: Session = Depends(get_db),
) -> Student:
    if not access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated.")
    return _get_student_or_401(access_token, db)


def _is_primary_super_admin(student: Student) -> bool:
    return student.email.lower() == settings.ADMIN_EMAIL.lower()


def get_current_staff(
    student: Student = Depends(get_current_student),
) -> Student:
    """Allow SUPER_ADMIN, ADMIN, and MODERATOR staff accounts."""
    if _is_primary_super_admin(student) or student.role in (
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
        UserRole.MODERATOR,
    ):
        return student
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Yêu cầu quyền quản trị viên hoặc điều phối viên.",
    )


def get_current_admin(
    student: Student = Depends(get_current_student),
) -> Student:
    if _is_primary_super_admin(student) or student.role in (
        UserRole.SUPER_ADMIN,
        UserRole.ADMIN,
    ):
        return student
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")


def get_current_super_admin(
    student: Student = Depends(get_current_student),
) -> Student:
    if _is_primary_super_admin(student) or student.role == UserRole.SUPER_ADMIN:
        return student
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Yêu cầu quyền Super Admin.",
    )
