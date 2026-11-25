import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.common.enums import (
    ConversationSourceType,
    ConversationType,
    MatchStatus,
    NotificationType,
    SwapRequestStatus,
)
from app.database.models.academic import AcademicClass, Course, Semester
from app.database.models.communication import Conversation, ConversationMember
from app.database.models.identity import Student, StudentBlock
from app.database.models.matching import Match, MatchingRequest, ThreeWaySwapProposal
from app.database.models.operations import Notification


def _blocked_set(db: Session, student_id: uuid.UUID) -> set[uuid.UUID]:
    rows = (
        db.query(StudentBlock.blocker_id, StudentBlock.blocked_student_id)
        .filter(
            or_(
                StudentBlock.blocker_id == student_id,
                StudentBlock.blocked_student_id == student_id,
            )
        )
        .all()
    )
    out: set[uuid.UUID] = set()
    for blocker_id, blocked_id in rows:
        out.add(blocked_id if blocker_id == student_id else blocker_id)
    return out


def _has_any_block(db: Session, student_ids: tuple[uuid.UUID, uuid.UUID, uuid.UUID]) -> bool:
    return (
        db.query(StudentBlock.id)
        .filter(
            StudentBlock.blocker_id.in_(student_ids),
            StudentBlock.blocked_student_id.in_(student_ids),
        )
        .first()
        is not None
    )


def _cancel_competing_for_three_way(
    db: Session,
    proposal: ThreeWaySwapProposal,
) -> None:
    req_ids = [proposal.req_a_id, proposal.req_b_id, proposal.req_c_id]
    member_ids = {proposal.student_a_id, proposal.student_b_id, proposal.student_c_id}

    competing_matches = (
        db.query(Match)
        .filter(
            Match.status == MatchStatus.PENDING_CONFIRMATION,
            or_(Match.request_low_id.in_(req_ids), Match.request_high_id.in_(req_ids)),
        )
        .all()
    )
    for other in competing_matches:
        other.status = MatchStatus.CANCELLED
        for sid in (other.student_a_id, other.student_b_id):
            if sid not in member_ids:
                db.add(
                    Notification(
                        student_id=sid,
                        notification_type=NotificationType.SYSTEM,
                        title="Match chờ đã tự động hủy",
                        body="Đối tác đã chốt vòng đổi lớp 3 bên. Yêu cầu của bạn vẫn đang mở trên Discover.",
                        is_read=False,
                        reference_id=other.id,
                    )
                )

    competing_proposals = (
        db.query(ThreeWaySwapProposal)
        .filter(
            ThreeWaySwapProposal.id != proposal.id,
            ThreeWaySwapProposal.status == MatchStatus.PENDING_CONFIRMATION,
            or_(
                ThreeWaySwapProposal.req_a_id.in_(req_ids),
                ThreeWaySwapProposal.req_b_id.in_(req_ids),
                ThreeWaySwapProposal.req_c_id.in_(req_ids),
            ),
        )
        .all()
    )
    for other_prop in competing_proposals:
        other_prop.status = MatchStatus.CANCELLED
        for sid in (other_prop.student_a_id, other_prop.student_b_id, other_prop.student_c_id):
            if sid not in member_ids:
                db.add(
                    Notification(
                        student_id=sid,
                        notification_type=NotificationType.SYSTEM,
                        title="Đề xuất vòng đổi 3 bên đã tự động hủy",
                        body="Một thành viên trong vòng đã chốt đổi lớp với nhóm khác. Yêu cầu của bạn vẫn đang mở.",
                        is_read=False,
                        reference_id=other_prop.id,
                    )
                )


def _canonical_triple(
    ra: MatchingRequest, rb: MatchingRequest, rc: MatchingRequest
) -> tuple[MatchingRequest, MatchingRequest, MatchingRequest]:
    """Rotate cycle A->B->C->A so the lowest request UUID is in slot A."""
    triple = [ra, rb, rc]
    min_idx = min(range(3), key=lambda i: str(triple[i].id))
    return (
        triple[min_idx],
        triple[(min_idx + 1) % 3],
        triple[(min_idx + 2) % 3],
    )


def _display_name(db: Session, student_id: uuid.UUID) -> str:
    stu = db.get(Student, student_id)
    if stu is None:
        return "Sinh viên"
    if stu.profile and stu.profile.full_name:
        return stu.profile.full_name
    return stu.student_code


