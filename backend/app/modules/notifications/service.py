import uuid

from sqlalchemy.orm import Session

from app.database.models.operations import Notification


class NotificationService:
    @staticmethod
    def list(db: Session, student_id: uuid.UUID, unread_only: bool = False) -> list[Notification]:
        q = db.query(Notification).filter(Notification.student_id == student_id)
        if unread_only:
            q = q.filter(Notification.is_read.is_(False))
        return q.order_by(Notification.created_at.desc()).all()

    @staticmethod
    def mark_read(db: Session, notification_id: uuid.UUID, student_id: uuid.UUID) -> Notification | None:
        notif = db.get(Notification, notification_id)
        if not notif or notif.student_id != student_id:
            return None
        notif.is_read = True
        db.commit()
        db.refresh(notif)
        return notif

    @staticmethod
    def mark_all_read(db: Session, student_id: uuid.UUID) -> int:
        updated = (
            db.query(Notification)
            .filter(Notification.student_id == student_id, Notification.is_read.is_(False))
            .all()
        )
        for n in updated:
            n.is_read = True
        db.commit()
        return len(updated)
