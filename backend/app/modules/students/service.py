import uuid

from sqlalchemy.orm import Session

from app.database.models import Student, StudentProfile
from app.modules.auth.service import resolve_campus


class StudentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_profile(self, student_id: uuid.UUID) -> StudentProfile | None:
        return (
            self.db.query(StudentProfile)
            .filter(StudentProfile.student_id == student_id)
            .first()
        )

    def update_profile(
        self,
        student_id: uuid.UUID,
        full_name: str | None,
        major: str | None,
        avatar_url: str | None,
        bio: str | None,
        campus_id: uuid.UUID | str | None = None,
    ) -> StudentProfile:
        profile = self.get_profile(student_id)
        if profile is None:
            raise ValueError("Profile not found.")
        if full_name is not None:
            profile.full_name = full_name
        if major is not None:
            profile.major = major
        if avatar_url is not None:
            profile.avatar_url = avatar_url
        if bio is not None:
            profile.bio = bio
        if campus_id is not None:
            campus = resolve_campus(self.db, campus_id)
            if campus is None:
                raise ValueError("Campus không tồn tại.")
            student = self.db.get(Student, student_id)
            if student is not None:
                student.campus_id = campus.id
        self.db.commit()
        self.db.refresh(profile)
        return profile