def _cycle_view(
    db: Session,
    req_a: MatchingRequest,
    req_b: MatchingRequest,
    req_c: MatchingRequest,
    viewer_id: uuid.UUID,
    proposal: ThreeWaySwapProposal | None,
) -> dict:
    # Rotate for viewer display so participant 0 is always the viewer's request
    ring = [req_a, req_b, req_c]
    flags = (
        [proposal.a_accepted, proposal.b_accepted, proposal.c_accepted]
        if proposal
        else [False, False, False]
    )
    viewer_idx = next((i for i, r in enumerate(ring) if r.student_id == viewer_id), 0)
    ordered_reqs = [ring[(viewer_idx + i) % 3] for i in range(3)]
    ordered_flags = [flags[(viewer_idx + i) % 3] for i in range(3)]

    course = db.get(Course, req_a.course_id)
    semester = db.get(Semester, req_a.semester_id)

    participants = []
    for req, acc in zip(ordered_reqs, ordered_flags):
        cur_cls = db.get(AcademicClass, req.current_class_id)
        tgt_cls = db.get(AcademicClass, req.target_class_id)
        stu = db.get(Student, req.student_id)
        code = stu.student_code if stu else ""
        participants.append(
            {
                "request_id": req.id,
                "student_id": req.student_id,
                "student_name": _display_name(db, req.student_id),
                "student_code_masked": f"{code[:4]}****" if code else "****",
                "current_class_code": cur_cls.code if cur_cls else "",
                "target_class_code": tgt_cls.code if tgt_cls else "",
                "accepted": acc,
            }
        )

    conv_id: uuid.UUID | None = None
    if proposal is not None:
        conv = (
            db.query(Conversation)
            .filter(
                Conversation.source_type == ConversationSourceType.CLASS_SWAP,
                Conversation.source_id == proposal.id,
            )
            .first()
        )
        conv_id = conv.id if conv else None

    return {
        "proposal_id": proposal.id if proposal else None,
        "course_code": course.code if course else None,
        "course_name": course.name if course else None,
        "semester_name": semester.name if semester else None,
        "status": proposal.status.value if proposal else "SUGGESTED",
        "my_accepted": ordered_flags[0],
        "conversation_id": conv_id,
        "req_a_id": req_a.id,
        "req_b_id": req_b.id,
        "req_c_id": req_c.id,
        "participants": participants,
    }


def list_three_way_cycles(
    db: Session, student_id: uuid.UUID, campus_id: uuid.UUID, limit: int = 20
) -> list[dict]:
    now = datetime.now(timezone.utc)
    blocked = _blocked_set(db, student_id)

    # Active requests in same campus
    active_reqs = (
        db.query(MatchingRequest)
        .join(AcademicClass, AcademicClass.id == MatchingRequest.current_class_id)
        .filter(
            MatchingRequest.status == SwapRequestStatus.ACTIVE,
            AcademicClass.campus_id == campus_id,
            or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
        )
        .all()
    )

    my_active = [r for r in active_reqs if r.student_id == student_id]
    results: list[dict] = []
    seen_triples: set[tuple[uuid.UUID, uuid.UUID, uuid.UUID]] = set()

    # Also include existing CONFIRMED/PENDING proposals where student is a participant
    existing_proposals = (
        db.query(ThreeWaySwapProposal)
        .filter(
            or_(
                ThreeWaySwapProposal.student_a_id == student_id,
                ThreeWaySwapProposal.student_b_id == student_id,
                ThreeWaySwapProposal.student_c_id == student_id,
            ),
            ThreeWaySwapProposal.status.in_(
                [MatchStatus.PENDING_CONFIRMATION, MatchStatus.CONFIRMED]
            ),
        )
        .order_by(ThreeWaySwapProposal.updated_at.desc())
        .all()
    )

    for prop in existing_proposals:
        ra = db.get(MatchingRequest, prop.req_a_id)
        rb = db.get(MatchingRequest, prop.req_b_id)
        rc = db.get(MatchingRequest, prop.req_c_id)
        if not (ra and rb and rc):
            continue
        if _has_any_block(db, (ra.student_id, rb.student_id, rc.student_id)):
            continue
        if prop.status == MatchStatus.PENDING_CONFIRMATION and any(
            r.status != SwapRequestStatus.ACTIVE or (r.expires_at is not None and r.expires_at <= now)
            for r in (ra, rb, rc)
        ):
            continue
        key = (ra.id, rb.id, rc.id)
        seen_triples.add(key)
        results.append(_cycle_view(db, ra, rb, rc, student_id, prop))

    # Index by (course_id, semester_id, current_class_id)
    by_course_current: dict[tuple[uuid.UUID, uuid.UUID, uuid.UUID], list[MatchingRequest]] = {}
    for req in active_reqs:
        if req.student_id in blocked:
            continue
        by_course_current.setdefault(
            (req.course_id, req.semester_id, req.current_class_id), []
        ).append(req)

    for ra in my_active:
        b_candidates = by_course_current.get(
            (ra.course_id, ra.semester_id, ra.target_class_id), []
        )
        for rb in b_candidates:
            if rb.student_id == ra.student_id:
                continue
            c_candidates = by_course_current.get(
                (ra.course_id, ra.semester_id, rb.target_class_id), []
            )
            for rc in c_candidates:
                if rc.student_id in (ra.student_id, rb.student_id):
                    continue
                if rc.target_class_id != ra.current_class_id:
                    continue
                ca, cb, cc = _canonical_triple(ra, rb, rc)
                key = (ca.id, cb.id, cc.id)
                if key in seen_triples:
                    continue
                seen_triples.add(key)
                # Check if declined previously
                declined = (
                    db.query(ThreeWaySwapProposal.id)
                    .filter(
                        ThreeWaySwapProposal.req_a_id == ca.id,
                        ThreeWaySwapProposal.req_b_id == cb.id,
                        ThreeWaySwapProposal.req_c_id == cc.id,
                        ThreeWaySwapProposal.status == MatchStatus.DECLINED,
                    )
                    .first()
                )
                if declined:
                    continue
                results.append(_cycle_view(db, ca, cb, cc, student_id, None))
                if len(results) >= limit:
                    return results

    return results[:limit]


