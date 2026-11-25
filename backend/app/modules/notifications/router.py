import uuid

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_current_student
from app.database.models.identity import PushSubscription, Student
from app.database.session import get_db
from app.modules.notifications.delivery import dispatch_out_of_app
from app.modules.notifications.schemas import (
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    NotificationResponse,
    PushSubscriptionCreate,
    PushSubscriptionDelete,
)
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    unread_only: bool = Query(False),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return NotificationService.list(db, current_student.id, unread_only)


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_preferences(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    profile = current_student.profile
    sub_count = (
        db.query(PushSubscription.id)
        .filter(PushSubscription.student_id == current_student.id)
        .count()
    )
    return NotificationPreferencesResponse(
        notify_email=bool(profile.notify_email) if profile else True,
        notify_push=bool(profile.notify_push) if profile else True,
        vapid_public_key=settings.VAPID_PUBLIC_KEY,
        push_subscriptions_count=sub_count,
    )


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_preferences(
    payload: NotificationPreferencesUpdate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    profile = current_student.profile
    if profile is not None:
        if payload.notify_email is not None:
            profile.notify_email = payload.notify_email
        if payload.notify_push is not None:
            profile.notify_push = payload.notify_push
        db.commit()
        db.refresh(profile)
    sub_count = (
        db.query(PushSubscription.id)
        .filter(PushSubscription.student_id == current_student.id)
        .count()
    )
    return NotificationPreferencesResponse(
        notify_email=bool(profile.notify_email) if profile else True,
        notify_push=bool(profile.notify_push) if profile else True,
        vapid_public_key=settings.VAPID_PUBLIC_KEY,
        push_subscriptions_count=sub_count,
    )


@router.post("/push-subscriptions", status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if existing is None:
        existing = PushSubscription(
            student_id=current_student.id,
            endpoint=payload.endpoint,
            p256dh=payload.keys.p256dh,
            auth=payload.keys.auth,
            user_agent=payload.user_agent,
        )
        db.add(existing)
    else:
        existing.student_id = current_student.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
        existing.user_agent = payload.user_agent
    db.commit()
    return {"subscribed": True, "id": str(existing.id)}


@router.delete("/push-subscriptions")
def unsubscribe_push(
    payload: PushSubscriptionDelete | None = Body(default=None),
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    q = db.query(PushSubscription).filter(PushSubscription.student_id == current_student.id)
    if payload and payload.endpoint:
        q = q.filter(PushSubscription.endpoint == payload.endpoint)
    removed = q.delete(synchronize_session=False)
    db.commit()
    return {"removed": removed}


@router.post("/test-dispatch")
def test_out_of_app_dispatch(
    current_student: Student = Depends(get_current_student),
    db: Session = Depends(get_db),
):
    return dispatch_out_of_app(
        db,
        current_student.id,
        "Kiểm tra thông báo ngoài app",
        "Đây là thông báo thử nghiệm qua Email / Web Push từ FPT ClassSwap.",
        kind="SYSTEM",
    )


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
