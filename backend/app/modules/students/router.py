import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models import Student
from app.database.session import get_db
from app.modules.students.schemas import ProfileResponse, ProfileUpdateRequest
from app.modules.students.service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


def _profile_to_response(profile) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        student_id=profile.student_id,
        full_name=profile.full_name,
        major=profile.major,
        avatar_url=profile.avatar_url,
        bio=profile.bio,
    )


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    svc = StudentService(db)
    profile = svc.get_profile(student.id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return _profile_to_response(profile)


@router.put("/me", response_model=ProfileResponse)
def update_my_profile(
    payload: ProfileUpdateRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    svc = StudentService(db)
    try:
        profile = svc.update_profile(
            student_id=student.id,
            full_name=payload.full_name,
            major=payload.major,
            avatar_url=payload.avatar_url,
            bio=payload.bio,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    return _profile_to_response(profile)


@router.get("/{student_id}", response_model=ProfileResponse)
def get_student_profile(
    student_id: uuid.UUID,
    _current: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> ProfileResponse:
    svc = StudentService(db)
    profile = svc.get_profile(student_id)
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile not found.")
    return _profile_to_response(profile)