def accept_three_way_cycle(
    db: Session,
    student_id: uuid.UUID,
    req_a_id: uuid.UUID,
    req_b_id: uuid.UUID,
    req_c_id: uuid.UUID,
) -> dict:
    ra = db.get(MatchingRequest, req_a_id)
    rb = db.get(MatchingRequest, req_b_id)
    rc = db.get(MatchingRequest, req_c_id)
    if ra is None or rb is None or rc is None:
        raise HTTPException(404, "Không tìm thấy yêu cầu trong vòng đổi lớp.")

    if not (
        ra.course_id == rb.course_id == rc.course_id
        and ra.semester_id == rb.semester_id == rc.semester_id
        and ra.target_class_id == rb.current_class_id
        and rb.target_class_id == rc.current_class_id
        and rc.target_class_id == ra.current_class_id
    ):
        raise HTTPException(422, "Ba yêu cầu không tạo thành chu trình đổi lớp A→B→C→A hợp lệ.")

    if student_id not in (ra.student_id, rb.student_id, rc.student_id):
        raise HTTPException(403, "Bạn không nằm trong chu trình đổi lớp này.")

    ca, cb, cc = _canonical_triple(ra, rb, rc)
    if _has_any_block(db, (ca.student_id, cb.student_id, cc.student_id)):
        raise HTTPException(403, "Không thể xác nhận vòng đổi lớp vì có sinh viên đang trong danh sách chặn.")

    proposal = (
        db.query(ThreeWaySwapProposal)
        .filter(
            ThreeWaySwapProposal.req_a_id == ca.id,
            ThreeWaySwapProposal.req_b_id == cb.id,
            ThreeWaySwapProposal.req_c_id == cc.id,
        )
        .order_by(ThreeWaySwapProposal.created_at.desc())
        .first()
    )
    if proposal is not None and proposal.status == MatchStatus.CONFIRMED:
        return _cycle_view(db, ca, cb, cc, student_id, proposal)

    if proposal is None or proposal.status in (MatchStatus.DECLINED, MatchStatus.CANCELLED):
        for r in (ca, cb, cc):
            if r.status != SwapRequestStatus.ACTIVE:
                raise HTTPException(422, "Một trong các yêu cầu không còn ACTIVE.")
        proposal = ThreeWaySwapProposal(
            course_id=ca.course_id,
            semester_id=ca.semester_id,
            req_a_id=ca.id,
            req_b_id=cb.id,
            req_c_id=cc.id,
            student_a_id=ca.student_id,
            student_b_id=cb.student_id,
            student_c_id=cc.student_id,
            status=MatchStatus.PENDING_CONFIRMATION,
        )
        db.add(proposal)
        db.flush()
    else:
        for r in (ca, cb, cc):
            if r.status != SwapRequestStatus.ACTIVE:
                proposal.status = MatchStatus.CANCELLED
                db.commit()
                raise HTTPException(422, "Một trong các yêu cầu không còn ACTIVE.")

    if proposal.student_a_id == student_id:
        proposal.a_accepted = True
    elif proposal.student_b_id == student_id:
        proposal.b_accepted = True
    elif proposal.student_c_id == student_id:
        proposal.c_accepted = True

    others = [
        sid
        for sid in (proposal.student_a_id, proposal.student_b_id, proposal.student_c_id)
        if sid != student_id
    ]
    actor_name = _display_name(db, student_id)

    if proposal.a_accepted and proposal.b_accepted and proposal.c_accepted:
        proposal.status = MatchStatus.CONFIRMED
        for r in (ca, cb, cc):
            if r.status == SwapRequestStatus.ACTIVE:
                r.status = SwapRequestStatus.MATCHED
        _cancel_competing_for_three_way(db, proposal)

        conv = (
            db.query(Conversation)
            .filter(
                Conversation.source_type == ConversationSourceType.CLASS_SWAP,
                Conversation.source_id == proposal.id,
            )
            .first()
        )
        if conv is None:
            conv = Conversation(
                conversation_type=ConversationType.GROUP,
                source_type=ConversationSourceType.CLASS_SWAP,
                source_id=proposal.id,
            )
            db.add(conv)
            db.flush()
            for sid in {proposal.student_a_id, proposal.student_b_id, proposal.student_c_id}:
                db.add(ConversationMember(conversation_id=conv.id, student_id=sid))

        for sid in (proposal.student_a_id, proposal.student_b_id, proposal.student_c_id):
            db.add(
                Notification(
                    student_id=sid,
                    notification_type=NotificationType.MATCH,
                    title="Chốt thành công vòng đổi 3 bên!",
                    body="Cả 3 sinh viên trong chu trình A→B→C→A đã đồng ý. Nhóm chat 3 người đã được tạo.",
                    is_read=False,
                    reference_id=proposal.id,
                )
            )
    else:
        for sid in others:
            db.add(
                Notification(
                    student_id=sid,
                    notification_type=NotificationType.MATCH,
                    title="Có đề xuất đổi lớp 3 bên (A→B→C→A)",
                    body=f"{actor_name} đã đồng ý tham gia vòng đổi lớp 3 bên. Vào Discover → Đổi vòng 3 bên để xác nhận.",
                    is_read=False,
                    reference_id=proposal.id,
                )
            )

    db.commit()
    db.refresh(proposal)
    return _cycle_view(db, ca, cb, cc, student_id, proposal)


