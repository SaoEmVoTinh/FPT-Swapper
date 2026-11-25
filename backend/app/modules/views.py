"""
Presentation helpers: turn raw ORM rows into viewer-friendly API responses.

These helpers only read from the database (no commits) and never import any
service module, so routers *and* services can both use them without cycles.
"""

import uuid

from sqlalchemy.orm import Session

from app.common.enums import ConversationSourceType
from app.database.models.academic import AcademicClass, Campus, Course, Semester
from app.database.models.communication import Conversation, Message
from app.database.models.identity import Student
from app.database.models.matching import Match, MatchingRequest
from app.modules.chat.schemas import ConversationResponse
from app.modules.class_swap.schemas import RequestResponse
from app.modules.matching.schemas import DiscoverItem, MatchResponse


def schedule_text(cls: AcademicClass | None) -> str:
    if cls is None or not cls.schedules:
        return "Chưa cập nhật lịch"
    s = cls.schedules[0]
    text = f"{s.day_of_week} • {s.slot}"
    if s.room:
        text += f" • {s.room}"
    return text


def display_name(db: Session, student_id: uuid.UUID) -> str:
    student = db.get(Student, student_id)
    if student is None:
        return "Sinh viên"
    if student.profile and student.profile.full_name:
        return student.profile.full_name
    return student.student_code


def _campus_name(db: Session, campus_id: uuid.UUID | None) -> str | None:
    if campus_id is None:
        return None
    campus = db.get(Campus, campus_id)
    return campus.name if campus else None


# ───────────────────────── Swap request ─────────────────────────

def request_view(db: Session, req: MatchingRequest) -> RequestResponse:
    course = db.get(Course, req.course_id)
    semester = db.get(Semester, req.semester_id)
    current = db.get(AcademicClass, req.current_class_id)
    target = db.get(AcademicClass, req.target_class_id)
    return RequestResponse(
        id=req.id,
        student_id=req.student_id,
        semester_id=req.semester_id,
        course_id=req.course_id,
        current_class_id=req.current_class_id,
        target_class_id=req.target_class_id,
        note=req.note,
        expires_at=req.expires_at,
        status=req.status,
        created_at=req.created_at,
        updated_at=req.updated_at,
        course_code=course.code if course else None,
        course_name=course.name if course else None,
        semester_name=semester.name if semester else None,
        campus_id=current.campus_id if current else None,
        campus_name=_campus_name(db, current.campus_id if current else None),
        current_class_code=current.code if current else None,
        current_schedule_text=schedule_text(current),
        target_class_code=target.code if target else None,
        target_schedule_text=schedule_text(target),
    )


# ───────────────────────── Discover card ─────────────────────────

def discover_view(
    db: Session,
    candidate: MatchingRequest,
    mine: MatchingRequest,
    reciprocal_ready: bool,
) -> DiscoverItem:
    student = db.get(Student, candidate.student_id)
    profile = student.profile if student else None
    course = db.get(Course, candidate.course_id)
    semester = db.get(Semester, candidate.semester_id)
    current = db.get(AcademicClass, candidate.current_class_id)
    target = db.get(AcademicClass, candidate.target_class_id)
    code = student.student_code if student else ""
    return DiscoverItem(
        id=candidate.id,
        student_id=candidate.student_id,
        course_id=candidate.course_id,
        current_class_id=candidate.current_class_id,
        target_class_id=candidate.target_class_id,
        note=candidate.note,
        status=candidate.status,
        for_request_id=mine.id,
        student_display_name=display_name(db, candidate.student_id),
        student_code_masked=(code[:4] + "****") if code else "****",
        major=profile.major if profile else None,
        campus_name=_campus_name(db, current.campus_id if current else None),
        semester_name=semester.name if semester else None,
        course_code=course.code if course else None,
        course_name=course.name if course else None,
        current_class_code=current.code if current else None,
        current_schedule_text=schedule_text(current),
        target_class_code=target.code if target else None,
        target_schedule_text=schedule_text(target),
        lecturer_current=(current.lecturer if current and current.lecturer else "Đang cập nhật"),
        is_reciprocal_ready=reciprocal_ready,
    )


# ───────────────────────── Match ─────────────────────────

def find_match_conversation(db: Session, match_id: uuid.UUID) -> Conversation | None:
    return (
        db.query(Conversation)
        .filter(
            Conversation.source_type == ConversationSourceType.CLASS_SWAP,
            Conversation.source_id == match_id,
        )
        .first()
    )


def match_view(db: Session, match: Match, viewer_id: uuid.UUID) -> MatchResponse:
    low = db.get(MatchingRequest, match.request_low_id)
    high = db.get(MatchingRequest, match.request_high_id)
    if low is not None and low.student_id == viewer_id:
        mine, partner = low, high
    else:
        mine, partner = high, low

    viewer_is_a = match.student_a_id == viewer_id
    my_confirmed = match.student_a_confirmed if viewer_is_a else match.student_b_confirmed
    partner_confirmed = match.student_b_confirmed if viewer_is_a else match.student_a_confirmed

    course = db.get(Course, mine.course_id) if mine else None
    semester = db.get(Semester, mine.semester_id) if mine else None
    my_class = db.get(AcademicClass, mine.current_class_id) if mine else None
    partner_class = db.get(AcademicClass, partner.current_class_id) if partner else None
    conversation = find_match_conversation(db, match.id)

    return MatchResponse(
        id=match.id,
        request_low_id=match.request_low_id,
        request_high_id=match.request_high_id,
        student_a_id=match.student_a_id,
        student_b_id=match.student_b_id,
        status=match.status,
        student_a_confirmed=match.student_a_confirmed,
        student_b_confirmed=match.student_b_confirmed,
        created_at=match.created_at,
        updated_at=match.updated_at,
        my_request_id=mine.id if mine else None,
        partner_request_id=partner.id if partner else None,
        partner_name=display_name(db, partner.student_id) if partner else None,
        partner_campus=_campus_name(db, partner_class.campus_id if partner_class else None),
        course_code=course.code if course else None,
        course_name=course.name if course else None,
        semester_name=semester.name if semester else None,
        my_class_code=my_class.code if my_class else None,
        partner_class_code=partner_class.code if partner_class else None,
        my_confirmed=my_confirmed,
        partner_confirmed=partner_confirmed,
        conversation_id=conversation.id if conversation else None,
    )


# ───────────────────────── Conversation ─────────────────────────

def conversation_view(db: Session, conv: Conversation, viewer_id: uuid.UUID) -> ConversationResponse:
    base = {
        "id": conv.id,
        "status": conv.status,
        "created_at": conv.created_at,
        "updated_at": conv.updated_at,
    }

    partner_id = next((m.student_id for m in conv.members if m.student_id != viewer_id), None)
    partner_name = display_name(db, partner_id) if partner_id else None

    last = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.created_at.desc())
        .first()
    )
    base["last_message"] = last.content if last else None
    base["last_message_at"] = last.created_at if last else None
    base["last_message_sender_id"] = last.sender_id if last else None
    base["partner_name"] = partner_name

    if conv.source_type == ConversationSourceType.CLASS_SWAP:
        match = db.get(Match, conv.source_id)
        if match is not None:
            mv = match_view(db, match, viewer_id)
            base.update(
                match_id=match.id,
                partner_name=mv.partner_name or partner_name,
                course_code=mv.course_code,
                my_class_code=mv.my_class_code,
                partner_class_code=mv.partner_class_code,
                match_status=match.status.value,
            )
    return ConversationResponse(**base)
