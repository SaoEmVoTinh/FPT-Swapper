import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app.common.enums import SwapRequestStatus
from app.core.dependencies import get_current_student
from app.database.models import Student
from app.database.session import get_db
from app.modules.students.schemas import (
    AccountDataExportResponse,
    AccountSummaryResponse,
    AccountUpdateRequest,
    BlockedStudentItem,
    BlockStudentRequest,
    BulkRequestsActionResponse,
    ChangePasswordRequest,
    DeleteAccountRequest,
    IdentityCorrectionRequest,
    IdentityCorrectionResponse,
    ProfileResponse,
    ProfileUpdateRequest,
)
from app.modules.students.service import StudentService

router = APIRouter(prefix="/students", tags=["Students"])


def _profile_to_response(profile, campus_id: uuid.UUID | None = None) -> ProfileResponse:
    return ProfileResponse(
        id=profile.id,
        student_id=profile.student_id,
        full_name=profile.full_name,
        major=profile.major,
        class_name=profile.class_name,
        campus_id=campus_id,
        avatar_url=profile.avatar_url,
        bio=profile.bio,
        share_contact_after_match=bool(profile.share_contact_after_match),
        share_email_after_match=bool(profile.share_email_after_match),
        share_student_code_after_match=bool(profile.share_student_code_after_match),
        trust_score=float(profile.trust_score),
        completed_swaps_count=int(profile.completed_swaps_count),
        no_show_count=int(profile.no_show_count),
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
    return _profile_to_response(profile, student.campus_id)


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
            campus_id=payload.campus_id,
            share_contact_after_match=payload.share_contact_after_match,
            share_email_after_match=payload.share_email_after_match,
            share_student_code_after_match=payload.share_student_code_after_match,
            class_name=payload.class_name,
            update_class_name="class_name" in payload.model_fields_set,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    db.refresh(student)
    return _profile_to_response(profile, student.campus_id)


@router.get("/me/summary", response_model=AccountSummaryResponse)
def get_my_account_summary(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> AccountSummaryResponse:
    return StudentService(db).get_account_summary(student)


@router.patch("/me/account", response_model=AccountSummaryResponse)
def update_my_account_identity(
    payload: AccountUpdateRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> AccountSummaryResponse:
    return StudentService(db).update_account_identity(
        student=student,
        email=payload.email,
        student_code=payload.student_code,
    )


@router.post("/me/identity-correction-request", response_model=IdentityCorrectionResponse, status_code=status.HTTP_201_CREATED)
def request_identity_correction(
    payload: IdentityCorrectionRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> IdentityCorrectionResponse:
    return StudentService(db).request_identity_correction(
        student=student,
        requested_email=payload.requested_email,
        requested_student_code=payload.requested_student_code,
        reason=payload.reason,
    )


@router.post("/me/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_my_password(
    payload: ChangePasswordRequest,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> None:
    StudentService(db).change_password(
        student=student,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )


@router.post("/me/requests/pause-all", response_model=BulkRequestsActionResponse)
def pause_all_my_requests(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> BulkRequestsActionResponse:
    return StudentService(db).bulk_toggle_requests(
        student=student,
        from_status=SwapRequestStatus.ACTIVE,
        to_status=SwapRequestStatus.PAUSED,
    )


@router.post("/me/requests/resume-all", response_model=BulkRequestsActionResponse)
def resume_all_my_requests(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> BulkRequestsActionResponse:
    return StudentService(db).bulk_toggle_requests(
        student=student,
        from_status=SwapRequestStatus.PAUSED,
        to_status=SwapRequestStatus.ACTIVE,
    )


@router.get("/me/export", response_model=AccountDataExportResponse)
def export_my_account_data(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> AccountDataExportResponse:
    return StudentService(db).export_my_data(student)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_account(
    response: Response,
    payload: DeleteAccountRequest = Body(...),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> None:
    StudentService(db).delete_own_account(student=student, password=payload.password)
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/v1/auth/refresh")


@router.get("/me/blocks", response_model=list[BlockedStudentItem])
def list_my_blocks(
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> list[BlockedStudentItem]:
    return StudentService(db).list_blocks(student.id)


@router.post("/me/blocks/{target_student_id}", response_model=BlockedStudentItem)
def block_student(
    target_student_id: uuid.UUID,
    payload: BlockStudentRequest = Body(default_factory=BlockStudentRequest),
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> BlockedStudentItem:
    return StudentService(db).block_student(student.id, target_student_id, payload.reason)


@router.delete("/me/blocks/{target_student_id}", status_code=status.HTTP_204_NO_CONTENT)
def unblock_student(
    target_student_id: uuid.UUID,
    student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
) -> None:
    StudentService(db).unblock_student(student.id, target_student_id)


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
    target_student = db.get(Student, student_id)
    return _profile_to_response(profile, target_student.campus_id if target_student else None)
