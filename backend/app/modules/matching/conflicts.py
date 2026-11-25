import re
import uuid

from sqlalchemy.orm import Session

from app.common.enums import EnrollmentStatus, SwapRequestStatus
from app.database.models.academic import AcademicClass, Course, Semester, StudentEnrollment
from app.database.models.matching import MatchingRequest

_DAY_PATTERNS: list[tuple[str, str, str]] = [
    ("t2", "T2", "Thứ 2"),
    ("thứ 2", "T2", "Thứ 2"),
    ("thu 2", "T2", "Thứ 2"),
    ("mon", "T2", "Thứ 2"),
    ("t3", "T3", "Thứ 3"),
    ("thứ 3", "T3", "Thứ 3"),
    ("thu 3", "T3", "Thứ 3"),
    ("tue", "T3", "Thứ 3"),
    ("t4", "T4", "Thứ 4"),
    ("thứ 4", "T4", "Thứ 4"),
    ("thu 4", "T4", "Thứ 4"),
    ("wed", "T4", "Thứ 4"),
    ("t5", "T5", "Thứ 5"),
    ("thứ 5", "T5", "Thứ 5"),
    ("thu 5", "T5", "Thứ 5"),
    ("thu", "T5", "Thứ 5"),
    ("t6", "T6", "Thứ 6"),
    ("thứ 6", "T6", "Thứ 6"),
    ("thu 6", "T6", "Thứ 6"),
    ("fri", "T6", "Thứ 6"),
    ("t7", "T7", "Thứ 7"),
    ("thứ 7", "T7", "Thứ 7"),
    ("thu 7", "T7", "Thứ 7"),
    ("sat", "T7", "Thứ 7"),
]

_DAY_LABEL = {
    "T2": "Thứ 2",
    "T3": "Thứ 3",
    "T4": "Thứ 4",
    "T5": "Thứ 5",
    "T6": "Thứ 6",
    "T7": "Thứ 7",
}


