import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_admin, get_current_student
from app.database.session import get_db
from app.modules.academic.schemas import (
    CampusCreate,
    CampusResponse,
    CampusUpdate,
    ClassCreate,
    ClassResponse,
    ClassUpdate,
    CourseCreate,
    CourseResponse,
    CourseUpdate,
    EnsureClassesRequest,
    ScheduleCreate,
    ScheduleResponse,
    SemesterCreate,
    SemesterResponse,
    SemesterUpdate,
)
from app.modules.academic.service import (
    CampusService,
    ClassService,
    CourseService,
    SemesterService,
    ensure_default_classes,
)

router = APIRouter(prefix="/academic", tags=["Academic"])


# ══════════════════ Campuses ══════════════════

@router.get("/campuses", response_model=list[CampusResponse])
def list_campuses(db: Session = Depends(get_db)):
    return CampusService.list(db)


@router.get("/campuses/{campus_id}", response_model=CampusResponse)
def get_campus(campus_id: uuid.UUID, db: Session = Depends(get_db)):
    campus = CampusService.get(db, campus_id)
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return campus


@router.post(
    "/campuses",
    response_model=CampusResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def create_campus(data: CampusCreate, db: Session = Depends(get_db)):
    return CampusService.create(db, data)


@router.put(
    "/campuses/{campus_id}",
    response_model=CampusResponse,
    dependencies=[Depends(get_current_admin)],
)
def update_campus(campus_id: uuid.UUID, data: CampusUpdate, db: Session = Depends(get_db)):
    campus = CampusService.get(db, campus_id)
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return CampusService.update(db, campus, data)


@router.delete(
    "/campuses/{campus_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
def delete_campus(campus_id: uuid.UUID, db: Session = Depends(get_db)):
    campus = CampusService.get(db, campus_id)
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    CampusService.delete(db, campus)


# ══════════════════ Semesters ══════════════════

@router.get("/semesters", response_model=list[SemesterResponse])
def list_semesters(db: Session = Depends(get_db)):
    return SemesterService.list(db)


@router.get("/semesters/active", response_model=SemesterResponse)
def get_active_semester(db: Session = Depends(get_db)):
    semester = SemesterService.get_active(db)
    if not semester:
        raise HTTPException(status_code=404, detail="No active semester")
    return semester


@router.get("/semesters/{semester_id}", response_model=SemesterResponse)
def get_semester(semester_id: uuid.UUID, db: Session = Depends(get_db)):
    semester = SemesterService.get(db, semester_id)
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return semester


@router.post(
    "/semesters",
    response_model=SemesterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def create_semester(data: SemesterCreate, db: Session = Depends(get_db)):
    return SemesterService.create(db, data)


@router.put(
    "/semesters/{semester_id}",
    response_model=SemesterResponse,
    dependencies=[Depends(get_current_admin)],
)
def update_semester(semester_id: uuid.UUID, data: SemesterUpdate, db: Session = Depends(get_db)):
    semester = SemesterService.get(db, semester_id)
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    return SemesterService.update(db, semester, data)


@router.delete(
    "/semesters/{semester_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
def delete_semester(semester_id: uuid.UUID, db: Session = Depends(get_db)):
    semester = SemesterService.get(db, semester_id)
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    SemesterService.delete(db, semester)


# ══════════════════ Courses ══════════════════

@router.get("/courses", response_model=list[CourseResponse])
def list_courses(db: Session = Depends(get_db)):
    return CourseService.list(db)


@router.get("/courses/{course_id}", response_model=CourseResponse)
def get_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = CourseService.get(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course


@router.post(
    "/courses",
    response_model=CourseResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def create_course(data: CourseCreate, db: Session = Depends(get_db)):
    return CourseService.create(db, data)


@router.put(
    "/courses/{course_id}",
    response_model=CourseResponse,
    dependencies=[Depends(get_current_admin)],
)
def update_course(course_id: uuid.UUID, data: CourseUpdate, db: Session = Depends(get_db)):
    course = CourseService.get(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseService.update(db, course, data)


@router.delete(
    "/courses/{course_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
def delete_course(course_id: uuid.UUID, db: Session = Depends(get_db)):
    course = CourseService.get(db, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    CourseService.delete(db, course)


# ══════════════════ Classes ══════════════════

@router.get("/classes", response_model=list[ClassResponse])
def list_classes(
    semester_id: uuid.UUID | None = Query(None),
    course_id: uuid.UUID | None = Query(None),
    campus_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
):
    return ClassService.list(db, semester_id=semester_id, course_id=course_id, campus_id=campus_id)


@router.post(
    "/classes/ensure",
    response_model=list[ClassResponse],
    dependencies=[Depends(get_current_student)],
)
def ensure_classes(data: EnsureClassesRequest, db: Session = Depends(get_db)):
    """List classes for a course/semester/campus, auto-provisioning default timetable slots."""
    course = CourseService.get(db, data.course_id)
    semester = SemesterService.get(db, data.semester_id)
    campus = CampusService.get(db, data.campus_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if not semester:
        raise HTTPException(status_code=404, detail="Semester not found")
    if not campus:
        raise HTTPException(status_code=404, detail="Campus not found")
    return ensure_default_classes(db, course, semester, campus)


@router.get("/classes/{class_id}", response_model=ClassResponse)
def get_class(class_id: uuid.UUID, db: Session = Depends(get_db)):
    cls = ClassService.get(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls


@router.get("/classes/{class_id}/schedules", response_model=list[ScheduleResponse])
def get_class_schedules(class_id: uuid.UUID, db: Session = Depends(get_db)):
    cls = ClassService.get(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return cls.schedules


@router.post(
    "/classes",
    response_model=ClassResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def create_class(data: ClassCreate, db: Session = Depends(get_db)):
    return ClassService.create(db, data)


@router.put(
    "/classes/{class_id}",
    response_model=ClassResponse,
    dependencies=[Depends(get_current_admin)],
)
def update_class(class_id: uuid.UUID, data: ClassUpdate, db: Session = Depends(get_db)):
    cls = ClassService.get(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return ClassService.update(db, cls, data)


@router.delete(
    "/classes/{class_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_admin)],
)
def delete_class(class_id: uuid.UUID, db: Session = Depends(get_db)):
    cls = ClassService.get(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    ClassService.delete(db, cls)


@router.post(
    "/classes/{class_id}/schedules",
    response_model=ScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(get_current_admin)],
)
def add_schedule(class_id: uuid.UUID, data: ScheduleCreate, db: Session = Depends(get_db)):
    cls = ClassService.get(db, class_id)
    if not cls:
        raise HTTPException(status_code=404, detail="Class not found")
    return ClassService.add_schedule(db, cls, data)
