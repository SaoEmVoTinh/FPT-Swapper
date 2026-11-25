import uuid

from sqlalchemy.orm import Session

from app.common.enums import AccountStatus, UserRole
from app.core.security import hash_password, verify_password
from app.database.models import Campus, Student, StudentProfile


class AuthService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_email(self, email: str) -> Student | None:
        return (
            self.db.query(Student)
            .filter(Student.email == email.lower())
            .first()
        )

    def get_by_id(self, student_id: uuid.UUID) -> Student | None:
        return self.db.get(Student, student_id)

    def register(
        self,
        email: str,
        student_code: str,
        full_name: str,
        major: str,
        campus_id: uuid.UUID,
        password: str,
    ) -> Student:
        campus = self.db.get(Campus, campus_id)
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
            campus_id=campus_id,
        )
        self.db.add(student)
        self.db.flush()

        profile = StudentProfile(
            student_id=student.id,
            full_name=full_name,
            major=major,
        )
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(student)
        return student

    def authenticate(self, email: str, password: str) -> Student | None:
        student = self.get_by_email(email)
        if student is None:
            return None
        if not verify_password(password, student.password_hash):
            return None
        return student
