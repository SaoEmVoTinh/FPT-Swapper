import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_super_admin
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.admin.schemas import (
    AdminAuditLogItem,
    AdminCreateUserRequest,
    AdminOverviewResponse,
    AdminRequestItem,
    AdminResetPasswordRequest,
    AdminUpdateStatusRequest,
    AdminUserItem,
)
from app.modules.admin.service import AdminService

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_super_admin)],
)


@router.get("/overview", response_model=AdminOverviewResponse)
def get_overview(db: Session = Depends(get_db)) -> AdminOverviewResponse:
    return AdminService.overview(db)


@router.get("/users", response_model=list[AdminUserItem])
def list_users(
    q: str | None = Query(None, description="Search by email, student code, name, or major"),
    db: Session = Depends(get_db),
) -> list[AdminUserItem]:
    return AdminService.list_users(db, q)


@router.post("/users", response_model=AdminUserItem, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: AdminCreateUserRequest,
    admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> AdminUserItem:
    return AdminService.create_user(db, admin.id, payload)


@router.patch("/users/{student_id}/status", response_model=AdminUserItem)
def update_user_status(
    student_id: uuid.UUID,
    payload: AdminUpdateStatusRequest,
    admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> AdminUserItem:
    return AdminService.update_user_status(db, admin.id, student_id, payload.status)


@router.post("/users/{student_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password(
    student_id: uuid.UUID,
    payload: AdminResetPasswordRequest,
    admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> None:
    AdminService.reset_user_password(db, admin.id, student_id, payload.new_password)


@router.delete("/users/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    student_id: uuid.UUID,
    admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> None:
    AdminService.delete_user(db, admin.id, student_id)


@router.get("/requests", response_model=list[AdminRequestItem])
def list_requests(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AdminRequestItem]:
    return AdminService.list_requests(db, limit)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: uuid.UUID,
    admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> None:
    AdminService.delete_request(db, admin.id, request_id)


@router.get("/audit-logs", response_model=list[AdminAuditLogItem])
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AdminAuditLogItem]:
    return AdminService.list_audit_logs(db, limit)
