import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.common.enums import MatchStatus, SwapRequestStatus, SwipeAction


class SwipeRequest(BaseModel):
    swiper_request_id: uuid.UUID
    target_request_id: uuid.UUID
    action: SwipeAction


class MatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    request_low_id: uuid.UUID
    request_high_id: uuid.UUID
    student_a_id: uuid.UUID
    student_b_id: uuid.UUID
    status: MatchStatus
    student_a_confirmed: bool
    student_b_confirmed: bool
    created_at: datetime
    updated_at: datetime
    # Viewer-relative display fields (filled by views.match_view)
    my_request_id: uuid.UUID | None = None
    partner_request_id: uuid.UUID | None = None
    partner_name: str | None = None
    partner_campus: str | None = None
    course_code: str | None = None
    course_name: str | None = None
    semester_name: str | None = None
    my_class_code: str | None = None
    partner_class_code: str | None = None
    my_confirmed: bool = False
    partner_confirmed: bool = False
    conversation_id: uuid.UUID | None = None
    confirm_deadline_at: datetime | None = None
    partner_email: str | None = None
    partner_student_code: str | None = None
    partner_trust_score: float = 5.0
    partner_completed_swaps: int = 0
    partner_no_shows: int = 0
    my_review_submitted: bool = False
    schedule_conflict_warning: str | None = None


class SwipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    swiper_request_id: uuid.UUID
    target_request_id: uuid.UUID
    action: SwipeAction
    created_at: datetime
    # whether a match exists as a result of this swipe
    match_id: uuid.UUID | None = None
    match_created: bool = False
    match: MatchResponse | None = None


class DiscoverItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    semester_id: uuid.UUID
    course_id: uuid.UUID
    current_class_id: uuid.UUID
    target_class_id: uuid.UUID | None = None
    note: str | None
    status: SwapRequestStatus
    # Enriched display fields (filled by views.discover_view)
    for_request_id: uuid.UUID | None = None
    is_compatible: bool = False
    is_same_course: bool = False
    has_course_conflict: bool = False
    campus_id: uuid.UUID | None = None
    student_display_name: str | None = None
    student_code_masked: str | None = None
    student_class_name: str | None = None
    major: str | None = None
    campus_name: str | None = None
    semester_name: str | None = None
    course_code: str | None = None
    course_name: str | None = None
    current_class_code: str | None = None
    current_schedule_text: str | None = None
    target_class_code: str | None = None
    target_schedule_text: str | None = None
    lecturer_current: str | None = None
    is_reciprocal_ready: bool = False
    schedule_conflict_warning: str | None = None
    student_trust_score: float = 5.0
    student_completed_swaps: int = 0


class UndoSwipeResponse(BaseModel):
    undone_swipe_id: uuid.UUID
    target_request_id: uuid.UUID
    cancelled_match_id: uuid.UUID | None = None


class MatchReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    outcome: Literal["SUCCESS", "NO_SHOW"] = "SUCCESS"
    comment: str | None = Field(default=None, max_length=500)


class MatchReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    match_id: uuid.UUID
    reviewer_id: uuid.UUID
    reviewee_id: uuid.UUID
    rating: int
    outcome: str
    comment: str | None = None
    created_at: datetime


class ThreeWayParticipantItem(BaseModel):
    request_id: uuid.UUID
    student_id: uuid.UUID
    student_name: str
    student_code_masked: str
    current_class_code: str
    target_class_code: str = ""
    accepted: bool = False


class ThreeWayCycleItem(BaseModel):
    proposal_id: uuid.UUID | None = None
    course_code: str | None = None
    course_name: str | None = None
    semester_name: str | None = None
    status: str
    my_accepted: bool = False
    conversation_id: uuid.UUID | None = None
    req_a_id: uuid.UUID
    req_b_id: uuid.UUID
    req_c_id: uuid.UUID
    participants: list[ThreeWayParticipantItem]


class ThreeWayAcceptRequest(BaseModel):
    req_a_id: uuid.UUID
    req_b_id: uuid.UUID
    req_c_id: uuid.UUID


class SmartRecommendationItem(BaseModel):
    request_id: uuid.UUID
    for_request_id: uuid.UUID | None = None
    course_code: str
    course_name: str
    current_class_code: str
    target_class_code: str = ""
    current_schedule_text: str
    partner_name: str
    trust_score: float = 5.0
    is_compatible: bool = False
    is_reciprocal_ready: bool = False
    schedule_conflict_warning: str | None = None
    score: int
    reasons: list[str] = []


class ClassHeatmapItem(BaseModel):
    class_id: uuid.UUID
    course_code: str
    course_name: str
    class_code: str
    semester_name: str
    schedule_text: str
    leaving_count: int
    entering_count: int
    net_demand: int
    total_activity: int
    heat_level: Literal["HIGH", "MEDIUM", "LOW"]


class SwapInsightsResponse(BaseModel):
    recommendations: list[SmartRecommendationItem]
    heatmap: list[ClassHeatmapItem]
