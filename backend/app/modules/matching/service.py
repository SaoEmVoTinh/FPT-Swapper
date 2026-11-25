import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import (
    ConversationSourceType,
    ConversationType,
    MatchStatus,
    NotificationType,
    SwapRequestStatus,
    SwipeAction,
)
from app.database.models.academic import AcademicClass
from app.database.models.communication import Conversation, ConversationMember
from app.database.models.matching import Match, MatchingRequest, Swipe
from app.database.models.operations import Notification
from app.modules.matching.engine import is_compatible
from app.modules.matching.schemas import SwipeRequest, SwipeResponse
from app.modules.views import display_name, match_view


def _notify(
    db: Session,
    student_id: uuid.UUID,
    title: str,
    body: str,
    reference_id: uuid.UUID | None,
) -> None:
    db.add(
        Notification(
            student_id=student_id,
            notification_type=NotificationType.MATCH,
            title=title,
            body=body,
            is_read=False,
            reference_id=reference_id,
        )
    )


class MatchingService:
    # ── Discover ────────────────────────────────────────────────

    @staticmethod
    def get_discover_candidates(
        db: Session,
        student_id: uuid.UUID,
        active_request: MatchingRequest,
        limit: int = 20,
    ) -> list[MatchingRequest]:
        """
        Return up to `limit` compatible active requests that:
          - belong to a different student
          - match the compatibility rule (class flip, same course/semester)
          - are not expired
          - haven't been swiped by this request yet
        """
        swiped_ids = {
            row[0]
            for row in db.query(Swipe.target_request_id).filter(
                Swipe.swiper_request_id == active_request.id
            )
        }

        now = datetime.now(timezone.utc)
        candidates = (
            db.query(MatchingRequest)
            .filter(
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
                MatchingRequest.student_id != student_id,
                MatchingRequest.course_id == active_request.course_id,
                MatchingRequest.semester_id == active_request.semester_id,
                # Flip: candidate's current == our target, candidate's target == our current
                MatchingRequest.current_class_id == active_request.target_class_id,
                MatchingRequest.target_class_id == active_request.current_class_id,
                or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
            )
            .order_by(MatchingRequest.created_at.asc())
            .limit(limit + len(swiped_ids))
            .all()
        )

        return [c for c in candidates if c.id not in swiped_ids][:limit]

    @staticmethod
    def list_campus_discover_requests(
        db: Session,
        student_id: uuid.UUID,
        campus_id: uuid.UUID,
        limit: int = 50,
    ) -> list[MatchingRequest]:
        """Return all ACTIVE, non-expired swap requests posted within the student's campus."""
        swiped_ids = {
            row[0]
            for row in db.query(Swipe.target_request_id).filter(
                Swipe.swiper_student_id == student_id
            )
        }
        now = datetime.now(timezone.utc)
        rows = (
            db.query(MatchingRequest)
            .join(AcademicClass, AcademicClass.id == MatchingRequest.current_class_id)
            .filter(
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
                MatchingRequest.student_id != student_id,
                AcademicClass.campus_id == campus_id,
                or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
            )
            .order_by(MatchingRequest.created_at.desc())
            .limit(limit + len(swiped_ids))
            .all()
        )
        return [r for r in rows if r.id not in swiped_ids][:limit]

    @staticmethod
    def list_busy_course_semesters(
        db: Session,
        student_id: uuid.UUID,
    ) -> set[tuple[uuid.UUID, uuid.UUID]]:
        """Course/semester pairs where the student already has an active/draft/matched request."""
        rows = (
            db.query(MatchingRequest.course_id, MatchingRequest.semester_id)
            .filter(
                MatchingRequest.student_id == student_id,
                MatchingRequest.status.in_(
                    [SwapRequestStatus.ACTIVE, SwapRequestStatus.DRAFT, SwapRequestStatus.MATCHED]
                ),
            )
            .all()
        )
        return {(r[0], r[1]) for r in rows}

    @staticmethod
    def has_liked(db: Session, swiper_request_id: uuid.UUID, target_request_id: uuid.UUID) -> bool:
        return (
            db.query(Swipe.id)
            .filter(
                Swipe.swiper_request_id == swiper_request_id,
                Swipe.target_request_id == target_request_id,
                Swipe.action == SwipeAction.LIKE,
            )
            .first()
            is not None
        )

    @staticmethod
    def list_my_active_requests(db: Session, student_id: uuid.UUID) -> list[MatchingRequest]:
        return (
            db.query(MatchingRequest)
            .filter(
                MatchingRequest.student_id == student_id,
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
            )
            .order_by(MatchingRequest.created_at.desc())
            .all()
        )

    # ── Swipe ────────────────────────────────────────────────────

    @staticmethod
    def swipe(
        db: Session,
        student_id: uuid.UUID,
        data: SwipeRequest,
    ) -> SwipeResponse:
        swiper_req = db.get(MatchingRequest, data.swiper_request_id)
        if not swiper_req:
            raise HTTPException(404, "Swiper request not found")
        if swiper_req.student_id != student_id:
            raise HTTPException(403, "Not your request")
        if swiper_req.status != SwapRequestStatus.ACTIVE:
            raise HTTPException(422, "Request must be ACTIVE to swipe")

        target_req = db.get(MatchingRequest, data.target_request_id)
        if not target_req:
            raise HTTPException(404, "Target request not found")
        if target_req.student_id == student_id:
            raise HTTPException(422, "Cannot swipe on your own request")
        if target_req.status != SwapRequestStatus.ACTIVE:
            raise HTTPException(422, "Target request is no longer available")
        if not is_compatible(swiper_req, target_req):
            raise HTTPException(422, "Requests are not compatible")

        # Idempotency: return the existing swipe (and match, if any) when already swiped
        existing_swipe = (
            db.query(Swipe)
            .filter(
                Swipe.swiper_request_id == data.swiper_request_id,
                Swipe.target_request_id == data.target_request_id,
            )
            .first()
        )
        if existing_swipe:
            existing_match = MatchingService._find_match(db, swiper_req.id, target_req.id)
            return SwipeResponse(
                id=existing_swipe.id,
                swiper_request_id=existing_swipe.swiper_request_id,
                target_request_id=existing_swipe.target_request_id,
                action=existing_swipe.action,
                created_at=existing_swipe.created_at,
                match_id=existing_match.id if existing_match else None,
                match_created=False,
                match=match_view(db, existing_match, student_id) if existing_match else None,
            )

        swipe = Swipe(
            swiper_request_id=data.swiper_request_id,
            target_request_id=data.target_request_id,
            swiper_student_id=student_id,
            action=data.action,
        )
        db.add(swipe)
        db.flush()

        match: Match | None = None
        created = False
        if data.action == SwipeAction.LIKE:
            match, created = MatchingService._try_create_match(db, swiper_req, target_req)

        db.commit()
        db.refresh(swipe)

        return SwipeResponse(
            id=swipe.id,
            swiper_request_id=swipe.swiper_request_id,
            target_request_id=swipe.target_request_id,
            action=swipe.action,
            created_at=swipe.created_at,
            match_id=match.id if match else None,
            match_created=created,
            match=match_view(db, match, student_id) if match else None,
        )

    # ── Match creation ───────────────────────────────────────────

    @staticmethod
    def _find_match(db: Session, req_a_id: uuid.UUID, req_b_id: uuid.UUID) -> Match | None:
        low_id, high_id = sorted([req_a_id, req_b_id], key=lambda x: str(x))
        return (
            db.query(Match)
            .filter(Match.request_low_id == low_id, Match.request_high_id == high_id)
            .first()
        )

    @staticmethod
    def _try_create_match(
        db: Session,
        req_a: MatchingRequest,
        req_b: MatchingRequest,
    ) -> tuple[Match | None, bool]:
        """
        Create a Match only if req_b has already LIKED req_a back.
        Uses a normalised (low, high) pair so a pair can never be matched twice.
        Returns (match, created_now).
        """
        if not MatchingService.has_liked(db, req_b.id, req_a.id):
            return None, False

        existing = MatchingService._find_match(db, req_a.id, req_b.id)
        if existing:
            return existing, False

        low_id, high_id = sorted([req_a.id, req_b.id], key=lambda x: str(x))
        if str(req_a.id) < str(req_b.id):
            student_a_id, student_b_id = req_a.student_id, req_b.student_id
        else:
            student_a_id, student_b_id = req_b.student_id, req_a.student_id

        match = Match(
            request_low_id=low_id,
            request_high_id=high_id,
            student_a_id=student_a_id,
            student_b_id=student_b_id,
            status=MatchStatus.PENDING_CONFIRMATION,
        )
        db.add(match)
        try:
            with db.begin_nested():
                db.flush()
        except IntegrityError:
            existing = MatchingService._find_match(db, req_a.id, req_b.id)
            return existing, False

        MatchingService._create_match_side_effects(db, match, req_a, req_b)
        return match, True

    @staticmethod
    def _create_match_side_effects(
        db: Session,
        match: Match,
        req_a: MatchingRequest,
        req_b: MatchingRequest,
    ) -> None:
        """Open the 1-1 conversation and notify both students (same transaction)."""
        conversation = Conversation(
            conversation_type=ConversationType.DIRECT,
            source_type=ConversationSourceType.CLASS_SWAP,
            source_id=match.id,
        )
        db.add(conversation)
        db.flush()
        for sid in {req_a.student_id, req_b.student_id}:
            db.add(ConversationMember(conversation_id=conversation.id, student_id=sid))

        for me, partner in ((req_a, req_b), (req_b, req_a)):
            view = match_view(db, match, me.student_id)
            _notify(
                db,
                me.student_id,
                f"Match mới cho môn {view.course_code or ''}!".strip(),
                f"Bạn và {display_name(db, partner.student_id)} đã cùng Like "
                f"({view.my_class_code} ⇄ {view.partner_class_code}). Hãy nhắn tin để thống nhất việc đổi lớp.",
                match.id,
            )

    # ── Match queries ────────────────────────────────────────────

    @staticmethod
    def list_matches(db: Session, student_id: uuid.UUID) -> list[Match]:
        return (
            db.query(Match)
            .filter(
                or_(Match.student_a_id == student_id, Match.student_b_id == student_id)
            )
            .order_by(Match.created_at.desc())
            .all()
        )

    @staticmethod
    def get_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = db.get(Match, match_id)
        if not match:
            raise HTTPException(404, "Match not found")
        if match.student_a_id != student_id and match.student_b_id != student_id:
            raise HTTPException(403, "Not your match")
        return match

    @staticmethod
    def partner_id(match: Match, student_id: uuid.UUID) -> uuid.UUID:
        return match.student_b_id if match.student_a_id == student_id else match.student_a_id

    @staticmethod
    def _set_request_statuses(db: Session, match: Match, new_status: SwapRequestStatus) -> None:
        for rid in (match.request_low_id, match.request_high_id):
            req = db.get(MatchingRequest, rid)
            if req is not None and req.status in (
                SwapRequestStatus.ACTIVE,
                SwapRequestStatus.MATCHED,
            ):
                req.status = new_status

    # ── Match state transitions ───────────────────────────────────

    @staticmethod
    def confirm_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status != MatchStatus.PENDING_CONFIRMATION:
            raise HTTPException(422, f"Match is {match.status.value}, cannot confirm")

        if match.student_a_id == student_id:
            match.student_a_confirmed = True
        else:
            match.student_b_confirmed = True

        partner = MatchingService.partner_id(match, student_id)
        me_name = display_name(db, student_id)

        if match.student_a_confirmed and match.student_b_confirmed:
            match.status = MatchStatus.CONFIRMED
            MatchingService._set_request_statuses(db, match, SwapRequestStatus.MATCHED)
            for sid in (student_id, partner):
                _notify(
                    db,
                    sid,
                    "Hai bên đã đồng thuận đổi lớp",
                    "Cả hai bạn đã xác nhận. Hãy thực hiện thủ tục đổi lớp chính thức theo "
                    "quy định của trường rồi bấm 'Đánh dấu hoàn tất'.",
                    match.id,
                )
        else:
            _notify(
                db,
                partner,
                f"{me_name} đã xác nhận đổi lớp",
                "Bạn hãy vào mục Matches để xác nhận nếu đồng ý.",
                match.id,
            )

        db.commit()
        db.refresh(match)
        return match

    @staticmethod
    def decline_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status not in {MatchStatus.PENDING_CONFIRMATION, MatchStatus.CONFIRMED}:
            raise HTTPException(422, f"Cannot decline match with status {match.status.value}")

        was_confirmed = match.status == MatchStatus.CONFIRMED
        match.status = MatchStatus.DECLINED
        if was_confirmed:
            # Re-open both requests so they can find other partners.
            for rid in (match.request_low_id, match.request_high_id):
                req = db.get(MatchingRequest, rid)
                if req is not None and req.status == SwapRequestStatus.MATCHED:
                    req.status = SwapRequestStatus.ACTIVE

        _notify(
            db,
            MatchingService.partner_id(match, student_id),
            f"{display_name(db, student_id)} đã từ chối đổi lớp",
            "Yêu cầu của bạn vẫn đang mở, bạn có thể tiếp tục tìm người khác trong Discover.",
            match.id,
        )
        db.commit()
        db.refresh(match)
        return match

    @staticmethod
    def complete_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status != MatchStatus.CONFIRMED:
            raise HTTPException(422, "Match must be CONFIRMED before completing")
        match.status = MatchStatus.COMPLETED
        MatchingService._set_request_statuses(db, match, SwapRequestStatus.COMPLETED)
        _notify(
            db,
            MatchingService.partner_id(match, student_id),
            "Đổi lớp đã hoàn tất",
            f"{display_name(db, student_id)} đã đánh dấu hoàn tất việc đổi lớp.",
            match.id,
        )
        db.commit()
        db.refresh(match)
        return match
