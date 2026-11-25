import uuid

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models.academic import (
    AcademicClass,
    Campus,
    ClassSchedule,
    Course,
    Semester,
)
from app.modules.academic.schemas import (
    CampusCreate,
    CampusUpdate,
    ClassCreate,
    ClassUpdate,
    CourseCreate,
    CourseUpdate,
    ScheduleCreate,
    SemesterCreate,
    SemesterUpdate,
)


# ───────────────────────── Campus ─────────────────────────

class CampusService:
    @staticmethod
    def list(db: Session) -> list[Campus]:
        return db.query(Campus).order_by(Campus.code).all()

    @staticmethod
    def get(db: Session, campus_id: uuid.UUID) -> Campus | None:
        return db.get(Campus, campus_id)

    @staticmethod
    def create(db: Session, data: CampusCreate) -> Campus:
        campus = Campus(**data.model_dump())
        db.add(campus)
        db.commit()
        db.refresh(campus)
        return campus

    @staticmethod
    def update(db: Session, campus: Campus, data: CampusUpdate) -> Campus:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(campus, field, value)
        db.commit()
        db.refresh(campus)
        return campus

    @staticmethod
    def delete(db: Session, campus: Campus) -> None:
        db.delete(campus)
        db.commit()


# ───────────────────────── Semester ─────────────────────────

class SemesterService:
    @staticmethod
    def list(db: Session) -> list[Semester]:
        return db.query(Semester).order_by(Semester.code).all()

    @staticmethod
    def get(db: Session, semester_id: uuid.UUID) -> Semester | None:
        return db.get(Semester, semester_id)

    @staticmethod
    def get_active(db: Session) -> Semester | None:
        return db.query(Semester).filter(Semester.is_active.is_(True)).first()

    @staticmethod
    def create(db: Session, data: SemesterCreate) -> Semester:
        semester = Semester(**data.model_dump())
        db.add(semester)
        db.commit()
        db.refresh(semester)
        return semester

    @staticmethod
    def update(db: Session, semester: Semester, data: SemesterUpdate) -> Semester:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(semester, field, value)
        db.commit()
        db.refresh(semester)
        return semester

    @staticmethod
    def delete(db: Session, semester: Semester) -> None:
        db.delete(semester)
        db.commit()


# ───────────────────────── Course ─────────────────────────

class CourseService:
    @staticmethod
    def list(db: Session) -> list[Course]:
        return db.query(Course).order_by(Course.code).all()

    @staticmethod
    def get(db: Session, course_id: uuid.UUID) -> Course | None:
        return db.get(Course, course_id)

    @staticmethod
    def create(db: Session, data: CourseCreate) -> Course:
        course = Course(**data.model_dump())
        db.add(course)
        db.commit()
        db.refresh(course)
        return course

    @staticmethod
    def update(db: Session, course: Course, data: CourseUpdate) -> Course:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(course, field, value)
        db.commit()
        db.refresh(course)
        return course

    @staticmethod
    def delete(db: Session, course: Course) -> None:
        try:
            db.delete(course)
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Không thể xóa môn học vì đang có lớp học hoặc yêu cầu đổi lớp tham chiếu.",
            )


# ───────────────────────── AcademicClass ─────────────────────────

