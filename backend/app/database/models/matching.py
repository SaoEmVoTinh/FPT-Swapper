import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.common.enums import MatchStatus, SwapRequestStatus, SwipeAction
from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class MatchingRequest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "matching_requests"
    __table_args__ = (
        CheckConstraint(
            "target_class_id IS NULL OR current_class_id <> target_class_id",
            name="ck_matching_requests_diff_classes",
        ),
    )

    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    current_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    target_class_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[SwapRequestStatus] = mapped_column(
        SAEnum(SwapRequestStatus, name="swap_request_status"),
        default=SwapRequestStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    preferences: Mapped[list["ClassExchangePreference"]] = relationship(
        back_populates="request",
        cascade="all, delete-orphan",
    )


class ClassExchangePreference(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "class_exchange_preferences"
    __table_args__ = (
        UniqueConstraint("request_id", "target_class_id", name="uq_preferences_request_target"),
    )

    request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matching_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_class_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("classes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)

    request: Mapped["MatchingRequest"] = relationship(back_populates="preferences")


class Swipe(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "swipes"
    __table_args__ = (
        UniqueConstraint("swiper_request_id", "target_request_id", name="uq_swipes_request_pair"),
        CheckConstraint("swiper_request_id <> target_request_id", name="ck_swipes_diff_requests"),
    )

    swiper_request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matching_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    target_request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matching_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    swiper_student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    action: Mapped[SwipeAction] = mapped_column(
        SAEnum(SwipeAction, name="swipe_action"),
        nullable=False,
    )


class Match(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("request_low_id", "request_high_id", name="uq_matches_request_pair"),
        CheckConstraint("request_low_id < request_high_id", name="ck_matches_ordered_pair"),
    )

    request_low_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matching_requests.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    request_high_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matching_requests.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    student_a_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    student_b_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    status: Mapped[MatchStatus] = mapped_column(
        SAEnum(MatchStatus, name="match_status"),
        default=MatchStatus.PENDING_CONFIRMATION,
        nullable=False,
        index=True,
    )
    student_a_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    student_b_confirmed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    confirm_deadline_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class MatchReview(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "match_reviews"
    __table_args__ = (
        UniqueConstraint("match_id", "reviewer_id", name="uq_match_reviews_pair"),
    )

    match_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("matches.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reviewee_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("students.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(String(24), default="SUCCESS", nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)


class ThreeWaySwapProposal(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "three_way_swap_proposals"

    course_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("courses.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    semester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("semesters.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    req_a_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("matching_requests.id", ondelete="CASCADE"), nullable=False
    )
    req_b_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("matching_requests.id", ondelete="CASCADE"), nullable=False
    )
    req_c_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("matching_requests.id", ondelete="CASCADE"), nullable=False
    )
    student_a_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_b_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_c_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    a_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    b_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    c_accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    status: Mapped[SAEnum] = mapped_column(
        SAEnum(MatchStatus, name="match_status"),
        default=MatchStatus.PENDING_CONFIRMATION,
        nullable=False,
    )


