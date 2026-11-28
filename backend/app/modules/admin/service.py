import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.common.enums import (
    AccountStatus,
    ConversationSourceType,
    MatchStatus,
    NotificationType,
    ReportStatus,
    SwapRequestStatus,
    UserRole,
)
from app.core.config import settings
from app.core.security import hash_password
from app.database.models import (
    AcademicClass,
    AuditLog,
    Campus,
    Conversation,
    Course,
    Match,
    MatchingRequest,
    Message,
    Notification,
    RefreshToken,
    Report,
    Semester,
    Student,
    StudentProfile,
    Swipe,
)
from app.modules.admin.schemas import (
    AdminAuditLogItem,
    AdminCreateUserRequest,
    AdminOverviewResponse,
    AdminReportItem,
    AdminRequestItem,
    AdminResolveReportRequest,
    AdminUserItem,
)
from app.modules.auth.service import resolve_campus
from app.modules.students.cleanup import cancel_student_matches_and_notify, purge_student_account


def _is_super_admin_user(student: Student) -> bool:
    return (
        student.role == UserRole.SUPER_ADMIN
        or student.email.lower() == settings.ADMIN_EMAIL.lower()
    )


def _count_other_active_super_admins(db: Session, exclude_id: uuid.UUID) -> int:
    return (
        db.query(func.count(Student.id))
        .filter(
            Student.role == UserRole.SUPER_ADMIN,
            Student.status == AccountStatus.ACTIVE,
            Student.id != exclude_id,
        )
        .scalar()
        or 0
    )


def _revoke_user_tokens(db: Session, student: Student) -> None:
    now = datetime.now(timezone.utc)
    student.token_version = int(student.token_version) + 1
    db.query(RefreshToken).filter(
        RefreshToken.student_id == student.id,
        RefreshToken.revoked_at.is_(None),
    ).update({"revoked_at": now}, synchronize_session=False)