class ClassService:
    @staticmethod
    def list(
        db: Session,
        semester_id: uuid.UUID | None = None,
        course_id: uuid.UUID | None = None,
        campus_id: uuid.UUID | None = None,
    ) -> list[AcademicClass]:
        q = db.query(AcademicClass)
        if semester_id:
            q = q.filter(AcademicClass.semester_id == semester_id)
        if course_id:
            q = q.filter(AcademicClass.course_id == course_id)
        if campus_id:
            q = q.filter(AcademicClass.campus_id == campus_id)
        return q.order_by(AcademicClass.code).all()

    @staticmethod
    def get(db: Session, class_id: uuid.UUID) -> AcademicClass | None:
        return db.get(AcademicClass, class_id)

    @staticmethod
    def create(db: Session, data: ClassCreate) -> AcademicClass:
        schedules_data = data.schedules
        payload = data.model_dump(exclude={"schedules"})
        academic_class = AcademicClass(**payload)
        db.add(academic_class)
        db.flush()
        for s in schedules_data:
            db.add(ClassSchedule(class_id=academic_class.id, **s.model_dump()))
        db.commit()
        db.refresh(academic_class)
        return academic_class

    @staticmethod
    def update(db: Session, academic_class: AcademicClass, data: ClassUpdate) -> AcademicClass:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(academic_class, field, value)
        db.commit()
        db.refresh(academic_class)
        return academic_class

    @staticmethod
    def delete(db: Session, academic_class: AcademicClass) -> None:
        db.delete(academic_class)
        db.commit()

    @staticmethod
    def add_schedule(db: Session, academic_class: AcademicClass, data: ScheduleCreate) -> ClassSchedule:
        schedule = ClassSchedule(class_id=academic_class.id, **data.model_dump())
        db.add(schedule)
        db.commit()
        db.refresh(schedule)
        return schedule


# Default timetable slots used when a course has no classes yet for a campus/semester.
# Regular courses: 2h15m per slot with 15m breaks in morning/afternoon.
DEFAULT_CLASS_SLOTS: list[tuple[str, str, str]] = [
    ("01", "Thứ 2 & Thứ 4", "Slot 1 (07:00 - 09:15)"),
    ("02", "Thứ 2 & Thứ 4", "Slot 2 (09:30 - 11:45)"),
    ("03", "Thứ 3 & Thứ 5", "Slot 3 (12:30 - 14:45)"),
    ("04", "Thứ 3 & Thứ 5", "Slot 4 (15:00 - 17:15)"),
]

# Vovinam (VOV*) courses: 1h30m per slot, 15m apart (07:00-12:00 & 12:30-17:30).
DEFAULT_VOVINAM_SLOTS: list[tuple[str, str, str]] = [
    ("01", "Thứ 2 & Thứ 4", "Slot 1 (07:00 - 08:30)"),
    ("02", "Thứ 2 & Thứ 4", "Slot 2 (08:45 - 10:15)"),
    ("03", "Thứ 2 & Thứ 4", "Slot 3 (10:30 - 12:00)"),
    ("04", "Thứ 3 & Thứ 5", "Slot 4 (12:30 - 14:00)"),
    ("05", "Thứ 3 & Thứ 5", "Slot 5 (14:15 - 15:45)"),
    ("06", "Thứ 3 & Thứ 5", "Slot 6 (16:00 - 17:30)"),
]


def is_vovinam_course_code(course_code: str | None) -> bool:
    return bool(course_code and course_code.strip().upper().startswith("VOV"))


def default_slots_for_course(course_code: str | None) -> list[tuple[str, str, str]]:
    if is_vovinam_course_code(course_code):
        return DEFAULT_VOVINAM_SLOTS
    return DEFAULT_CLASS_SLOTS


def ensure_default_classes(
    db: Session,
    course: Course,
    semester: Semester,
    campus: Campus,
) -> list[AcademicClass]:
    """Return the classes of a course/semester/campus, provisioning default ones if missing."""

    def _list() -> list[AcademicClass]:
        return ClassService.list(
            db,
            semester_id=semester.id,
            course_id=course.id,
            campus_id=campus.id,
        )

    existing = _list()
    if len(existing) >= 2:
        return existing

    slot_templates = default_slots_for_course(course.code)
    existing_codes = {c.code for c in existing}
    try:
        for suffix, day, slot in slot_templates:
            code = f"{course.code}_{campus.code}_{suffix}"
            if code in existing_codes:
                continue
            cls = AcademicClass(
                code=code,
                course_id=course.id,
                semester_id=semester.id,
                campus_id=campus.id,
                is_swappable=True,
            )
            db.add(cls)
            db.flush()
            db.add(ClassSchedule(class_id=cls.id, day_of_week=day, slot=slot))
        db.commit()
    except IntegrityError:
        # Another request provisioned the same classes concurrently.
        db.rollback()
    return _list()
