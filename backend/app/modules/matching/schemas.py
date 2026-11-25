import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

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
    course_id: uuid.UUID
    current_class_id: uuid.UUID
    target_class_id: uuid.UUID
    note: str | None
    status: SwapRequestStatus
    # Enriched display fields (filled by views.discover_view)
    for_request_id: uuid.UUID | None = None
    student_display_name: str | None = None
    student_code_masked: str | None = None
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
