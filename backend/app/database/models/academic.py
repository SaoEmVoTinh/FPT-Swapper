import uuid
from datetime import date

from sqlalchemy import (
    Boolean,
    Date,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.enums import EnrollmentStatus
from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Campus(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "campuses"

    code: Mapped[str] = mapped_column(String(16), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)


class Semester(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "semesters"

    code: Mapped[str] = mapped_column(String(24), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class Course(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "courses"

    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    credits: Mapped[int] = mapped_column(Integer, default=3, nullable=False)


class AcademicClass(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint("code", "semester_id", "campus_id", name="uq_classes_code_sem_campus"),
    )

    code: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    campus_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("campuses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    lecturer: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_swappable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    schedules: Mapped[list["ClassSchedule"]] = relationship(
        back_populates="academic_class",
        cascade="all, delete-orphan",
    )


class ClassSchedule(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "class_schedules"

    class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    day_of_week: Mapped[str] = mapped_column(String(40), nullable=False)
    slot: Mapped[str] = mapped_column(String(64), nullable=False)
    room: Mapped[str | None] = mapped_column(String(32), nullable=True)

    academic_class: Mapped["AcademicClass"] = relationship(back_populates="schedules")


class StudentEnrollment(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "student_enrollments"
    __table_args__ = (
        UniqueConstraint("student_id", "class_id", name="uq_student_enrollments_student_class"),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[EnrollmentStatus] = mapped_column(
        SAEnum(EnrollmentStatus, name="enrollment_status"),
        default=EnrollmentStatus.ENROLLED,
        nullable=False,
    )

