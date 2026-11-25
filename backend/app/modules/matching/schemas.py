import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.common.enums import MatchStatus, SwapRequestStatus, SwipeAction


class SwipeRequest(BaseModel):
    swiper_request_id: uuid.UUID
    target_request_id: uuid.UUID
    action: SwipeAction


class SwipeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    swiper_request_id: uuid.UUID
    target_request_id: uuid.UUID
    action: SwipeAction
    created_at: datetime
    # whether a match was created as a result
    match_id: uuid.UUID | None = None


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


class DiscoverItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    student_id: uuid.UUID
    course_id: uuid.UUID
    current_class_id: uuid.UUID
    target_class_id: uuid.UUID
    note: str | None
    status: SwapRequestStatus
