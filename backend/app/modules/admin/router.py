import uuid

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.common.enums import ReportStatus
from app.core.dependencies import (
    get_current_admin,
    get_current_staff,
    get_current_super_admin,
)
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.admin.operations_p2 import (
    broadcast_system_announcement,
    build_admin_analytics,
    bulk_delete_requests,
    bulk_update_user_status,
    export_admin_csv,
    import_timetable_rows,
)
from app.modules.admin.schemas import (
    AdminAuditLogItem,
    AdminBroadcastRequest,
    AdminBulkDeleteRequestsRequest,
    AdminBulkUserStatusRequest,
    AdminCreateUserRequest,
    AdminImportTimetableRequest,
    AdminOverviewResponse,
    AdminReportItem,
    AdminRequestItem,
    AdminResetPasswordRequest,
    AdminResolveReportRequest,
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


@router.get("/reports", response_model=list[AdminReportItem])
def list_reports(
    report_status: ReportStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
) -> list[AdminReportItem]:
    return AdminService.list_reports(db, report_status=report_status)


@router.patch("/reports/{report_id}", response_model=AdminReportItem)
def resolve_report(
    report_id: uuid.UUID,
    payload: AdminResolveReportRequest,
    actor: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> AdminReportItem:
    return AdminService.resolve_report(db, actor, report_id, payload)


@router.get("/analytics")
def get_analytics(
    days: int = Query(14, ge=3, le=60),
    db: Session = Depends(get_db),
) -> dict:
    return build_admin_analytics(db, days=days)


@router.get("/export/{resource}")
def export_csv(
    resource: str,
    db: Session = Depends(get_db),
) -> Response:
    filename, csv_content = export_admin_csv(db, resource)
    return Response(
        content=csv_content.encode("utf-8"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/users/bulk-status")
def bulk_user_status(
    payload: AdminBulkUserStatusRequest,
    actor: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> dict:
    return bulk_update_user_status(db, actor, payload.student_ids, payload.status)


@router.post("/requests/bulk-delete")
def bulk_requests_delete(
    payload: AdminBulkDeleteRequestsRequest,
    actor: Student = Depends(get_current_staff),
    db: Session = Depends(get_db),
) -> dict:
    return bulk_delete_requests(db, actor, payload.request_ids)


@router.post("/academic/import-timetable")
def import_timetable(
    payload: AdminImportTimetableRequest,
    actor: Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    return import_timetable_rows(
        db,
        actor,
        filename=payload.filename,
        content_base64=payload.content_base64,
        default_semester_id=payload.semester_id,
        default_campus_id=payload.campus_id,
    )


@router.post("/broadcast")
def admin_broadcast(
    payload: AdminBroadcastRequest,
    actor: Student = Depends(get_current_admin),
    db: Session = Depends(get_db),
) -> dict:
    return broadcast_system_announcement(
        db,
        actor,
        title=payload.title,
        body=payload.body,
        campus_id=payload.campus_id,
    )
