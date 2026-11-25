import uuid

from sqlalchemy import Enum as SAEnum, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.enums import AccountStatus, UserRole
from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Student(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "students"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    student_code: Mapped[str] = mapped_column(String(32), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role"),
        default=UserRole.STUDENT,
        nullable=False,
    )
    status: Mapped[AccountStatus] = mapped_column(
        SAEnum(AccountStatus, name="account_status"),
        default=AccountStatus.ACTIVE,
        nullable=False,
    )
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("campuses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    profile: Mapped["StudentProfile | None"] = relationship(
        back_populates="student",
        uselist=False,
        cascade="all, delete-orphan",
    )


class StudentProfile(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "student_profiles"

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    major: Mapped[str] = mapped_column(String(120), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    student: Mapped["Student"] = relationship(back_populates="profile")

