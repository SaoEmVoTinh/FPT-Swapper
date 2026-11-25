"""Out-of-app notification delivery (SMTP Email & Web Push subscription dispatch)."""

import logging
import smtplib
import uuid
from collections import deque
from datetime import datetime, timezone
from email.message import EmailMessage

from sqlalchemy.orm import Session

from app.core.config import settings
from app.database.models.identity import PushSubscription, Student

logger = logging.getLogger(__name__)

# Bounded in-memory log of recent dispatch attempts (for observability & tests)
_recent_dispatches: deque[dict] = deque(maxlen=100)


def get_recent_dispatches() -> list[dict]:
    return list(_recent_dispatches)


def clear_recent_dispatches() -> None:
    _recent_dispatches.clear()


def _send_smtp_email(to_email: str, subject: str, body: str) -> bool:
    if not (settings.EMAIL_NOTIFICATIONS_ENABLED and settings.SMTP_HOST):
        return False
    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to_email
    msg["Subject"] = f"[FPT ClassSwap] {subject}"
    msg.set_content(
        f"{body}\n\n---\nFPT ClassSwap • Nền tảng hỗ trợ kết nối đổi lớp sinh viên FPT."
    )
    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=5) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.send_message(msg)
        return True
    except Exception as exc:  # pragma: no cover - external SMTP network failure
        logger.warning("SMTP dispatch failed for %s: %s", to_email, exc)
        return False


def dispatch_out_of_app(
    db: Session,
    student_id: uuid.UUID,
    title: str,
    body: str,
    kind: str = "SYSTEM",
) -> dict:
    """Respect user preferences and dispatch email/push notifications safely."""
    student = db.get(Student, student_id)
    if student is None:
        return {"email_sent": False, "push_targets": 0}

    profile = student.profile
    wants_email = bool(profile.notify_email) if profile else True
    wants_push = bool(profile.notify_push) if profile else True

    email_sent = False
    if wants_email and student.email:
        email_sent = _send_smtp_email(student.email, title, body)

    push_targets = 0
    if wants_push:
        push_targets = (
            db.query(PushSubscription.id)
            .filter(PushSubscription.student_id == student_id)
            .count()
        )

    entry = {
        "student_id": str(student_id),
        "email": student.email,
        "kind": kind,
        "title": title,
        "wants_email": wants_email,
        "wants_push": wants_push,
        "email_sent": email_sent,
        "push_targets": push_targets,
        "at": datetime.now(timezone.utc).isoformat(),
    }
    _recent_dispatches.append(entry)
    return {"email_sent": email_sent, "push_targets": push_targets}
