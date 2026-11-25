import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.common.enums import ReportStatus
from app.database.models.communication import Conversation
from app.database.models.identity import Student
from app.database.models.operations import Report
from app.modules.reports.schemas import ReportCreateRequest


class ReportService:
    @staticmethod
    def create_report(
        db: Session,
        reporter_id: uuid.UUID,
        data: ReportCreateRequest,
    ) -> Report:
        reported_id = data.reported_student_id

        if data.conversation_id is not None:
            conv = db.get(Conversation, data.conversation_id)
            if conv is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Không tìm thấy cuộc trò chuyện.",
                )
            member_ids = [m.student_id for m in conv.members]
            if reporter_id not in member_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Bạn không thuộc cuộc trò chuyện này.",
                )
            if reported_id is None:
                reported_id = next((mid for mid in member_ids if mid != reporter_id), None)

        if reported_id is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Thiếu đối tượng bị báo cáo.",
            )
        if reported_id == reporter_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Không thể tự báo cáo chính mình.",
            )
        if db.get(Student, reported_id) is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy sinh viên bị báo cáo.",
            )

        report = Report(
            reporter_id=reporter_id,
            reported_student_id=reported_id,
            conversation_id=data.conversation_id,
            reason=data.reason.strip(),
            details=data.details.strip() if data.details else None,
            status=ReportStatus.OPEN,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report
