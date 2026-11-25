import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_student
from app.database.models.identity import Student
from app.database.session import get_db
from app.modules.notifications.schemas import NotificationResponse
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return NotificationService.list(db, current_student.id, unread_only)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_read(
    notification_id: uuid.UUID,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    notif = NotificationService.mark_read(db, notification_id, current_student.id)
    if not notif:
        raise HTTPException(404, "Notification not found")
    return notif


@router.post("/read-all")
def mark_all_read(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    count = NotificationService.mark_all_read(db, current_student.id)
    return {"marked_read": count}
