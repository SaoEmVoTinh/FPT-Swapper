import uuid

from sqlalchemy.orm import Session

from app.common.enums import AccountStatus, UserRole
from app.core.security import hash_password, verify_password
from app.database.models import AuditLog, Campus, Student, StudentProfile

_DEMO_CAMPUS_MAP: dict[str, str] = {
    "campus-hl": "HN",
    "campus-hn": "HN",
    "hl": "HN",
    "campus-hcm": "HCM",
    "campus-dn": "DN",
    "campus-qn": "QN",
    "campus-ct": "CT",
}


def resolve_campus(db: Session, campus_ref: uuid.UUID | str) -> Campus | None:
    if isinstance(campus_ref, uuid.UUID):
        return db.get(Campus, campus_ref)

    raw = str(campus_ref).strip()
    try:
        as_uuid = uuid.UUID(raw)
        found = db.get(Campus, as_uuid)
        if found is not None:
            return found
    except ValueError:
        pass

    mapped_code = _DEMO_CAMPUS_MAP.get(raw.lower(), raw.upper())
    campus = db.query(Campus).filter(Campus.code == mapped_code).first()
    if campus is None and mapped_code == "HN":
        campus = db.query(Campus).filter(Campus.code == "HL").first()
    return campus


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> Student | None:
        return (
            self.db.query(Student)
            .filter(Student.email == email.strip().lower())
            .first()
        )

    def get_by_identifier(self, identifier: str) -> Student | None:
        cleaned = identifier.strip()
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

        student = Student(
            email=email.lower(),
            student_code=student_code.upper(),
            password_hash=hash_password(password),
            role=UserRole.STUDENT,
            status=AccountStatus.ACTIVE,
            campus_id=campus.id,
        )
        self.db.add(student)
        self.db.flush()

        profile = StudentProfile(
            student_id=student.id,
            full_name=full_name.strip(),
            major=major.strip(),
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

    def authenticate(self, identifier: str, password: str) -> Student | None:
        student = self.get_by_identifier(identifier)
        if student is None:
            return None
        if not verify_password(password, student.password_hash):
            return None

        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="AUTH_LOGIN",
                entity_type="student",
                entity_id=student.id,
                details={
                    "email": student.email,
                    "student_code": student.student_code,
                },
            )
        )
        self.db.commit()
        self.db.refresh(student)
        return student
