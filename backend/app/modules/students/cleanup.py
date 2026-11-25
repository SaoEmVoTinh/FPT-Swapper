import uuid

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.common.enums import ConversationSourceType
from app.database.models import (
    AuditLog,
    Conversation,
    ConversationMember,
    Match,
    MatchingRequest,
    Message,
    Notification,
    Report,
    Student,
    Swipe,
)


def purge_student_account(db: Session, target_id: uuid.UUID) -> tuple[str, str]:
    """Delete a student and all FK-restricted related records cleanly.

    Returns (email, student_code) of the deleted student without committing.
    """
    student = db.get(Student, target_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    deleted_email = student.email
    deleted_code = student.student_code

    req_ids = [
        r[0]
        for r in db.query(MatchingRequest.id)
        .filter(MatchingRequest.student_id == target_id)
        .all()
    ]

    db.query(Report).filter(
        or_(Report.reporter_id == target_id, Report.reported_student_id == target_id)
    ).delete(synchronize_session=False)
    db.query(Report).filter(Report.resolved_by_id == target_id).update(
        {"resolved_by_id": None}, synchronize_session=False
    )

    match_filters = [Match.student_a_id == target_id, Match.student_b_id == target_id]
    if req_ids:
        match_filters.extend(
            [Match.request_low_id.in_(req_ids), Match.request_high_id.in_(req_ids)]
        )
    matches = db.query(Match).filter(or_(*match_filters)).all()
    for match in matches:
        convs = (
            db.query(Conversation)
            .filter(
                Conversation.source_type == ConversationSourceType.CLASS_SWAP,
                Conversation.source_id == match.id,
            )
            .all()
        )
        for conv in convs:
            db.delete(conv)
        db.delete(match)
    db.flush()

    db.query(Message).filter(Message.sender_id == target_id).delete(synchronize_session=False)
    db.query(ConversationMember).filter(
        ConversationMember.student_id == target_id
    ).delete(synchronize_session=False)

    swipe_filters = [Swipe.swiper_student_id == target_id]
    if req_ids:
        swipe_filters.extend(
            [Swipe.swiper_request_id.in_(req_ids), Swipe.target_request_id.in_(req_ids)]
        )
    db.query(Swipe).filter(or_(*swipe_filters)).delete(synchronize_session=False)
    db.query(MatchingRequest).filter(
        MatchingRequest.student_id == target_id
    ).delete(synchronize_session=False)
    db.query(Notification).filter(Notification.student_id == target_id).delete(
        synchronize_session=False
    )
    db.query(AuditLog).filter(AuditLog.actor_id == target_id).update(
        {"actor_id": None}, synchronize_session=False
    )

    db.delete(student)
    db.flush()
    return deleted_email, deleted_code
