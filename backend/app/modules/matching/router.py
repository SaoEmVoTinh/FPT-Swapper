import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.models.matching import Match
from app.database.session import get_db
from app.modules.class_swap.service import ClassSwapService
from app.modules.matching.schemas import (
    DiscoverItem,
    MatchResponse,
    SwipeRequest,
    SwipeResponse,
)
from app.modules.matching.service import MatchingService
from app.modules.realtime.hub import realtime_hub
from app.modules.views import discover_view, match_view

router = APIRouter(prefix="/class-swap", tags=["Matching"])


def _emit_match_event(match: Match, event_type: str = "match.updated") -> None:
    """Tell both students' open browsers to refresh their matches/notifications."""
    realtime_hub.emit_from_sync(
        [match.student_a_id, match.student_b_id],
        {"type": event_type, "data": {"match_id": str(match.id), "status": match.status.value}},
    )


@router.get("/discover", response_model=list[DiscoverItem])
def discover(
    request_id: uuid.UUID | None = Query(
        None,
        description="Limit to one of your swap requests. Omit to discover for all your ACTIVE requests.",
    ),
    limit: int = Query(20, ge=1, le=50),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if request_id is not None:
        my_requests = [ClassSwapService.get_owned(db, request_id, current_student.id)]
    else:
        my_requests = MatchingService.list_my_active_requests(db, current_student.id)

    items: list[DiscoverItem] = []
    for mine in my_requests:
        for candidate in MatchingService.get_discover_candidates(
            db, current_student.id, mine, limit
        ):
            reciprocal = MatchingService.has_liked(db, candidate.id, mine.id)
            items.append(discover_view(db, candidate, mine, reciprocal))

    # Candidates who already liked you first (guaranteed matches), then the rest.
    items.sort(key=lambda item: not item.is_reciprocal_ready)
    return items[:limit]


@router.post("/swipes", response_model=SwipeResponse)
def record_swipe(
    data: SwipeRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    result = MatchingService.swipe(db, current_student.id, data)
    if result.match_created and result.match_id:
        match = db.get(Match, result.match_id)
        if match is not None:
            _emit_match_event(match, "match.created")
    return result


@router.get("/matches", response_model=list[MatchResponse])
def list_matches(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return [
        match_view(db, m, current_student.id)
        for m in MatchingService.list_matches(db, current_student.id)
    ]


@router.get("/matches/{match_id}", response_model=MatchResponse)
def get_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    match = MatchingService.get_match(db, match_id, current_student.id)
    return match_view(db, match, current_student.id)


@router.post("/matches/{match_id}/confirm", response_model=MatchResponse)
def confirm_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    match = MatchingService.confirm_match(db, match_id, current_student.id)
    _emit_match_event(match)
    return match_view(db, match, current_student.id)


@router.post("/matches/{match_id}/decline", response_model=MatchResponse)
def decline_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    match = MatchingService.decline_match(db, match_id, current_student.id)
    _emit_match_event(match)
    return match_view(db, match, current_student.id)


@router.post("/matches/{match_id}/complete", response_model=MatchResponse)
def complete_match(
    match_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    match = MatchingService.complete_match(db, match_id, current_student.id)
    _emit_match_event(match)
    return match_view(db, match, current_student.id)
