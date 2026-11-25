import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.dependencies import (
    get_current_admin,
    get_current_staff,
    get_current_super_admin,
)
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.admin.schemas import (
    AdminAuditLogItem,
    AdminCreateUserRequest,
    AdminOverviewResponse,
    AdminRequestItem,
    AdminResetPasswordRequest,
    AdminUpdateRoleRequest,
    AdminUpdateStatusRequest,
    AdminUserItem,
)
from app.modules.admin.service import AdminService

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    dependencies=[Depends(get_current_staff)],
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
    admin: Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> AdminUserItem:
    return AdminService.create_user(db, admin, payload)


@router.patch("/users/{student_id}/status", response_model=AdminUserItem)
def update_user_status(
    student_id: uuid.UUID,
    payload: AdminUpdateStatusRequest,
    actor: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> AdminUserItem:
    return AdminService.update_user_status(db, actor, student_id, payload.status)


@router.patch("/users/{student_id}/role", response_model=AdminUserItem)
def update_user_role(
    student_id: uuid.UUID,
    payload: AdminUpdateRoleRequest,
    super_admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> AdminUserItem:
    return AdminService.update_user_role(db, super_admin, student_id, payload.role)


@router.post("/users/{student_id}/reset-password", status_code=status.HTTP_204_NO_CONTENT)
def reset_user_password(
    student_id: uuid.UUID,
    payload: AdminResetPasswordRequest,
    admin: Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> None:
    AdminService.reset_user_password(db, admin, student_id, payload.new_password)


@router.post("/users/purge-expired")
def purge_expired_accounts(
    super_admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    purged = AdminService.purge_expired_accounts(db, super_admin.id)
    return {"purged_count": purged}


@router.delete("/users/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    student_id: uuid.UUID,
    super_admin: Student = Depends(get_current_super_admin),
    db: Session = Depends(get_db),
) -> None:
    AdminService.delete_user(db, super_admin.id, student_id)


@router.get("/requests", response_model=list[AdminRequestItem])
def list_requests(
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AdminRequestItem]:
    return AdminService.list_requests(db, limit)


@router.delete("/requests/{request_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_request(
    request_id: uuid.UUID,
    staff: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> None:
    AdminService.delete_request(db, staff.id, request_id)


@router.get("/audit-logs", response_model=list[AdminAuditLogItem])
def list_audit_logs(
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> list[AdminAuditLogItem]:
    return AdminService.list_audit_logs(db, limit)