def extract_days(day_of_week: str) -> list[str]:
    lowered = day_of_week.lower()
    found: list[str] = []
    # Check specific multi-word patterns first to avoid 'thu' matching 'thu 2'
    ordered = sorted(_DAY_PATTERNS, key=lambda x: len(x[0]), reverse=True)
    cleaned = lowered
    for token, key, _ in ordered:
        if re.search(rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", cleaned):
            if key not in found:
                found.append(key)
            cleaned = re.sub(
                rf"(?<![a-z0-9]){re.escape(token)}(?![a-z0-9])", " ", cleaned
            )
    return found or [day_of_week.strip()]


_REGULAR_SLOT_RANGES: dict[str, tuple[int, int, str]] = {
    "SLOT_1": (7 * 60, 9 * 60 + 15, "Slot 1 (07:00 - 09:15)"),
    "SLOT_2": (9 * 60 + 30, 11 * 60 + 45, "Slot 2 (09:30 - 11:45)"),
    "SLOT_3": (12 * 60 + 30, 14 * 60 + 45, "Slot 3 (12:30 - 14:45)"),
    "SLOT_4": (15 * 60, 17 * 60 + 15, "Slot 4 (15:00 - 17:15)"),
    "SLOT_5": (17 * 60 + 30, 19 * 60 + 45, "Slot 5 (17:30 - 19:45)"),
}

_VOVINAM_SLOT_RANGES: dict[str, tuple[int, int, str]] = {
    "SLOT_1": (7 * 60, 8 * 60 + 30, "Slot 1 (07:00 - 08:30)"),
    "SLOT_2": (8 * 60 + 45, 10 * 60 + 15, "Slot 2 (08:45 - 10:15)"),
    "SLOT_3": (10 * 60 + 30, 12 * 60, "Slot 3 (10:30 - 12:00)"),
    "SLOT_4": (12 * 60 + 30, 14 * 60, "Slot 4 (12:30 - 14:00)"),
    "SLOT_5": (14 * 60 + 15, 15 * 60 + 45, "Slot 5 (14:15 - 15:45)"),
    "SLOT_6": (16 * 60, 17 * 60 + 30, "Slot 6 (16:00 - 17:30)"),
}


def _is_vovinam_class(db: Session, cls: AcademicClass) -> bool:
    course = db.get(Course, cls.course_id)
    return bool(course and course.code.strip().upper().startswith("VOV"))


def _parse_time_range(slot: str, slot_key: str, is_vovinam: bool) -> tuple[int, int] | None:
    m = re.search(
        r"(\d{1,2})\s*[:h]\s*(\d{2})\s*[-–đến]+\s*(\d{1,2})\s*[:h]\s*(\d{2})",
        slot,
        re.IGNORECASE,
    )
    if m:
        start_min = int(m.group(1)) * 60 + int(m.group(2))
        end_min = int(m.group(3)) * 60 + int(m.group(4))
        if end_min > start_min:
            return start_min, end_min

    table = _VOVINAM_SLOT_RANGES if is_vovinam else _REGULAR_SLOT_RANGES
    entry = table.get(slot_key)
    if entry is not None:
        return entry[0], entry[1]
    return None


def _ranges_overlap(r1: tuple[int, int] | None, r2: tuple[int, int] | None) -> bool:
    if r1 is None or r2 is None:
        return False
    return r1[0] < r2[1] and r2[0] < r1[1]


def extract_slot(slot: str, is_vovinam: bool = False) -> tuple[str, str]:
    m = re.search(r"slot\s*(\d+)", slot, re.IGNORECASE)
    if m:
        num = m.group(1)
        slot_key = f"SLOT_{num}"
        label = slot.strip()
        if not re.search(r"\d{1,2}\s*[:h]\s*\d{2}", label):
            table = _VOVINAM_SLOT_RANGES if is_vovinam else _REGULAR_SLOT_RANGES
            if slot_key in table:
                label = table[slot_key][2]
        return slot_key, label
    return slot.strip().lower(), slot.strip()


def _student_held_classes(
    db: Session,
    student_id: uuid.UUID,
    exclude_request_id: uuid.UUID | None = None,
    exclude_course_semester: tuple[uuid.UUID, uuid.UUID] | None = None,
) -> list[tuple[AcademicClass, uuid.UUID | None, str]]:
    """Return list of (AcademicClass, request_id | None, status_label) held by student."""
    held: list[tuple[AcademicClass, uuid.UUID | None, str]] = []
    seen_class_ids: set[uuid.UUID] = set()

    reqs = (
        db.query(MatchingRequest)
        .filter(
            MatchingRequest.student_id == student_id,
            MatchingRequest.status.in_(
                [
                    SwapRequestStatus.ACTIVE,
                    SwapRequestStatus.PAUSED,
                    SwapRequestStatus.DRAFT,
                    SwapRequestStatus.MATCHED,
                    SwapRequestStatus.COMPLETED,
                ]
            ),
        )
        .all()
    )
    for req in reqs:
        if exclude_request_id and req.id == exclude_request_id:
            continue
        if exclude_course_semester and (req.course_id, req.semester_id) == exclude_course_semester:
            continue
        cls_id = (
            req.target_class_id
            if req.status in (SwapRequestStatus.MATCHED, SwapRequestStatus.COMPLETED)
            else req.current_class_id
        )
        cls = db.get(AcademicClass, cls_id)
        if cls is not None and cls.id not in seen_class_ids:
            seen_class_ids.add(cls.id)
            held.append((cls, req.id, req.status.value))

    enrollments = (
        db.query(StudentEnrollment)
        .filter(
            StudentEnrollment.student_id == student_id,
            StudentEnrollment.status == EnrollmentStatus.ENROLLED,
        )
        .all()
    )
    for enr in enrollments:
        cls = db.get(AcademicClass, enr.class_id)
        if cls is None:
            continue
        if (
            exclude_course_semester
            and (cls.course_id, cls.semester_id) == exclude_course_semester
        ):
            continue
        if cls.id not in seen_class_ids:
            seen_class_ids.add(cls.id)
            held.append((cls, None, "ENROLLED"))

    return held


def detect_schedule_conflict(
    db: Session,
    student_id: uuid.UUID,
    target_class: AcademicClass | None,
    exclude_request_id: uuid.UUID | None = None,
) -> str | None:
    """Return a conflict warning string if target_class overlaps any other course schedule."""
    if target_class is None or not target_class.schedules:
        return None

    held = _student_held_classes(
        db,
        student_id,
        exclude_request_id=exclude_request_id,
        exclude_course_semester=(target_class.course_id, target_class.semester_id),
    )
    if not held:
        return None

    busy_by_day: dict[str, list[tuple[str, str, tuple[int, int] | None]]] = {}
    for cls, _, _ in held:
        if cls.semester_id != target_class.semester_id:
            continue
        cls_vov = _is_vovinam_class(db, cls)
        for sched in cls.schedules:
            slot_key, _ = extract_slot(sched.slot, is_vovinam=cls_vov)
            time_range = _parse_time_range(sched.slot, slot_key, cls_vov)
            for day_key in extract_days(sched.day_of_week):
                busy_by_day.setdefault(day_key, []).append((cls.code, slot_key, time_range))

    target_vov = _is_vovinam_class(db, target_class)
    for sched in target_class.schedules:
        slot_key, slot_label = extract_slot(sched.slot, is_vovinam=target_vov)
        target_range = _parse_time_range(sched.slot, slot_key, target_vov)
        for day_key in extract_days(sched.day_of_week):
            for other_code, other_slot_key, other_range in busy_by_day.get(day_key, []):
                overlaps = (
                    _ranges_overlap(target_range, other_range)
                    if (target_range is not None and other_range is not None)
                    else slot_key == other_slot_key
                )
                if overlaps:
                    day_name = _DAY_LABEL.get(day_key, day_key)
                    return f"Trùng lịch với lớp {other_code} ({day_name} • {slot_label})"
    return None


def build_weekly_timetable(db: Session, student_id: uuid.UUID) -> list[dict]:
    """Build normalized weekly timetable entries for student's active/matched/enrolled classes."""
    held = _student_held_classes(db, student_id)
    entries: list[dict] = []
    for cls, req_id, req_status in held:
        course = db.get(Course, cls.course_id)
        semester = db.get(Semester, cls.semester_id)
        is_vov = bool(course and course.code.strip().upper().startswith("VOV"))
        for sched in cls.schedules:
            slot_key, slot_label = extract_slot(sched.slot, is_vovinam=is_vov)
            time_range = _parse_time_range(sched.slot, slot_key, is_vov)
            sort_min = time_range[0] if time_range else 9999
            for day_key in extract_days(sched.day_of_week):
                entries.append(
                    {
                        "request_id": req_id,
                        "course_code": course.code if course else "",
                        "course_name": course.name if course else "",
                        "class_code": cls.code,
                        "semester_name": semester.name if semester else "",
                        "day_key": day_key,
                        "day_label": _DAY_LABEL.get(day_key, day_key),
                        "slot_key": slot_key,
                        "slot_label": slot_label,
                        "room": sched.room,
                        "lecturer": cls.lecturer,
                        "status": req_status,
                        "_sort_min": sort_min,
                    }
                )
    entries.sort(key=lambda item: (item["day_key"], item["_sort_min"], item["slot_key"], item["course_code"]))
    for item in entries:
        item.pop("_sort_min", None)
    return entries
