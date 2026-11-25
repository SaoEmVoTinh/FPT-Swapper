"""P2 Admin operations: time-series analytics, CSV export, bulk actions, Excel/CSV timetable import, and broadcast."""

import base64
import csv
import io
import uuid
import xml.etree.ElementTree as ET
import zipfile
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.common.enums import (
    AccountStatus,
    ConversationSourceType,
    NotificationType,
    SwapRequestStatus,
    UserRole,
)
from app.database.models import (
    AcademicClass,
    AuditLog,
    Campus,
    ClassSchedule,
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
    Swipe,
)
from app.modules.notifications.delivery import dispatch_out_of_app
from app.modules.students.cleanup import cancel_student_matches_and_notify


def _csv_safe(value: object) -> str:
    text = "" if value is None else str(value)
    if text and text[0] in ("=", "+", "-", "@", "\t", "\r"):
        return "'" + text
    return text


def build_admin_analytics(db: Session, days: int = 14) -> dict:
    days = max(3, min(days, 60))
    now = datetime.now(timezone.utc)
    today = now.date()
    start_date = today - timedelta(days=days - 1)
    start_dt = datetime(start_date.year, start_date.month, start_date.day, tzinfo=timezone.utc)

    buckets: dict[str, dict] = {}
    for i in range(days):
        d = start_date + timedelta(days=i)
        key = d.isoformat()
        buckets[key] = {
            "date": key,
            "new_students": 0,
            "new_requests": 0,
            "new_matches": 0,
            "confirmed_matches": 0,
            "new_messages": 0,
        }

    for (dt,) in db.query(Student.created_at).filter(Student.created_at >= start_dt).all():
        key = dt.date().isoformat()
        if key in buckets:
            buckets[key]["new_students"] += 1

    for (dt,) in (
        db.query(MatchingRequest.created_at)
        .filter(MatchingRequest.created_at >= start_dt)
        .all()
    ):
        key = dt.date().isoformat()
        if key in buckets:
            buckets[key]["new_requests"] += 1

    for m_created, m_status in (
        db.query(Match.created_at, Match.status)
        .filter(Match.created_at >= start_dt)
        .all()
    ):
        key = m_created.date().isoformat()
        if key in buckets:
            buckets[key]["new_matches"] += 1
            if m_status.value in ("CONFIRMED", "COMPLETED"):
                buckets[key]["confirmed_matches"] += 1

    for (dt,) in db.query(Message.created_at).filter(Message.created_at >= start_dt).all():
        key = dt.date().isoformat()
        if key in buckets:
            buckets[key]["new_messages"] += 1

    req_breakdown = {
        status_val.value: cnt
        for status_val, cnt in db.query(
            MatchingRequest.status, func.count(MatchingRequest.id)
        )
        .group_by(MatchingRequest.status)
        .all()
    }
    match_breakdown = {
        status_val.value: cnt
        for status_val, cnt in db.query(Match.status, func.count(Match.id))
        .group_by(Match.status)
        .all()
    }
    return {
        "days": days,
        "series": list(buckets.values()),
        "request_status_breakdown": req_breakdown,
        "match_status_breakdown": match_breakdown,
    }