class AdminService:
    @staticmethod
    def overview(db: Session) -> AdminOverviewResponse:
        return AdminOverviewResponse(
            total_students=db.query(func.count(Student.id)).scalar() or 0,
            active_students=db.query(func.count(Student.id))
            .filter(Student.status == AccountStatus.ACTIVE)
            .scalar()
            or 0,
            suspended_students=db.query(func.count(Student.id))
            .filter(Student.status == AccountStatus.SUSPENDED)
            .scalar()
            or 0,
            total_requests=db.query(func.count(MatchingRequest.id)).scalar() or 0,
            active_requests=db.query(func.count(MatchingRequest.id))
            .filter(MatchingRequest.status == SwapRequestStatus.ACTIVE)
            .scalar()
            or 0,
            matched_requests=db.query(func.count(MatchingRequest.id))
            .filter(MatchingRequest.status == SwapRequestStatus.MATCHED)
            .scalar()
            or 0,
            total_matches=db.query(func.count(Match.id)).scalar() or 0,
            confirmed_matches=db.query(func.count(Match.id))
            .filter(Match.status == MatchStatus.CONFIRMED)
            .scalar()
            or 0,
            completed_matches=db.query(func.count(Match.id))
            .filter(Match.status == MatchStatus.COMPLETED)
            .scalar()
            or 0,
            total_messages=db.query(func.count(Message.id)).scalar() or 0,
            total_courses=db.query(func.count(Course.id)).scalar() or 0,
            total_campuses=db.query(func.count(Campus.id)).scalar() or 0,
            open_reports=db.query(func.count(Report.id))
            .filter(Report.status.in_([ReportStatus.OPEN, ReportStatus.UNDER_REVIEW]))
            .scalar()
            or 0,
        )

    @staticmethod
    def list_users(db: Session, query: str | None = None) -> list[AdminUserItem]:
        students = db.query(Student).order_by(Student.created_at.desc()).all()
        campuses = {c.id: c for c in db.query(Campus).all()}
        req_counts = dict(
            db.query(MatchingRequest.student_id, func.count(MatchingRequest.id))
            .group_by(MatchingRequest.student_id)
            .all()
        )
        needle = query.strip().lower() if query else ""

        items: list[AdminUserItem] = []
        for s in students:
            profile = s.profile
            campus = campuses.get(s.campus_id)
            full_name = profile.full_name if profile else None
            major = profile.major if profile else None

            if needle and not (
                needle in s.email.lower()
                or needle in s.student_code.lower()
                or (full_name and needle in full_name.lower())
                or (major and needle in major.lower())
            ):
                continue

            items.append(
                AdminUserItem(
                    id=s.id,
                    email=s.email,
                    student_code=s.student_code,
                    full_name=full_name,
                    major=major,
                    campus_id=s.campus_id,
                    campus_code=campus.code if campus else None,
                    campus_name=campus.name if campus else None,
                    role=s.role,
                    status=s.status,
                    request_count=int(req_counts.get(s.id, 0)),
                    totp_enabled=bool(s.totp_enabled),
                    scheduled_purge_at=s.scheduled_purge_at,
                    created_at=s.created_at,
                )
            )
        return items

    @staticmethod
    def create_user(
        db: Session, actor: Student, data: AdminCreateUserRequest
    ) -> AdminUserItem:
        campus = resolve_campus(db, data.campus_id)
        if campus is None:
            raise HTTPException(status_code=400, detail="Campus không tồn tại.")

        if db.query(Student).filter(Student.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email này đã được đăng ký.")
        if db.query(Student).filter(Student.student_code == data.student_code).first():
            raise HTTPException(status_code=409, detail="Mã sinh viên này đã tồn tại.")

        if data.role == UserRole.SUPER_ADMIN and not _is_super_admin_user(actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Super Admin mới có thể tạo tài khoản Super Admin.",
            )

        role = (
            UserRole.SUPER_ADMIN
            if data.email.lower() == settings.ADMIN_EMAIL.lower()
            else data.role
        )
        student = Student(
            email=data.email,
            student_code=data.student_code,
            password_hash=hash_password(data.password),
            role=role,
            status=AccountStatus.ACTIVE,
            campus_id=campus.id,
        )
        db.add(student)
        db.flush()

        profile = StudentProfile(
            student_id=student.id,
            full_name=data.full_name.strip(),
            major=data.major.strip(),
        )
        db.add(profile)
        db.add(
            AuditLog(
                actor_id=actor.id,
                action="ADMIN_CREATE_USER",
                entity_type="student",
                entity_id=student.id,
                details={
                    "email": student.email,
                    "student_code": student.student_code,
                    "campus_code": campus.code,
                    "role": student.role.value,
                },
            )
        )
        db.commit()
        db.refresh(student)

        return AdminUserItem(
            id=student.id,
            email=student.email,
            student_code=student.student_code,
            full_name=profile.full_name,
            major=profile.major,
            campus_id=campus.id,
            campus_code=campus.code,
            campus_name=campus.name,
            role=student.role,
            status=student.status,
            request_count=0,
            totp_enabled=bool(student.totp_enabled),
            scheduled_purge_at=student.scheduled_purge_at,
            created_at=student.created_at,
        )

    @staticmethod
    def update_user_status(
        db: Session, actor: Student, target_id: uuid.UUID, new_status: AccountStatus
    ) -> AdminUserItem:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if (
            student.role in (UserRole.ADMIN, UserRole.SUPER_ADMIN)
            and not _is_super_admin_user(actor)
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Không có quyền thay đổi trạng thái của Admin.",
            )
        if _is_super_admin_user(student) and new_status != AccountStatus.ACTIVE:
            if _count_other_active_super_admins(db, student.id) == 0 or student.id == actor.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không thể khóa Super Admin cuối cùng hoặc tự khóa chính mình.",
                )

        student.status = new_status
        if new_status == AccountStatus.ACTIVE:
            student.scheduled_purge_at = None
            student.locked_until = None
            student.failed_login_attempts = 0
        else:
            _revoke_user_tokens(db, student)

        db.add(
            AuditLog(
                actor_id=actor.id,
                action="ADMIN_UPDATE_USER_STATUS",
                entity_type="student",
                entity_id=student.id,
                details={"email": student.email, "status": new_status.value},
            )
        )
        db.commit()
        db.refresh(student)
        return AdminService.list_users(db, query=student.email)[0]

    @staticmethod
    def update_user_role(
        db: Session, actor: Student, target_id: uuid.UUID, new_role: UserRole
    ) -> AdminUserItem:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if student.role == UserRole.SUPER_ADMIN and new_role != UserRole.SUPER_ADMIN:
            if _count_other_active_super_admins(db, student.id) == 0 or student.id == actor.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phải giữ lại ít nhất một Super Admin hoạt động.",
                )

        student.role = new_role
        db.add(
            AuditLog(
                actor_id=actor.id,
                action="ADMIN_UPDATE_USER_ROLE",
                entity_type="student",
                entity_id=student.id,
                details={"email": student.email, "role": new_role.value},
            )
        )
        db.commit()
        db.refresh(student)
        return AdminService.list_users(db, query=student.email)[0]

    @staticmethod
    def reset_user_password(
        db: Session, actor: Student, target_id: uuid.UUID, new_password: str
    ) -> None:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if _is_super_admin_user(student) and not _is_super_admin_user(actor):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Chỉ Super Admin mới có thể đặt lại mật khẩu Super Admin.",
            )
        student.password_hash = hash_password(new_password)
        student.failed_login_attempts = 0
        student.locked_until = None
        _revoke_user_tokens(db, student)
        db.add(
            AuditLog(
                actor_id=actor.id,
                action="ADMIN_RESET_PASSWORD",
                entity_type="student",
                entity_id=student.id,
                details={"email": student.email},
            )
        )
        db.commit()

    @staticmethod
    def delete_user(db: Session, actor_id: uuid.UUID, target_id: uuid.UUID) -> None:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if student.id == actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tự xóa tài khoản quản trị đang đăng nhập.",
            )
        if _is_super_admin_user(student) and _count_other_active_super_admins(db, student.id) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa Super Admin cuối cùng.",
            )

        deleted_email, deleted_code = purge_student_account(db, target_id)
        db.add(
            AuditLog(
                actor_id=actor_id,
                action="ADMIN_DELETE_USER",
                entity_type="student",
                entity_id=target_id,
                details={"email": deleted_email, "student_code": deleted_code},
            )
        )
        db.commit()

    @staticmethod
    def purge_expired_accounts(db: Session, actor_id: uuid.UUID) -> int:
        now = datetime.now(timezone.utc)
        expired_users = (
            db.query(Student)
            .filter(
                Student.status == AccountStatus.CLOSED,
                Student.scheduled_purge_at.isnot(None),
                Student.scheduled_purge_at <= now,
            )
            .all()
        )
        count = 0
        for stu in expired_users:
            if _is_super_admin_user(stu) and _count_other_active_super_admins(db, stu.id) == 0:
                continue
            email, code = purge_student_account(db, stu.id)
            db.add(
                AuditLog(
                    actor_id=actor_id,
                    action="ADMIN_PURGE_EXPIRED_USER",
                    entity_type="student",
                    entity_id=stu.id,
                    details={"email": email, "student_code": code},
                )
            )
            count += 1
        db.commit()
        return count

    @staticmethod
    def list_requests(db: Session, limit: int = 100) -> list[AdminRequestItem]:
        rows = (
            db.query(MatchingRequest)
            .order_by(MatchingRequest.created_at.desc())
            .limit(limit)
            .all()
        )
        items: list[AdminRequestItem] = []
        for r in rows:
            student = db.get(Student, r.student_id)
            course = db.get(Course, r.course_id)
            sem = db.get(Semester, r.semester_id)
            cur = db.get(AcademicClass, r.current_class_id)
            tgt = db.get(AcademicClass, r.target_class_id) if r.target_class_id else None
            campus = db.get(Campus, cur.campus_id) if cur else None
            items.append(
                AdminRequestItem(
                    id=r.id,
                    student_id=r.student_id,
                    student_email=student.email if student else "",
                    student_code=student.student_code if student else "",
                    student_name=student.profile.full_name if student and student.profile else None,
                    campus_name=campus.name if campus else None,
                    course_code=course.code if course else None,
                    semester_name=sem.name if sem else None,
                    current_class_code=cur.code if cur else None,
                    target_class_code=tgt.code if tgt else None,
                    status=r.status,
                    note=r.note,
                    created_at=r.created_at,
                )
            )
        return items

    @staticmethod
    def delete_request(db: Session, actor_id: uuid.UUID, request_id: uuid.UUID) -> None:
        req = db.get(MatchingRequest, request_id)
        if req is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy yêu cầu.")

        matches = (
            db.query(Match)
            .filter(or_(Match.request_low_id == request_id, Match.request_high_id == request_id))
            .all()
        )
        for m in matches:
            convs = (
                db.query(Conversation)
                .filter(
                    Conversation.source_type == ConversationSourceType.CLASS_SWAP,
                    Conversation.source_id == m.id,
                )
                .all()
            )
            for conv in convs:
                db.delete(conv)
            db.delete(m)
        db.flush()

        db.query(Swipe).filter(
            or_(Swipe.swiper_request_id == request_id, Swipe.target_request_id == request_id)
        ).delete(synchronize_session=False)
        db.delete(req)
        db.add(
            AuditLog(
                actor_id=actor_id,
                action="ADMIN_DELETE_REQUEST",
                entity_type="matching_request",
                entity_id=request_id,
                details={"student_id": str(req.student_id)},
            )
        )
        db.commit()

    @staticmethod
    def list_audit_logs(db: Session, limit: int = 50) -> list[AdminAuditLogItem]:
        rows = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
        actor_emails: dict[uuid.UUID, str] = {}
        items: list[AdminAuditLogItem] = []
        for log in rows:
            email: str | None = None
            if log.actor_id:
                if log.actor_id not in actor_emails:
                    stu = db.get(Student, log.actor_id)
                    actor_emails[log.actor_id] = stu.email if stu else ""
                email = actor_emails[log.actor_id] or None
            items.append(
                AdminAuditLogItem(
                    id=log.id,
                    actor_id=log.actor_id,
                    actor_email=email,
                    action=log.action,
                    entity_type=log.entity_type,
                    entity_id=log.entity_id,
                    details=log.details,
                    created_at=log.created_at,
                )
            )
        return items

    @staticmethod
    def _report_to_item(db: Session, report: Report) -> AdminReportItem:
        reporter = db.get(Student, report.reporter_id) if report.reporter_id else None
        reported = db.get(Student, report.reported_student_id) if report.reported_student_id else None
        resolver = db.get(Student, report.resolved_by_id) if report.resolved_by_id else None

        def _label(stu: Student | None, anon_ref: str | None) -> str | None:
            if stu is not None:
                name = stu.profile.full_name if stu.profile and stu.profile.full_name else stu.student_code
                return f"{name} ({stu.student_code})"
            return anon_ref

        return AdminReportItem(
            id=report.id,
            reporter_id=report.reporter_id,
            reporter_email=reporter.email if reporter else None,
            reporter_label=_label(reporter, report.anonymized_reporter_ref),
            reported_student_id=report.reported_student_id,
            reported_email=reported.email if reported else None,
            reported_label=_label(reported, report.anonymized_reported_ref),
            conversation_id=report.conversation_id,
            reason=report.reason,
            details=report.details,
            status=report.status,
            resolved_by_id=report.resolved_by_id,
            resolved_by_email=resolver.email if resolver else None,
            resolution_note=report.resolution_note,
            created_at=report.created_at,
            updated_at=report.updated_at,
        )

    @staticmethod
    def list_reports(
        db: Session, report_status: ReportStatus | None = None
    ) -> list[AdminReportItem]:
        q = db.query(Report)
        if report_status is not None:
            q = q.filter(Report.status == report_status)
        rows = q.order_by(Report.created_at.desc()).limit(200).all()
        return [AdminService._report_to_item(db, r) for r in rows]

    @staticmethod
    def resolve_report(
        db: Session,
        actor: Student,
        report_id: uuid.UUID,
        payload: AdminResolveReportRequest,
    ) -> AdminReportItem:
        report = db.get(Report, report_id)
        if report is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo.")

        note = payload.resolution_note.strip() if payload.resolution_note else None
        report.status = payload.status
        report.resolved_by_id = actor.id
        if note is not None:
            report.resolution_note = note

        reported = (
            db.get(Student, report.reported_student_id)
            if report.reported_student_id
            else None
        )

        if payload.action == "WARN" and reported is not None:
            db.add(
                Notification(
                    student_id=reported.id,
                    notification_type=NotificationType.SYSTEM,
                    title="Cảnh cáo vi phạm từ Ban quản trị",
                    body=(
                        f"Tài khoản của bạn nhận cảnh cáo liên quan đến báo cáo '{report.reason}'."
                        + (f" Ghi chú: {note}" if note else "")
                    ),
                    is_read=False,
                    reference_id=report.id,
                )
            )
        elif payload.action == "SUSPEND" and reported is not None:
            if reported.id == actor.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không thể tự khóa tài khoản của chính mình.",
                )
            if _is_super_admin_user(reported) and not _is_super_admin_user(actor):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Không thể khóa tài khoản Super Admin.",
                )
            reported.status = AccountStatus.SUSPENDED
            _revoke_user_tokens(db, reported)
            cancel_student_matches_and_notify(
                db,
                reported.id,
                "Tài khoản đối tác đã bị tạm khóa bởi quản trị viên. Yêu cầu đổi lớp của bạn đã được mở lại.",
            )
            db.add(
                Notification(
                    student_id=reported.id,
                    notification_type=NotificationType.SYSTEM,
                    title="Tài khoản đã bị tạm khóa",
                    body=(
                        f"Tài khoản của bạn đã bị tạm khóa sau khi xử lý báo cáo '{report.reason}'."
                        + (f" Lý do: {note}" if note else "")
                    ),
                    is_read=False,
                    reference_id=report.id,
                )
            )

        if report.reporter_id is not None:
            status_text = (
                "đã được xử lý"
                if payload.status == ReportStatus.RESOLVED
                else "đã được cập nhật"
            )
            action_text = (
                " Tài khoản bị báo cáo đã bị tạm khóa."
                if payload.action == "SUSPEND"
                else (" Đã gửi cảnh cáo tới người dùng." if payload.action == "WARN" else "")
            )
            db.add(
                Notification(
                    student_id=report.reporter_id,
                    notification_type=NotificationType.SYSTEM,
                    title="Cập nhật kết quả báo cáo",
                    body=(
                        f"Báo cáo '{report.reason}' của bạn {status_text} ({payload.status.value})."
                        f"{action_text}"
                        + (f" Ghi chú: {note}" if note else "")
                    ),
                    is_read=False,
                    reference_id=report.id,
                )
            )

        db.add(
            AuditLog(
                actor_id=actor.id,
                action="ADMIN_RESOLVE_REPORT",
                entity_type="report",
                entity_id=report.id,
                details={
                    "status": payload.status.value,
                    "action": payload.action,
                    "note": note,
                },
            )
        )
        db.commit()
        db.refresh(report)
        return AdminService._report_to_item(db, report)
