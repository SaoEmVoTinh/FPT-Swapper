import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.common.enums import AccountStatus, MatchStatus, SwapRequestStatus, UserRole
from app.core.security import hash_password, verify_password
from app.database.models import (
    AcademicClass,
    AuditLog,
    Campus,
    Course,
    Match,
    MatchingRequest,
    Notification,
    RefreshToken,
    Semester,
    Student,
    StudentBlock,
    StudentProfile,
)
from app.modules.auth.service import resolve_campus
from app.modules.students.cleanup import cancel_student_matches_and_notify
from app.modules.students.schemas import (
    AccountDataExportResponse,
    AccountSummaryResponse,
    BlockedStudentItem,
    BulkRequestsActionResponse,
)

SOFT_DELETE_GRACE_DAYS = 14


class StudentService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_profile(self, student_id: uuid.UUID) -> StudentProfile | None:
        return (
            self.db.query(StudentProfile)
            .filter(StudentProfile.student_id == student_id)
            .first()
        )

    def update_profile(
        self,
        student_id: uuid.UUID,
        full_name: str | None,
        major: str | None,
        avatar_url: str | None,
        bio: str | None,
        campus_id: uuid.UUID | str | None = None,
        share_contact_after_match: bool | None = None,
        class_name: str | None = None,
        update_class_name: bool = False,
    ) -> StudentProfile:
        profile = self.get_profile(student_id)
        if profile is None:
            raise ValueError("Profile not found.")
        if full_name is not None:
            profile.full_name = full_name.strip()
        if major is not None:
            profile.major = major.strip()
        if update_class_name:
            profile.class_name = class_name.strip().upper() if class_name and class_name.strip() else None
        elif class_name is not None:
            profile.class_name = class_name.strip().upper() or None
        if avatar_url is not None:
            profile.avatar_url = avatar_url.strip() or None
        if bio is not None:
            profile.bio = bio.strip() or None
        if share_contact_after_match is not None:
            profile.share_contact_after_match = share_contact_after_match
        if campus_id is not None:
            campus = resolve_campus(self.db, campus_id)
            if campus is None:
                raise ValueError("Campus không tồn tại.")
            student = self.db.get(Student, student_id)
            if student is not None:
                student.campus_id = campus.id
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def get_account_summary(self, student: Student) -> AccountSummaryResponse:
        profile = student.profile or self.get_profile(student.id)
        campus = self.db.get(Campus, student.campus_id) if student.campus_id else None

        total_requests = (
            self.db.query(func.count(MatchingRequest.id))
            .filter(MatchingRequest.student_id == student.id)
            .scalar()
            or 0
        )
        active_requests = (
            self.db.query(func.count(MatchingRequest.id))
            .filter(
                MatchingRequest.student_id == student.id,
                MatchingRequest.status == SwapRequestStatus.ACTIVE,
            )
            .scalar()
            or 0
        )
        paused_requests = (
            self.db.query(func.count(MatchingRequest.id))
            .filter(
                MatchingRequest.student_id == student.id,
                MatchingRequest.status == SwapRequestStatus.PAUSED,
            )
            .scalar()
            or 0
        )
        matched_requests = (
            self.db.query(func.count(MatchingRequest.id))
            .filter(
                MatchingRequest.student_id == student.id,
                MatchingRequest.status == SwapRequestStatus.MATCHED,
            )
            .scalar()
            or 0
        )
        total_matches = (
            self.db.query(func.count(Match.id))
            .filter(or_(Match.student_a_id == student.id, Match.student_b_id == student.id))
            .scalar()
            or 0
        )
        confirmed_matches = (
            self.db.query(func.count(Match.id))
            .filter(
                or_(Match.student_a_id == student.id, Match.student_b_id == student.id),
                Match.status.in_([MatchStatus.CONFIRMED, MatchStatus.COMPLETED]),
            )
            .scalar()
            or 0
        )
        unread_notifications = (
            self.db.query(func.count(Notification.id))
            .filter(
                Notification.student_id == student.id,
                Notification.is_read.is_(False),
            )
            .scalar()
            or 0
        )

        return AccountSummaryResponse(
            id=student.id,
            email=student.email,
            student_code=student.student_code,
            role=student.role.value,
            status=student.status.value,
            created_at=student.created_at,
            full_name=profile.full_name if profile else None,
            major=profile.major if profile else None,
            class_name=profile.class_name if profile else None,
            campus_id=student.campus_id,
            campus_code=campus.code if campus else None,
            campus_name=campus.name if campus else None,
            avatar_url=profile.avatar_url if profile else None,
            bio=profile.bio if profile else None,
            share_contact_after_match=bool(profile.share_contact_after_match) if profile else False,
            trust_score=float(profile.trust_score) if profile else 5.0,
            completed_swaps_count=int(profile.completed_swaps_count) if profile else 0,
            no_show_count=int(profile.no_show_count) if profile else 0,
            total_requests=total_requests,
            active_requests=active_requests,
            paused_requests=paused_requests,
            matched_requests=matched_requests,
            total_matches=total_matches,
            confirmed_matches=confirmed_matches,
            unread_notifications=unread_notifications,
        )

    def update_account_identity(
        self,
        student: Student,
        email: str | None,
        student_code: str | None,
    ) -> AccountSummaryResponse:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email và Mã sinh viên là định danh cố định, không thể tự thay đổi sau khi đăng ký.",
        )

    def change_password(
        self,
        student: Student,
        current_password: str,
        new_password: str,
    ) -> None:
        if not verify_password(current_password, student.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu hiện tại không đúng.",
            )
        if current_password == new_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu mới phải khác mật khẩu hiện tại.",
            )
        now = datetime.now(timezone.utc)
        student.password_hash = hash_password(new_password)
        student.token_version = int(student.token_version) + 1
        self.db.query(RefreshToken).filter(
            RefreshToken.student_id == student.id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)
        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="SELF_CHANGE_PASSWORD",
                entity_type="student",
                entity_id=student.id,
                details={"email": student.email},
            )
        )
        self.db.commit()

    def bulk_toggle_requests(
        self,
        student: Student,
        from_status: SwapRequestStatus,
        to_status: SwapRequestStatus,
    ) -> BulkRequestsActionResponse:
        updated = (
            self.db.query(MatchingRequest)
            .filter(
                MatchingRequest.student_id == student.id,
                MatchingRequest.status == from_status,
            )
            .update({"status": to_status}, synchronize_session=False)
        )
        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="SELF_TOGGLE_REQUESTS",
                entity_type="matching_request",
                entity_id=student.id,
                details={
                    "from": from_status.value,
                    "to": to_status.value,
                    "updated_count": updated,
                },
            )
        )
        self.db.commit()
        return BulkRequestsActionResponse(updated_count=updated, status=to_status.value)

    def export_my_data(self, student: Student) -> AccountDataExportResponse:
        summary = self.get_account_summary(student)
        reqs = (
            self.db.query(MatchingRequest)
            .filter(MatchingRequest.student_id == student.id)
            .order_by(MatchingRequest.created_at.desc())
            .all()
        )
        req_items = []
        for req in reqs:
            course = self.db.get(Course, req.course_id)
            sem = self.db.get(Semester, req.semester_id)
            cur = self.db.get(AcademicClass, req.current_class_id)
            tgt = self.db.get(AcademicClass, req.target_class_id)
            req_items.append(
                {
                    "id": str(req.id),
                    "course_code": course.code if course else None,
                    "semester": sem.name if sem else None,
                    "current_class": cur.code if cur else None,
                    "target_class": tgt.code if tgt else None,
                    "status": req.status.value,
                    "note": req.note,
                    "created_at": req.created_at.isoformat(),
                }
            )

        notifs = (
            self.db.query(Notification)
            .filter(Notification.student_id == student.id)
            .order_by(Notification.created_at.desc())
            .limit(100)
            .all()
        )
        notif_items = [
            {
                "id": str(n.id),
                "type": n.notification_type.value,
                "title": n.title,
                "body": n.body,
                "is_read": n.is_read,
                "created_at": n.created_at.isoformat(),
            }
            for n in notifs
        ]

        return AccountDataExportResponse(
            exported_at=datetime.now(timezone.utc),
            account={
                "id": str(summary.id),
                "email": summary.email,
                "student_code": summary.student_code,
                "full_name": summary.full_name,
                "major": summary.major,
                "class_name": summary.class_name,
                "campus": summary.campus_name,
                "bio": summary.bio,
                "role": summary.role,
                "status": summary.status,
                "created_at": summary.created_at.isoformat(),
            },
            requests=req_items,
            notifications=notif_items,
        )

    def delete_own_account(self, student: Student, password: str) -> None:
        if student.role == UserRole.SUPER_ADMIN:
            other_super = (
                self.db.query(Student.id)
                .filter(
                    Student.role == UserRole.SUPER_ADMIN,
                    Student.status == AccountStatus.ACTIVE,
                    Student.id != student.id,
                )
                .first()
            )
            if other_super is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Không thể tự xóa tài khoản Super Admin duy nhất.",
                )
        if not verify_password(password, student.password_hash):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Mật khẩu xác nhận không đúng.",
            )

        now = datetime.now(timezone.utc)
        cancel_student_matches_and_notify(
            self.db,
            student.id,
            "Đối tác đã yêu cầu xóa tài khoản. Yêu cầu đổi lớp của bạn đã được mở lại.",
        )

        student.status = AccountStatus.CLOSED
        student.scheduled_purge_at = now + timedelta(days=SOFT_DELETE_GRACE_DAYS)
        student.token_version = int(student.token_version) + 1
        self.db.query(RefreshToken).filter(
            RefreshToken.student_id == student.id,
            RefreshToken.revoked_at.is_(None),
        ).update({"revoked_at": now}, synchronize_session=False)

        self.db.add(
            AuditLog(
                actor_id=student.id,
                action="SELF_SCHEDULE_DELETE",
                entity_type="student",
                entity_id=student.id,
                details={
                    "email": student.email,
                    "scheduled_purge_at": student.scheduled_purge_at.isoformat(),
                },
            )
        )
        self.db.commit()

    def list_blocks(self, student_id: uuid.UUID) -> list[BlockedStudentItem]:
        rows = (
            self.db.query(StudentBlock)
            .filter(StudentBlock.blocker_id == student_id)
            .order_by(StudentBlock.created_at.desc())
            .all()
        )
        items: list[BlockedStudentItem] = []
        for row in rows:
            target = self.db.get(Student, row.blocked_student_id)
            code = target.student_code if target else ""
            masked = f"{code[:4]}****" if code else "****"
            full_name = (
                target.profile.full_name
                if target and target.profile and target.profile.full_name
                else None
            )
            items.append(
                BlockedStudentItem(
                    student_id=row.blocked_student_id,
                    full_name=full_name,
                    student_code_masked=masked,
                    reason=row.reason,
                    created_at=row.created_at,
                )
            )
        return items

    def block_student(
        self, student_id: uuid.UUID, target_student_id: uuid.UUID, reason: str | None = None
    ) -> BlockedStudentItem:
        if target_student_id == student_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Không thể tự chặn chính mình.",
            )
        target = self.db.get(Student, target_student_id)
        if target is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sinh viên cần chặn.",
            )
        existing = (
            self.db.query(StudentBlock)
            .filter(
                StudentBlock.blocker_id == student_id,
                StudentBlock.blocked_student_id == target_student_id,
            )
            .first()
        )
        if existing is None:
            existing = StudentBlock(
                blocker_id=student_id,
                blocked_student_id=target_student_id,
                reason=reason.strip() if reason else None,
            )
            self.db.add(existing)
            self.db.commit()
            self.db.refresh(existing)
        code = target.student_code or ""
        return BlockedStudentItem(
            student_id=target.id,
            full_name=target.profile.full_name if target.profile else None,
            student_code_masked=f"{code[:4]}****" if code else "****",
            reason=existing.reason,
            created_at=existing.created_at,
        )

    def unblock_student(self, student_id: uuid.UUID, target_student_id: uuid.UUID) -> None:
        deleted = (
            self.db.query(StudentBlock)
            .filter(
                StudentBlock.blocker_id == student_id,
                StudentBlock.blocked_student_id == target_student_id,
            )
            .delete(synchronize_session=False)
        )
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Người dùng này chưa nằm trong danh sách chặn.",
            )
        self.db.commit()
