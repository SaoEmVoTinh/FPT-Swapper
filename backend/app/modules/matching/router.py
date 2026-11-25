import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.matching.schemas import (
    DiscoverItem,
    MatchResponse,
    SwipeRequest,
    SwipeResponse,
)
from app.modules.matching.service import MatchingService
from app.modules.class_swap.service import ClassSwapService

router = APIRouter(prefix="/class-swap", tags=["Matching"])


@router.get("/discover", response_model=list[DiscoverItem])
def discover(
    request_id: uuid.UUID = Query(..., description="Your active swap request ID"),
    limit: int = Query(20, ge=1, le=50),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    active_req = ClassSwapService.get_owned(db, request_id, current_student.id)
    return MatchingService.get_discover_candidates(db, current_student.id, active_req, limit)


@router.post("/swipes", response_model=SwipeResponse)
def record_swipe(
    data: SwipeRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.swipe(db, current_student.id, data)


@router.get("/matches", response_model=list[MatchResponse])
def list_matches(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.list_matches(db, current_student.id)


@router.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.get_match(db, match_id, current_student.id)


@router.post("/matches/{match_id}/confirm", response_model=MatchResponse)
def confirm_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.confirm_match(db, match_id, current_student.id)


@router.post("/matches/{match_id}/decline", response_model=MatchResponse)
def decline_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.decline_match(db, match_id, current_student.id)


@router.post("/matches/{match_id}/complete", response_model=MatchResponse)
def complete_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.complete_match(db, match_id, current_student.id)