def decline_three_way_cycle(
    db: Session, proposal_id: uuid.UUID, student_id: uuid.UUID
) -> dict:
    proposal = db.get(ThreeWaySwapProposal, proposal_id)
    if proposal is None:
        raise HTTPException(404, "Không tìm thấy đề xuất vòng đổi lớp.")
    if student_id not in (proposal.student_a_id, proposal.student_b_id, proposal.student_c_id):
        raise HTTPException(403, "Bạn không thuộc đề xuất này.")
    if proposal.status not in (MatchStatus.PENDING_CONFIRMATION, MatchStatus.CONFIRMED):
        raise HTTPException(422, f"Không thể từ chối đề xuất ở trạng thái {proposal.status.value}.")

    was_confirmed = proposal.status == MatchStatus.CONFIRMED
    proposal.status = MatchStatus.DECLINED
    if was_confirmed:
        for rid in (proposal.req_a_id, proposal.req_b_id, proposal.req_c_id):
            req = db.get(MatchingRequest, rid)
            if req is not None and req.status == SwapRequestStatus.MATCHED:
                req.status = SwapRequestStatus.ACTIVE

    actor_name = _display_name(db, student_id)
    for sid in (proposal.student_a_id, proposal.student_b_id, proposal.student_c_id):
        if sid != student_id:
            db.add(
                Notification(
                    student_id=sid,
                    notification_type=NotificationType.SYSTEM,
                    title="Vòng đổi lớp 3 bên đã hủy",
                    body=f"{actor_name} đã từ chối vòng đổi lớp 3 bên.",
                    is_read=False,
                    reference_id=proposal.id,
                )
            )
    db.commit()
    db.refresh(proposal)
    ra = db.get(MatchingRequest, proposal.req_a_id)
    rb = db.get(MatchingRequest, proposal.req_b_id)
    rc = db.get(MatchingRequest, proposal.req_c_id)
    return _cycle_view(db, ra, rb, rc, student_id, proposal)
