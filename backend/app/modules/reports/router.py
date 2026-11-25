from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.reports.schemas import ReportCreateRequest, ReportResponse
from app.modules.reports.service import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def submit_report(
    data: ReportCreateRequest,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return ReportService.create_report(db, current_student.id, data)
