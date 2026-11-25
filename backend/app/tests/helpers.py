"""
Shared test helpers for FPT ClassSwap tests.
"""
import uuid

from sqlalchemy.orm import Session

from app.common.enums import UserRole
from app.core.security import create_access_token, hash_password
from app.database.models.identity import Student

# Fixed campus ID used by test_auth.py seed
CAMPUS_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def make_student(
    db: Session,
    email: str,
    role: UserRole = UserRole.STUDENT,
    campus_id: uuid.UUID = CAMPUS_ID,
    student_code: str | None = None,
) -> tuple[Student, str]:
    """Create a Student and return (student, access_token)."""
    code = student_code or f"SE{uuid.uuid4().hex[:6].upper()}"
    s = Student(
        id=uuid.uuid4(),
        email=email,
        student_code=code,
        campus_id=campus_id,
        password_hash=hash_password("Pass@12345"),
        role=role,
    )
    db.add(s)
    db.commit()
    db.refresh(s)
    token = create_access_token(str(s.id))
    return s, token


def auth_headers(token: str) -> dict[str, str]:
    """Return headers dict with HttpOnly-style cookie for test clients."""
    return {"Cookie": f"access_token={token}"}
