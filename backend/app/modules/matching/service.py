import uuid

from fastapi import HTTPException, status
from sqlalchemy import and_, or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.common.enums import MatchStatus, SwapRequestStatus, SwipeAction
from app.database.models.matching import Match, MatchingRequest, Swipe
from app.modules.matching.engine import is_compatible
from app.modules.matching.schemas import SwipeRequest, SwipeResponse


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
          - match the compatibility rule
          - haven't been swiped by this request yet
        """
        # IDs already swiped by this request
        swiped_ids = {
            row[0]
            for row in db.query(Swipe.target_request_id).filter(
                Swipe.swiper_request_id == active_request.id
            )
        }

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
            )
            .limit(limit)
            .all()
        )

        return [c for c in candidates if c.id not in swiped_ids]

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
        if not is_compatible(swiper_req, target_req):
            raise HTTPException(422, "Requests are not compatible")

        # Idempotency: return existing swipe if already swiped
        existing_swipe = (
            db.query(Swipe)
            .filter(
                Swipe.swiper_request_id == data.swiper_request_id,
                Swipe.target_request_id == data.target_request_id,
            )
            .first()
        )
        if existing_swipe:
            return SwipeResponse(
                id=existing_swipe.id,
                swiper_request_id=existing_swipe.swiper_request_id,
                target_request_id=existing_swipe.target_request_id,
                action=existing_swipe.action,
                created_at=existing_swipe.created_at,
                match_id=None,
            )

        swipe = Swipe(
            swiper_request_id=data.swiper_request_id,
            target_request_id=data.target_request_id,
            swiper_student_id=student_id,
            action=data.action,
        )
        db.add(swipe)
        db.flush()

        match_id: uuid.UUID | None = None

        if data.action == SwipeAction.LIKE:
            match_id = MatchingService._try_create_match(
                db, swiper_req, target_req
            )

        db.commit()
        db.refresh(swipe)

        return SwipeResponse(
            id=swipe.id,
            swiper_request_id=swipe.swiper_request_id,
            target_request_id=swipe.target_request_id,
            action=swipe.action,
            created_at=swipe.created_at,
            match_id=match_id,
        )

    # ── Match creation ───────────────────────────────────────────

    @staticmethod
    def _try_create_match(
        db: Session,
        req_a: MatchingRequest,
        req_b: MatchingRequest,
    ) -> uuid.UUID | None:
        """
        Create a Match only if req_b has already LIKED req_a back.
        Uses normalised (low, high) pair to avoid duplicates.
        """
        # Check mutual like
        mutual = (
            db.query(Swipe)
            .filter(
                Swipe.swiper_request_id == req_b.id,
                Swipe.target_request_id == req_a.id,
                Swipe.action == SwipeAction.LIKE,
            )
            .first()
        )
        if not mutual:
            return None

        # Existing match?
        low_id, high_id = sorted([req_a.id, req_b.id], key=lambda x: str(x))
        existing = (
            db.query(Match)
            .filter(Match.request_low_id == low_id, Match.request_high_id == high_id)
            .first()
        )
        if existing:
            return existing.id

        # Determine student_a / student_b (consistent with low/high)
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
            db.flush()
        except IntegrityError:
            db.rollback()
            existing = (
                db.query(Match)
                .filter(Match.request_low_id == low_id, Match.request_high_id == high_id)
                .first()
            )
            return existing.id if existing else None

        return match.id

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

    # ── Match state transitions ───────────────────────────────────

    @staticmethod
    def confirm_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status != MatchStatus.PENDING_CONFIRMATION:
            raise HTTPException(422, f"Match is {match.status}, cannot confirm")

        if match.student_a_id == student_id:
            match.student_a_confirmed = True
        else:
            match.student_b_confirmed = True

        if match.student_a_confirmed and match.student_b_confirmed:
            match.status = MatchStatus.CONFIRMED

        db.commit()
        db.refresh(match)
        return match

    @staticmethod
    def decline_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status not in {MatchStatus.PENDING_CONFIRMATION, MatchStatus.CONFIRMED}:
            raise HTTPException(422, f"Cannot decline match with status {match.status}")
        match.status = MatchStatus.DECLINED
        db.commit()
        db.refresh(match)
        return match

    @staticmethod
    def complete_match(db: Session, match_id: uuid.UUID, student_id: uuid.UUID) -> Match:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status != MatchStatus.CONFIRMED:
            raise HTTPException(422, "Match must be CONFIRMED before completing")
        match.status = MatchStatus.COMPLETED
        db.commit()
        db.refresh(match)
        return match