def export_admin_csv(db: Session, resource: str) -> tuple[str, str]:
    buf = io.StringIO()
    writer = csv.writer(buf)

    if resource == "users":
        writer.writerow(["id", "email", "student_code", "full_name", "major", "role", "status", "created_at"])
        for s in db.query(Student).order_by(Student.created_at.desc()).limit(2000).all():
            p = s.profile
            writer.writerow([
                s.id,
                _csv_safe(s.email),
                _csv_safe(s.student_code),
                _csv_safe(p.full_name if p else ""),
                _csv_safe(p.major if p else ""),
                s.role.value,
                s.status.value,
                s.created_at.isoformat(),
            ])
    elif resource == "requests":
        writer.writerow(["id", "student_email", "course_code", "current_class", "target_class", "status", "created_at"])
        for r in db.query(MatchingRequest).order_by(MatchingRequest.created_at.desc()).limit(2000).all():
            stu = db.get(Student, r.student_id)
            crs = db.get(Course, r.course_id)
            c1 = db.get(AcademicClass, r.current_class_id)
            c2 = db.get(AcademicClass, r.target_class_id)
            writer.writerow([
                r.id,
                _csv_safe(stu.email if stu else ""),
                _csv_safe(crs.code if crs else ""),
                _csv_safe(c1.code if c1 else ""),
                _csv_safe(c2.code if c2 else ""),
                r.status.value,
                r.created_at.isoformat(),
            ])
    elif resource == "reports":
        writer.writerow(["id", "reporter_id", "reported_student_id", "reason", "status", "resolution_note", "created_at"])
        for rep in db.query(Report).order_by(Report.created_at.desc()).limit(2000).all():
            writer.writerow([
                rep.id,
                rep.reporter_id or rep.anonymized_reporter_ref or "",
                rep.reported_student_id or rep.anonymized_reported_ref or "",
                _csv_safe(rep.reason),
                rep.status.value,
                _csv_safe(rep.resolution_note or ""),
                rep.created_at.isoformat(),
            ])
    elif resource == "audit_logs":
        writer.writerow(["id", "actor_id", "action", "entity_type", "entity_id", "created_at"])
        for log in db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(2000).all():
            writer.writerow([
                log.id,
                log.actor_id or "",
                _csv_safe(log.action),
                _csv_safe(log.entity_type),
                log.entity_id or "",
                log.created_at.isoformat(),
            ])
    else:
        raise HTTPException(400, "Resource không hợp lệ (chỉ hỗ trợ users, requests, reports, audit_logs).")

    csv_content = "\ufeff" + buf.getvalue()
    filename = f"fpt_classswap_{resource}_{datetime.now(timezone.utc).strftime('%Y%m%d')}.csv"
    return filename, csv_content


def bulk_update_user_status(
    db: Session,
    actor: Student,
    student_ids: list[uuid.UUID],
    new_status: AccountStatus,
) -> dict:
    updated = 0
    skipped = 0
    now = datetime.now(timezone.utc)
    for sid in student_ids:
        target = db.get(Student, sid)
        if target is None or target.id == actor.id:
            skipped += 1
            continue
        if target.role == UserRole.SUPER_ADMIN and actor.role != UserRole.SUPER_ADMIN:
            skipped += 1
            continue
        if target.role == UserRole.SUPER_ADMIN and new_status != AccountStatus.ACTIVE:
            active_supers = (
                db.query(Student.id)
                .filter(
                    Student.role == UserRole.SUPER_ADMIN,
                    Student.status == AccountStatus.ACTIVE,
                    Student.id != target.id,
                )
                .count()
            )
            if active_supers == 0:
                skipped += 1
                continue
        target.status = new_status
        if new_status != AccountStatus.ACTIVE:
            target.token_version = int(target.token_version) + 1
            db.query(RefreshToken).filter(
                RefreshToken.student_id == target.id,
                RefreshToken.revoked_at.is_(None),
            ).update({"revoked_at": now}, synchronize_session=False)
            cancel_student_matches_and_notify(
                db,
                target.id,
                "Tài khoản đối tác đã bị tạm khóa. Yêu cầu đổi lớp của bạn đã được mở lại.",
            )
        updated += 1

    db.add(
        AuditLog(
            actor_id=actor.id,
            action="ADMIN_BULK_UPDATE_STATUS",
            entity_type="student",
            details={"status": new_status.value, "updated": updated, "skipped": skipped},
        )
    )
    db.commit()
    return {"updated": updated, "skipped": skipped}


def bulk_delete_requests(
    db: Session,
    actor: Student,
    request_ids: list[uuid.UUID],
) -> dict:
    deleted = 0
    for rid in request_ids:
        req = db.get(MatchingRequest, rid)
        if req is None:
            continue
        matches = (
            db.query(Match)
            .filter(or_(Match.request_low_id == rid, Match.request_high_id == rid))
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
            or_(Swipe.swiper_request_id == rid, Swipe.target_request_id == rid)
        ).delete(synchronize_session=False)
        db.delete(req)
        deleted += 1
    db.add(
        AuditLog(
            actor_id=actor.id,
            action="ADMIN_BULK_DELETE_REQUESTS",
            entity_type="matching_request",
            details={"deleted": deleted},
        )
    )
    db.commit()
    return {"deleted": deleted}


def _col_index(cell_ref: str) -> int:
    letters = "".join(ch for ch in cell_ref if ch.isalpha()).upper()
    idx = 0
    for ch in letters:
        idx = idx * 26 + (ord(ch) - ord("A") + 1)
    return max(0, idx - 1)


