import uuid
from datetime import date

from pydantic import BaseModel, ConfigDict


# ───────────────────────── Campus ─────────────────────────

class CampusBase(BaseModel):
    code: str
    name: str


class CampusCreate(CampusBase):
    pass


class CampusUpdate(BaseModel):
    code: str | None = None
    name: str | None = None


class CampusResponse(CampusBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


# ───────────────────────── Semester ─────────────────────────

class SemesterBase(BaseModel):
    code: str
    name: str
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool = False


class SemesterCreate(SemesterBase):
    pass


class SemesterUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class SemesterResponse(SemesterBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


# ───────────────────────── Course ─────────────────────────

class CourseBase(BaseModel):
    code: str
    name: str
    credits: int = 3


class CourseCreate(CourseBase):
    pass


class CourseUpdate(BaseModel):
    code: str | None = None
    name: str | None = None
    credits: int | None = None


class CourseResponse(CourseBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID


# ───────────────────────── Schedule ─────────────────────────

class ScheduleBase(BaseModel):
    day_of_week: str
    slot: str
    room: str | None = None


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleResponse(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    class_id: uuid.UUID


# ───────────────────────── AcademicClass ─────────────────────────

class ClassBase(BaseModel):
    code: str
    course_id: uuid.UUID
    semester_id: uuid.UUID
    campus_id: uuid.UUID
    lecturer: str | None = None
    is_swappable: bool = True


class ClassCreate(ClassBase):
    schedules: list[ScheduleCreate] = []


class ClassUpdate(BaseModel):
    code: str | None = None
    lecturer: str | None = None
    is_swappable: bool | None = None


class ClassResponse(ClassBase):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    schedules: list[ScheduleResponse] = []
