import uuid

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.common.enums import SwapRequestStatus
from app.database.models.academic import AcademicClass, ClassSchedule, Course, Semester
from app.database.models.identity import Student
from app.database.models.matching import MatchingRequest
from app.modules.class_swap.schemas import CreateRequestSchema, UpdateRequestSchema

# States a student can transition to manually
_ALLOWED_TRANSITIONS: dict[SwapRequestStatus, set[SwapRequestStatus]] = {
    SwapRequestStatus.ACTIVE: {SwapRequestStatus.PAUSED, SwapRequestStatus.CANCELLED},
    SwapRequestStatus.DRAFT: {SwapRequestStatus.ACTIVE, SwapRequestStatus.CANCELLED},
    SwapRequestStatus.PAUSED: {SwapRequestStatus.ACTIVE, SwapRequestStatus.CANCELLED},
}


class ClassSwapService:
    @staticmethod
    def _check_no_conflicting_active(
        db: Session,
        student_id: uuid.UUID,
        course_id: uuid.UUID,
        semester_id: uuid.UUID,
        exclude_id: uuid.UUID | None = None,
    ) -> None:
        q = (
            db.query(MatchingRequest)
            .filter(
                MatchingRequest.student_id == student_id,
                MatchingRequest.course_id == course_id,
                MatchingRequest.semester_id == semester_id,
                MatchingRequest.status.in_(
                    [SwapRequestStatus.ACTIVE, SwapRequestStatus.DRAFT, SwapRequestStatus.MATCHED]
                ),
            )
        )
        if exclude_id:
            q = q.filter(MatchingRequest.id != exclude_id)
        if q.first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Bạn đã có một yêu cầu đổi lớp đang hoạt động cho môn/học kỳ này.",
            )

    @staticmethod
    def _resolve_or_create_class(
        db: Session,
        course_id: uuid.UUID,
        semester_id: uuid.UUID,
        campus_id: uuid.UUID,
        code: str,
        day_of_week: str | None = None,
        slot: str | None = None,
    ) -> AcademicClass:
        cleaned_code = code.strip().upper()
        cls = (
            db.query(AcademicClass)
            .filter(
                func.upper(AcademicClass.code) == cleaned_code,
                AcademicClass.course_id == course_id,
                AcademicClass.semester_id == semester_id,
                AcademicClass.campus_id == campus_id,
            )
            .first()
        )
        if cls is None:
            cls = AcademicClass(
                code=cleaned_code,
                course_id=course_id,
                semester_id=semester_id,
                campus_id=campus_id,
                is_swappable=True,
            )
            db.add(cls)
            db.flush()
            if slot and slot.strip():
                db.add(
                    ClassSchedule(
                        class_id=cls.id,
                        day_of_week=(day_of_week or "Theo lịch học").strip(),
                        slot=slot.strip(),
                    )
                )
                db.flush()
        elif slot and slot.strip() and not cls.schedules:
            db.add(
                ClassSchedule(
                    class_id=cls.id,
                    day_of_week=(day_of_week or "Theo lịch học").strip(),
                    slot=slot.strip(),
                )
            )
            db.flush()
        return cls

    @staticmethod
    def _validate_classes(
        db: Session,
        student: Student,
        data: CreateRequestSchema,
    ) -> tuple[AcademicClass, AcademicClass]:
        course = db.get(Course, data.course_id)
        semester = db.get(Semester, data.semester_id)
        if course is None or semester is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Môn học hoặc học kỳ không tồn tại.",
            )

        if data.current_class_id is not None:
            current = db.get(AcademicClass, data.current_class_id)
        else:
            current = ClassSwapService._resolve_or_create_class(
                db,
                course_id=data.course_id,
                semester_id=data.semester_id,
                campus_id=student.campus_id,
                code=data.current_class_code or "",
                day_of_week=data.current_day_of_week,
                slot=data.current_slot,
            )

        if data.target_class_id is not None:
            target = db.get(AcademicClass, data.target_class_id)
        else:
            target = ClassSwapService._resolve_or_create_class(
                db,
                course_id=data.course_id,
                semester_id=data.semester_id,
                campus_id=student.campus_id,
                code=data.target_class_code or "",
                day_of_week=data.target_day_of_week,
                slot=data.target_slot,
            )

        if current is None or target is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Lớp hiện tại hoặc lớp mong muốn không tồn tại trong danh mục.",
            )
        if current.id == target.id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Lớp hiện tại và lớp mong muốn không được trùng nhau.",
            )
        for cls in (current, target):
            if cls.course_id != data.course_id or cls.semester_id != data.semester_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Lớp học phải thuộc đúng môn học và học kỳ đã chọn.",
                )
            if not cls.is_swappable:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Lớp {cls.code} hiện không cho phép đổi.",
                )
        if current.campus_id != target.campus_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Hai lớp phải cùng một cơ sở.",
            )
        if current.campus_id != student.campus_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Chỉ có thể tạo yêu cầu đổi lớp trong cơ sở (campus) của bạn.",
            )
        return current, target

    @staticmethod
    def create(db: Session, student_id: uuid.UUID, data: CreateRequestSchema) -> MatchingRequest:
        student = db.get(Student, student_id)
        if student is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
        current, target = ClassSwapService._validate_classes(db, student, data)
        ClassSwapService._check_no_conflicting_active(
            db, student_id, data.course_id, data.semester_id
        )
        req = MatchingRequest(
            student_id=student_id,
            semester_id=data.semester_id,
            course_id=data.course_id,
            current_class_id=current.id,
            target_class_id=target.id,
            note=data.note,
            expires_at=data.expires_at,
        )
        db.add(req)
        db.commit()
        db.refresh(req)
        return req

    @staticmethod
    def list_mine(db: Session, student_id: uuid.UUID) -> list[MatchingRequest]:
        from app.modules.matching.service import MatchingService

        MatchingService.expire_stale_records(db)
        return (
            db.query(MatchingRequest)
            .filter(MatchingRequest.student_id == student_id)
            .order_by(MatchingRequest.created_at.desc())
            .all()
        )

    @staticmethod
    def get(db: Session, request_id: uuid.UUID) -> MatchingRequest | None:
        return db.get(MatchingRequest, request_id)

    @staticmethod
    def get_owned(db: Session, request_id: uuid.UUID, student_id: uuid.UUID) -> MatchingRequest:
        req = db.get(MatchingRequest, request_id)
        if not req:
            raise HTTPException(status_code=404, detail="Request not found")
        if req.student_id != student_id:
            raise HTTPException(status_code=403, detail="Not your request")
        return req

    @staticmethod
    def update(
        db: Session, req: MatchingRequest, student_id: uuid.UUID, data: UpdateRequestSchema
    ) -> MatchingRequest:
        payload = data.model_dump(exclude_unset=True)
        new_status = payload.pop("status", None)

        if new_status is not None:
            allowed = _ALLOWED_TRANSITIONS.get(req.status, set())
            if new_status not in allowed:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"Cannot transition from {req.status} to {new_status}",
                )
            req.status = new_status

        for field, value in payload.items():
            setattr(req, field, value)

        db.commit()
        db.refresh(req)
        return req

    @staticmethod
    def cancel(db: Session, req: MatchingRequest) -> MatchingRequest:
        cancellable = {SwapRequestStatus.ACTIVE, SwapRequestStatus.DRAFT, SwapRequestStatus.PAUSED}
        if req.status not in cancellable:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Cannot cancel a request with status {req.status}",
            )
        req.status = SwapRequestStatus.CANCELLED
        db.commit()
        db.refresh(req)
        return req
