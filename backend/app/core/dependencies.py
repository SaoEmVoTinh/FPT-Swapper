import uuid

from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError
from sqlalchemy.orm import Session

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


def get_current_admin(
    student: Student = Depends(get_current_student),
) -> Student:
    is_super_admin = student.email.lower() == settings.ADMIN_EMAIL.lower()
    if not is_super_admin and student.role.value not in ("ADMIN", "MODERATOR"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")
    return student


def get_current_super_admin(
    student: Student = Depends(get_current_student),
) -> Student:
    if student.email.lower() != settings.ADMIN_EMAIL.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ tài khoản quản trị được chỉ định mới có quyền truy cập.",
        )
    return student
