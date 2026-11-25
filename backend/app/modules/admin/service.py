import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.common.enums import (
    AccountStatus,
    ConversationSourceType,
    MatchStatus,
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
    Semester,
    Student,
    StudentProfile,
    Swipe,
)
from app.modules.admin.schemas import (
    AdminAuditLogItem,
    AdminCreateUserRequest,
    AdminOverviewResponse,
    AdminRequestItem,
    AdminUserItem,
)
from app.modules.auth.service import resolve_campus
from app.modules.students.cleanup import purge_student_account


def _is_super_admin_email(email: str) -> bool:
    return email.lower() == settings.ADMIN_EMAIL.lower()


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
                    created_at=s.created_at,
                )
            )
        return items

    @staticmethod
    def create_user(
        db: Session, actor_id: uuid.UUID, data: AdminCreateUserRequest
    ) -> AdminUserItem:
        campus = resolve_campus(db, data.campus_id)
        if campus is None:
            raise HTTPException(status_code=400, detail="Campus không tồn tại.")

        if db.query(Student).filter(Student.email == data.email).first():
            raise HTTPException(status_code=409, detail="Email này đã được đăng ký.")
        if db.query(Student).filter(Student.student_code == data.student_code).first():
            raise HTTPException(status_code=409, detail="Mã sinh viên này đã tồn tại.")

        role = UserRole.ADMIN if _is_super_admin_email(data.email) else data.role
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
                actor_id=actor_id,
                action="ADMIN_CREATE_USER",
                entity_type="student",
                entity_id=student.id,
                details={
                    "email": student.email,
                    "student_code": student.student_code,
                    "campus_code": campus.code,
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
            created_at=student.created_at,
        )

    @staticmethod
    def update_user_status(
        db: Session, actor_id: uuid.UUID, target_id: uuid.UUID, new_status: AccountStatus
    ) -> AdminUserItem:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        if _is_super_admin_email(student.email) and new_status != AccountStatus.ACTIVE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể khóa tài khoản quản trị chính.",
            )
        student.status = new_status
        db.add(
            AuditLog(
                actor_id=actor_id,
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
    def reset_user_password(
        db: Session, actor_id: uuid.UUID, target_id: uuid.UUID, new_password: str
    ) -> None:
        student = db.get(Student, target_id)
        if student is None:
            raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản.")
        student.password_hash = hash_password(new_password)
        db.add(
            AuditLog(
                actor_id=actor_id,
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
        if _is_super_admin_email(student.email) or student.id == actor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể xóa tài khoản quản trị chính.",
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
            tgt = db.get(AcademicClass, r.target_class_id)
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
