import uuid
from datetime import datetime, timedelta, timezone

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
from app.database.models.identity import Student, StudentBlock
from app.database.models.matching import Match, MatchReview, MatchingRequest, Swipe
from app.database.models.operations import Notification
from app.modules.matching.engine import is_compatible
from app.modules.matching.schemas import MatchReviewCreate, SwipeRequest, SwipeResponse
from app.modules.notifications.delivery import dispatch_out_of_app
from app.modules.views import display_name, match_view

MATCH_CONFIRM_DEADLINE_HOURS = 48
REQUEST_EXPIRING_REMINDER_HOURS = 48


def _notify(
    db: Session,
    student_id: uuid.UUID,
    title: str,
    body: str,
    reference_id: uuid.UUID | None,
    notification_type: NotificationType = NotificationType.MATCH,
) -> None:
    db.add(
        Notification(
            student_id=student_id,
            notification_type=notification_type,
            title=title,
            body=body,
            is_read=False,
            reference_id=reference_id,
        )
    )
    dispatch_out_of_app(db, student_id, title, body, kind=notification_type.value)


class MatchingService:
    # ── Expiration Sweep ────────────────────────────────────────

    @staticmethod
    def expire_stale_records(db: Session) -> None:
        """Transition past-deadline requests and unconfirmed matches to EXPIRED."""
        now = datetime.now(timezone.utc)
        changed = False

        overdue_requests = (
            db.query(MatchingRequest)
            .filter(
                MatchingRequest.status.in_(
                    [SwapRequestStatus.ACTIVE, SwapRequestStatus.PAUSED]
                ),
                MatchingRequest.expires_at.isnot(None),
                MatchingRequest.expires_at <= now,
            )
            .all()
        )
        for req in overdue_requests:
            req.status = SwapRequestStatus.EXPIRED
            changed = True

        overdue_matches = (
            db.query(Match)
            .filter(
                Match.status == MatchStatus.PENDING_CONFIRMATION,
                Match.confirm_deadline_at.isnot(None),
                Match.confirm_deadline_at <= now,
            )
            .all()
        )
        for match in overdue_matches:
            match.status = MatchStatus.EXPIRED
            changed = True
            for sid in (match.student_a_id, match.student_b_id):
                _notify(
                    db,
                    sid,
                    "Match đã hết hạn xác nhận",
                    "Quá 48 giờ nhưng hai bên chưa cùng xác nhận nên Match tự động hết hạn.",
                    match.id,
                    notification_type=NotificationType.SYSTEM,
                )

        # Remind active requests within 48h of deadline (once per request)
        reminder_cutoff = now + timedelta(hours=REQUEST_EXPIRING_REMINDER_HOURS)
        expiring_soon = (
            db.query(MatchingRequest)
            .filter(
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
                MatchingRequest.expires_at.isnot(None),
                MatchingRequest.expires_at > now,
                MatchingRequest.expires_at <= reminder_cutoff,
            )
            .all()
        )
        for req in expiring_soon:
            already_reminded = (
                db.query(Notification.id)
                .filter(
                    Notification.student_id == req.student_id,
                    Notification.reference_id == req.id,
                    Notification.title == "Yêu cầu đổi lớp sắp hết hạn",
                )
                .first()
                is not None
            )
            if not already_reminded:
                _notify(
                    db,
                    req.student_id,
                    "Yêu cầu đổi lớp sắp hết hạn",
                    "Yêu cầu đổi lớp của bạn sẽ hết hạn trong vòng 48 giờ tới. Hãy gia hạn nếu vẫn muốn tìm người đổi.",
                    req.id,
                    notification_type=NotificationType.SYSTEM,
                )
                changed = True

        if changed:
            db.commit()

    @staticmethod
    def _blocked_student_ids(db: Session, student_id: uuid.UUID) -> set[uuid.UUID]:
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
        blocked: set[uuid.UUID] = set()
        for blocker_id, blocked_id in rows:
            blocked.add(blocked_id if blocker_id == student_id else blocker_id)
        return blocked

    # ── Discover ────────────────────────────────────────────────

    @staticmethod
    def get_discover_candidates(
        db: Session,
        student_id: uuid.UUID,
        active_request: MatchingRequest,
        limit: int = 20,
    ) -> list[MatchingRequest]:
        MatchingService.expire_stale_records(db)
        blocked_ids = MatchingService._blocked_student_ids(db, student_id)
        swiped_ids = {
            row[0]
            for row in db.query(Swipe.target_request_id).filter(
                Swipe.swiper_request_id == active_request.id
            )
        }

        viewer = db.get(Student, student_id)
        now = datetime.now(timezone.utc)
        q = (
            db.query(MatchingRequest)
            .join(Student, Student.id == MatchingRequest.student_id)
            .join(AcademicClass, AcademicClass.id == MatchingRequest.current_class_id)
            .filter(
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
                MatchingRequest.student_id != student_id,
                MatchingRequest.course_id == active_request.course_id,
                MatchingRequest.semester_id == active_request.semester_id,
                MatchingRequest.current_class_id == active_request.target_class_id,
                MatchingRequest.target_class_id == active_request.current_class_id,
                or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
            )
        )
        if viewer is not None:
            q = q.filter(
                Student.campus_id == viewer.campus_id,
                AcademicClass.campus_id == viewer.campus_id,
            )
        if swiped_ids:
            q = q.filter(MatchingRequest.id.notin_(swiped_ids))
        if blocked_ids:
            q = q.filter(MatchingRequest.student_id.notin_(blocked_ids))
        return q.order_by(MatchingRequest.created_at.asc()).limit(limit).all()

    @staticmethod
    def list_campus_discover_requests(
        db: Session,
        student_id: uuid.UUID,
        campus_id: uuid.UUID,
        limit: int = 50,
    ) -> list[MatchingRequest]:
        """Return all ACTIVE, non-expired swap requests posted within the student's campus."""
        MatchingService.expire_stale_records(db)
        blocked_ids = MatchingService._blocked_student_ids(db, student_id)
        swiped_ids = {
            row[0]
            for row in db.query(Swipe.target_request_id).filter(
                Swipe.swiper_student_id == student_id
            )
        }
        now = datetime.now(timezone.utc)
        q = (
            db.query(MatchingRequest)
            .join(Student, Student.id == MatchingRequest.student_id)
            .join(AcademicClass, AcademicClass.id == MatchingRequest.current_class_id)
            .filter(
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
                MatchingRequest.student_id != student_id,
                Student.campus_id == campus_id,
                AcademicClass.campus_id == campus_id,
                or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
            )
        )
        if swiped_ids:
            q = q.filter(MatchingRequest.id.notin_(swiped_ids))
        if blocked_ids:
            q = q.filter(MatchingRequest.student_id.notin_(blocked_ids))
        return q.order_by(MatchingRequest.created_at.desc()).limit(limit).all()

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
        MatchingService.expire_stale_records(db)

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
        if target_req.student_id in MatchingService._blocked_student_ids(db, student_id):
            raise HTTPException(403, "Không thể tương tác vì người dùng đã bị chặn.")
        if target_req.status != SwapRequestStatus.ACTIVE:
            raise HTTPException(422, "Target request is no longer available")
        if not is_compatible(swiper_req, target_req):
            raise HTTPException(422, "Requests are not compatible")
        swiper_student = db.get(Student, swiper_req.student_id)
        target_student = db.get(Student, target_req.student_id)
        if (
            swiper_student is not None
            and target_student is not None
            and swiper_student.campus_id != target_student.campus_id
        ):
            raise HTTPException(422, "Chỉ có thể ghép đổi lớp trong cùng một campus.")

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
            if not created and match is None:
                _notify(
                    db,
                    target_req.student_id,
                    "Có sinh viên vừa Like yêu cầu của bạn!",
                    f"{display_name(db, student_id)} đã thích yêu cầu đổi lớp của bạn. Vào Discover để xem và phản hồi.",
                    target_req.id,
                    notification_type=NotificationType.MATCH,
                )

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
        if req_a.status != SwapRequestStatus.ACTIVE or req_b.status != SwapRequestStatus.ACTIVE:
            return None, False

        if not MatchingService.has_liked(db, req_b.id, req_a.id):
            return None, False

        existing = MatchingService._find_match(db, req_a.id, req_b.id)
        if existing:
            if existing.status == MatchStatus.CANCELLED:
                existing.status = MatchStatus.PENDING_CONFIRMATION
                existing.student_a_confirmed = False
                existing.student_b_confirmed = False
                existing.confirm_deadline_at = datetime.now(timezone.utc) + timedelta(
                    hours=MATCH_CONFIRM_DEADLINE_HOURS
                )
                db.flush()
                for me, partner in ((req_a, req_b), (req_b, req_a)):
                    view = match_view(db, existing, me.student_id)
                    _notify(
                        db,
                        me.student_id,
                        f"Match mới cho môn {view.course_code or ''}!".strip(),
                        f"Bạn và {display_name(db, partner.student_id)} đã cùng Like "
                        f"({view.my_class_code} ⇄ {view.partner_class_code}). Vui lòng xác nhận trong vòng 48 giờ.",
                        existing.id,
                    )
                return existing, True
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
            confirm_deadline_at=datetime.now(timezone.utc)
            + timedelta(hours=MATCH_CONFIRM_DEADLINE_HOURS),
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
                f"({view.my_class_code} ⇄ {view.partner_class_code}). Vui lòng xác nhận trong vòng 48 giờ.",
                match.id,
            )

    # ── Match queries ────────────────────────────────────────────

    @staticmethod
    def list_matches(db: Session, student_id: uuid.UUID) -> list[Match]:
        MatchingService.expire_stale_records(db)
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
        MatchingService.expire_stale_records(db)
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

    @staticmethod
    def _cancel_competing_matches(db: Session, confirmed_match: Match) -> None:
        """Cancel other pending matches touching either request once one match is confirmed."""
        req_ids = [confirmed_match.request_low_id, confirmed_match.request_high_id]
        competing = (
            db.query(Match)
            .filter(
                Match.id != confirmed_match.id,
                Match.status == MatchStatus.PENDING_CONFIRMATION,
                or_(
                    Match.request_low_id.in_(req_ids),
                    Match.request_high_id.in_(req_ids),
                ),
            )
            .all()
        )
        for other in competing:
            other.status = MatchStatus.CANCELLED
            for sid in (other.student_a_id, other.student_b_id):
                if sid not in (confirmed_match.student_a_id, confirmed_match.student_b_id):
                    _notify(
                        db,
                        sid,
                        "Match chờ đã tự động hủy",
                        "Đối tác đã chốt đổi lớp với sinh viên khác. Yêu cầu của bạn vẫn đang mở trên Discover.",
                        other.id,
                        notification_type=NotificationType.SYSTEM,
                    )

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
            MatchingService._cancel_competing_matches(db, match)
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
                "Bạn hãy vào mục Matches để xác nhận trong thời hạn 48 giờ nếu đồng ý.",
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

    @staticmethod
    def undo_last_swipe(db: Session, student_id: uuid.UUID) -> dict:
        last_swipe = (
            db.query(Swipe)
            .filter(Swipe.swiper_student_id == student_id)
            .order_by(Swipe.created_at.desc())
            .first()
        )
        if last_swipe is None:
            raise HTTPException(404, "Chưa có lượt vuốt nào để hoàn tác.")

        cancelled_match_id: uuid.UUID | None = None
        match = MatchingService._find_match(
            db, last_swipe.swiper_request_id, last_swipe.target_request_id
        )
        if match is not None:
            if match.status in (MatchStatus.CONFIRMED, MatchStatus.COMPLETED):
                raise HTTPException(422, "Match đã được chốt, không thể hoàn tác lượt vuốt.")
            if match.status == MatchStatus.PENDING_CONFIRMATION:
                match.status = MatchStatus.CANCELLED
                cancelled_match_id = match.id
                partner_id = MatchingService.partner_id(match, student_id)
                _notify(
                    db,
                    partner_id,
                    "Match chờ đã bị hủy do hoàn tác",
                    f"{display_name(db, student_id)} đã hoàn tác lượt vuốt trước đó.",
                    match.id,
                    notification_type=NotificationType.SYSTEM,
                )

        undone_id = last_swipe.id
        target_req_id = last_swipe.target_request_id
        db.delete(last_swipe)
        db.commit()
        return {
            "undone_swipe_id": undone_id,
            "target_request_id": target_req_id,
            "cancelled_match_id": cancelled_match_id,
        }

    @staticmethod
    def review_match(
        db: Session,
        match_id: uuid.UUID,
        student_id: uuid.UUID,
        data: MatchReviewCreate,
    ) -> MatchReview:
        match = MatchingService.get_match(db, match_id, student_id)
        if match.status not in (MatchStatus.CONFIRMED, MatchStatus.COMPLETED):
            raise HTTPException(
                422, "Chỉ có thể đánh giá sau khi hai bên đã xác nhận hoặc hoàn tất đổi lớp."
            )

        already = (
            db.query(MatchReview.id)
            .filter(
                MatchReview.match_id == match.id,
                MatchReview.reviewer_id == student_id,
            )
            .first()
        )
        if already is not None:
            raise HTTPException(409, "Bạn đã đánh giá đối tác cho Match này rồi.")

        partner_id = MatchingService.partner_id(match, student_id)
        review = MatchReview(
            match_id=match.id,
            reviewer_id=student_id,
            reviewee_id=partner_id,
            rating=data.rating,
            outcome=data.outcome,
            comment=data.comment.strip() if data.comment else None,
        )
        db.add(review)
        db.flush()

        # Recompute partner reputation metrics
        all_reviews = (
            db.query(MatchReview)
            .filter(MatchReview.reviewee_id == partner_id)
            .all()
        )
        partner = db.get(Student, partner_id)
        if partner and partner.profile and all_reviews:
            avg_rating = sum(r.rating for r in all_reviews) / len(all_reviews)
            partner.profile.trust_score = round(max(1.0, min(5.0, avg_rating)), 2)
            partner.profile.completed_swaps_count = sum(
                1 for r in all_reviews if r.outcome == "SUCCESS"
            )
            partner.profile.no_show_count = sum(
                1 for r in all_reviews if r.outcome == "NO_SHOW"
            )

        _notify(
            db,
            partner_id,
            "Bạn nhận được đánh giá đổi lớp",
            (
                f"{display_name(db, student_id)} đã đánh giá {data.rating}★"
                + (" (Báo bỏ hẹn)" if data.outcome == "NO_SHOW" else " (Đổi thành công)")
            ),
            match.id,
            notification_type=NotificationType.SYSTEM,
        )
        db.commit()
        db.refresh(review)
        return review
