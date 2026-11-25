import hashlib
import uuid

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.common.enums import (
    ConversationSourceType,
    MatchStatus,
    NotificationType,
    SwapRequestStatus,
)
from app.database.models import (
    AuditLog,
    Conversation,
    ConversationMember,
    Match,
    MatchingRequest,
    Message,
    Notification,
    RefreshToken,
    Report,
    Student,
    Swipe,
)


def _anon_ref(student_id: uuid.UUID) -> str:
    digest = hashlib.sha256(str(student_id).encode("utf-8")).hexdigest()[:12]
    return f"anon_{digest}"


def cancel_student_matches_and_notify(
    db: Session,
    student_id: uuid.UUID,
    reason_text: str,
) -> int:
    """Cancel active/pending matches for a departing user, notify partners, and reopen partner requests."""
    req_ids = [
        r[0]
        for r in db.query(MatchingRequest.id)
        .filter(MatchingRequest.student_id == student_id)
        .all()
    ]
    match_filters = [Match.student_a_id == student_id, Match.student_b_id == student_id]
    if req_ids:
        match_filters.extend(
            [Match.request_low_id.in_(req_ids), Match.request_high_id.in_(req_ids)]
        )

    open_matches = (
        db.query(Match)
        .filter(
            or_(*match_filters),
            Match.status.in_([MatchStatus.PENDING_CONFIRMATION, MatchStatus.CONFIRMED]),
        )
        .all()
    )

    cancelled_count = 0
    for match in open_matches:
        match.status = MatchStatus.CANCELLED
        cancelled_count += 1
        partner_id = (
            match.student_b_id if match.student_a_id == student_id else match.student_a_id
        )

        for rid in (match.request_low_id, match.request_high_id):
            req = db.get(MatchingRequest, rid)
            if req is None:
                continue
            if req.student_id == partner_id and req.status == SwapRequestStatus.MATCHED:
                req.status = SwapRequestStatus.ACTIVE

        db.add(
            Notification(
                student_id=partner_id,
                notification_type=NotificationType.SYSTEM,
                title="Match đã bị hủy",
                body=reason_text,
                is_read=False,
                reference_id=match.id,
            )
        )

    # Hide/cancel user's own non-terminal requests immediately
    db.query(MatchingRequest).filter(
        MatchingRequest.student_id == student_id,
        MatchingRequest.status.in_(
            [
                SwapRequestStatus.DRAFT,
                SwapRequestStatus.ACTIVE,
                SwapRequestStatus.PAUSED,
                SwapRequestStatus.MATCHED,
            ]
        ),
    ).update({"status": SwapRequestStatus.CANCELLED}, synchronize_session=False)

    return cancelled_count


def anonymize_student_reports(db: Session, target_id: uuid.UUID) -> None:
    """Preserve abuse/report evidence while removing direct student foreign-key references."""
    ref = _anon_ref(target_id)
    db.query(Report).filter(Report.reporter_id == target_id).update(
        {"reporter_id": None, "anonymized_reporter_ref": ref},
        synchronize_session=False,
    )
    db.query(Report).filter(Report.reported_student_id == target_id).update(
        {"reported_student_id": None, "anonymized_reported_ref": ref},
        synchronize_session=False,
    )
    db.query(Report).filter(Report.resolved_by_id == target_id).update(
        {"resolved_by_id": None},
        synchronize_session=False,
    )


def purge_student_account(db: Session, target_id: uuid.UUID) -> tuple[str, str]:
    """Delete a student and FK-restricted records, notifying active match partners and anonymizing reports."""
    student = db.get(Student, target_id)
    if student is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")

    deleted_email = student.email
    deleted_code = student.student_code

    cancel_student_matches_and_notify(
        db,
        target_id,
        "Đối tác đã đóng tài khoản. Yêu cầu đổi lớp của bạn đã được mở lại để tìm người khác.",
    )
    anonymize_student_reports(db, target_id)

    req_ids = [
        r[0]
        for r in db.query(MatchingRequest.id)
        .filter(MatchingRequest.student_id == target_id)
        .all()
    ]

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
    db.query(RefreshToken).filter(RefreshToken.student_id == target_id).delete(
        synchronize_session=False
    )
    db.query(AuditLog).filter(AuditLog.actor_id == target_id).update(
        {"actor_id": None}, synchronize_session=False
    )

    db.delete(student)
    db.flush()
    return deleted_email, deleted_code