def _parse_xlsx_rows(raw_bytes: bytes) -> list[list[str]]:
    """Minimal OOXML .xlsx sheet1 reader using stdlib zipfile + ElementTree."""
    with zipfile.ZipFile(io.BytesIO(raw_bytes)) as zf:
        shared_strings: list[str] = []
        if "xl/sharedStrings.xml" in zf.namelist():
            ss_root = ET.fromstring(zf.read("xl/sharedStrings.xml"))
            for si in ss_root.findall("{*}si"):
                parts = [t.text or "" for t in si.iter() if t.tag.endswith("}t") or t.tag == "t"]
                shared_strings.append("".join(parts))

        sheet_names = sorted(
            n for n in zf.namelist() if n.startswith("xl/worksheets/sheet") and n.endswith(".xml")
        )
        if not sheet_names:
            raise HTTPException(422, "File Excel không chứa worksheet hợp lệ.")

        ws_root = ET.fromstring(zf.read(sheet_names[0]))
        rows: list[list[str]] = []
        for row_el in ws_root.iter():
            if not (row_el.tag.endswith("}row") or row_el.tag == "row"):
                continue
            cells_by_idx: dict[int, str] = {}
            max_idx = -1
            for c_el in row_el:
                if not (c_el.tag.endswith("}c") or c_el.tag == "c"):
                    continue
                ref = c_el.attrib.get("r", "A1")
                idx = _col_index(ref)
                max_idx = max(max_idx, idx)
                c_type = c_el.attrib.get("t", "")
                val = ""
                if c_type == "inlineStr":
                    val = "".join(
                        t.text or "" for t in c_el.iter() if t.tag.endswith("}t") or t.tag == "t"
                    )
                else:
                    v_el = next(
                        (child for child in c_el if child.tag.endswith("}v") or child.tag == "v"),
                        None,
                    )
                    if v_el is not None and v_el.text is not None:
                        if c_type == "s":
                            si_idx = int(v_el.text)
                            val = shared_strings[si_idx] if 0 <= si_idx < len(shared_strings) else ""
                        else:
                            val = v_el.text
                cells_by_idx[idx] = val.strip()
            if max_idx >= 0:
                rows.append([cells_by_idx.get(i, "") for i in range(max_idx + 1)])
        return rows


def _parse_csv_rows(raw_bytes: bytes) -> list[list[str]]:
    text = raw_bytes.decode("utf-8-sig", errors="replace")
    return [row for row in csv.reader(io.StringIO(text)) if any(cell.strip() for cell in row)]


