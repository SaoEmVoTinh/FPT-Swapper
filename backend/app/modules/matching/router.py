import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.models.matching import Match
from app.database.session import get_db
from app.modules.class_swap.service import ClassSwapService
from app.modules.matching.cycles import (
    accept_three_way_cycle,
    decline_three_way_cycle,
    list_three_way_cycles,
)
from app.modules.matching.engine import is_compatible
from app.modules.matching.insights import build_swap_insights
from app.modules.matching.schemas import (
    DiscoverItem,
    MatchResponse,
    MatchReviewCreate,
    MatchReviewResponse,
    SwapInsightsResponse,
    SwipeRequest,
    SwipeResponse,
    ThreeWayAcceptRequest,
    ThreeWayCycleItem,
    UndoSwipeResponse,
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
        description="Limit to compatible candidates for one specific swap request. Omit to browse all ACTIVE posts in your campus.",
    ),
    limit: int = Query(50, ge=1, le=100),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    if request_id is not None:
        mine = ClassSwapService.get_owned(db, request_id, current_student.id)
        items = [
            discover_view(
                db,
                candidate,
                mine,
                MatchingService.has_liked(db, candidate.id, mine.id),
                viewer_id=current_student.id,
            )
            for candidate in MatchingService.get_discover_candidates(
                db, current_student.id, mine, limit
            )
        ]
        items.sort(key=lambda item: not item.is_reciprocal_ready)
        return items[:limit]

    my_requests = MatchingService.list_my_active_requests(db, current_student.id)
    busy_pairs = MatchingService.list_busy_course_semesters(db, current_student.id)
    campus_posts = MatchingService.list_campus_discover_requests(
        db, current_student.id, current_student.campus_id, limit
    )

    items: list[DiscoverItem] = []
    for candidate in campus_posts:
        compatible_mine = next(
            (m for m in my_requests if is_compatible(m, candidate)),
            None,
        )
        reciprocal = (
            MatchingService.has_liked(db, candidate.id, compatible_mine.id)
            if compatible_mine is not None
            else False
        )
        conflict = (
            compatible_mine is None
            and (candidate.course_id, candidate.semester_id) in busy_pairs
        )
        items.append(
            discover_view(
                db,
                candidate,
                compatible_mine,
                reciprocal,
                has_course_conflict=conflict,
                viewer_id=current_student.id,
            )
        )

    # Order: 1) already liked you, 2) compatible with your request, 3) all other campus posts
    items.sort(key=lambda item: (not item.is_reciprocal_ready, not item.is_compatible))
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


@router.post("/swipes/undo", response_model=UndoSwipeResponse)
def undo_last_swipe(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.undo_last_swipe(db, current_student.id)


@router.post("/matches/{match_id}/review", response_model=MatchReviewResponse)
def review_match(
    match_id: uuid.UUID,
    data: MatchReviewCreate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return MatchingService.review_match(db, match_id, current_student.id, data)


@router.get("/cycles", response_model=list[ThreeWayCycleItem])
def list_cycles(
    limit: int = Query(20, ge=1, le=50),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return list_three_way_cycles(db, current_student.id, current_student.campus_id, limit)


@router.post("/cycles/accept", response_model=ThreeWayCycleItem)
def accept_cycle(
    data: ThreeWayAcceptRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return accept_three_way_cycle(
        db, current_student.id, data.req_a_id, data.req_b_id, data.req_c_id
    )


@router.post("/cycles/{proposal_id}/decline", response_model=ThreeWayCycleItem)
def decline_cycle(
    proposal_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return decline_three_way_cycle(db, proposal_id, current_student.id)


@router.get("/insights", response_model=SwapInsightsResponse)
def get_swap_insights(
    limit: int = Query(8, ge=1, le=20),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return build_swap_insights(db, current_student.id, current_student.campus_id, limit=limit)