def import_timetable_rows(
    db: Session,
    actor: Student,
    filename: str,
    content_base64: str,
    default_semester_id: uuid.UUID | None = None,
    default_campus_id: uuid.UUID | None = None,
) -> dict:
    raw_input = content_base64.strip()
    if "," in raw_input and raw_input.startswith("data:"):
        _, raw_input = raw_input.split(",", 1)
    try:
        raw_bytes = base64.b64decode(raw_input, validate=True)
    except Exception:
        raise HTTPException(422, "Dữ liệu file không hợp lệ (cần base64).")

    lower = filename.lower()
    if lower.endswith(".xlsx") or raw_bytes.startswith(b"PK"):
        try:
            matrix = _parse_xlsx_rows(raw_bytes)
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(422, f"Không đọc được file Excel .xlsx: {exc}")
    else:
        matrix = _parse_csv_rows(raw_bytes)

    if len(matrix) < 2:
        raise HTTPException(422, "File TKB phải có dòng tiêu đề và ít nhất 1 dòng dữ liệu.")

    headers = [h.strip().lower().replace(" ", "_") for h in matrix[0]]
    col_map = {h: idx for idx, h in enumerate(headers)}
    required = {"course_code", "class_code", "day_of_week", "slot"}
    if not required.issubset(col_map.keys()):
        raise HTTPException(
            422,
            "Thiếu cột bắt buộc: course_code, class_code, day_of_week, slot.",
        )

    campuses = {c.code.upper(): c for c in db.query(Campus).all()}
    semesters = {s.code.upper(): s for s in db.query(Semester).all()}
    courses = {c.code.upper(): c for c in db.query(Course).all()}

    fallback_sem = (
        db.get(Semester, default_semester_id)
        if default_semester_id
        else db.query(Semester).filter(Semester.is_active.is_(True)).first()
    )
    fallback_campus = (
        db.get(Campus, default_campus_id)
        if default_campus_id
        else db.query(Campus).order_by(Campus.code).first()
    )

    created_classes = 0
    updated_classes = 0
    created_schedules = 0
    errors: list[str] = []

    def _cell(row: list[str], name: str) -> str:
        idx = col_map.get(name)
        if idx is None or idx >= len(row):
            return ""
        return row[idx].strip()

    for line_no, row in enumerate(matrix[1:], start=2):
        course_code = _cell(row, "course_code").upper()
        class_code = _cell(row, "class_code").upper()
        day_of_week = _cell(row, "day_of_week")
        slot = _cell(row, "slot")
        room = _cell(row, "room") or None
        lecturer = _cell(row, "lecturer") or None
        campus_code = _cell(row, "campus_code").upper()
        semester_code = _cell(row, "semester_code").upper()

        if not (course_code and class_code and day_of_week and slot):
            errors.append(f"Dòng {line_no}: thiếu thông tin bắt buộc.")
            continue

        course = courses.get(course_code)
        if course is None:
            course = Course(
                code=course_code,
                name=_cell(row, "course_name") or course_code,
                credits=3,
            )
            db.add(course)
            db.flush()
            courses[course_code] = course

        campus = campuses.get(campus_code) if campus_code else fallback_campus
        semester = semesters.get(semester_code) if semester_code else fallback_sem
        if campus is None or semester is None:
            errors.append(f"Dòng {line_no}: không xác định được campus hoặc semester.")
            continue

        cls = (
            db.query(AcademicClass)
            .filter(
                AcademicClass.code == class_code,
                AcademicClass.semester_id == semester.id,
                AcademicClass.campus_id == campus.id,
            )
            .first()
        )
        if cls is None:
            cls = AcademicClass(
                code=class_code,
                course_id=course.id,
                semester_id=semester.id,
                campus_id=campus.id,
                lecturer=lecturer,
                is_swappable=True,
            )
            db.add(cls)
            db.flush()
            created_classes += 1
        else:
            if lecturer:
                cls.lecturer = lecturer
            updated_classes += 1

        existing_sched = (
            db.query(ClassSchedule)
            .filter(
                ClassSchedule.class_id == cls.id,
                ClassSchedule.day_of_week == day_of_week,
                ClassSchedule.slot == slot,
            )
            .first()
        )
        if existing_sched is None:
            db.add(
                ClassSchedule(
                    class_id=cls.id,
                    day_of_week=day_of_week,
                    slot=slot,
                    room=room,
                )
            )
            created_schedules += 1
        elif room is not None:
            existing_sched.room = room

    db.add(
        AuditLog(
            actor_id=actor.id,
            action="ADMIN_IMPORT_TIMETABLE",
            entity_type="academic_class",
            details={
                "filename": filename,
                "created_classes": created_classes,
                "updated_classes": updated_classes,
                "created_schedules": created_schedules,
                "error_count": len(errors),
            },
        )
    )
    db.commit()
    return {
        "created_classes": created_classes,
        "updated_classes": updated_classes,
        "created_schedules": created_schedules,
        "errors": errors[:20],
    }


def broadcast_system_announcement(
    db: Session,
    actor: Student,
    title: str,
    body: str,
    campus_id: uuid.UUID | None = None,
) -> dict:
    q = db.query(Student).filter(Student.status == AccountStatus.ACTIVE)
    if campus_id is not None:
        q = q.filter(Student.campus_id == campus_id)
    targets = q.all()
    sent_count = 0
    for target in targets:
        db.add(
            Notification(
                student_id=target.id,
                notification_type=NotificationType.SYSTEM,
                title=title.strip(),
                body=body.strip(),
                is_read=False,
                reference_id=None,
            )
        )
        dispatch_out_of_app(db, target.id, title.strip(), body.strip(), kind="SYSTEM")
        sent_count += 1

    db.add(
        AuditLog(
            actor_id=actor.id,
            action="ADMIN_BROADCAST",
            entity_type="notification",
            details={
                "title": title.strip(),
                "campus_id": str(campus_id) if campus_id else None,
                "sent_count": sent_count,
            },
        )
    )
    db.commit()
    return {"sent_count": sent_count}
