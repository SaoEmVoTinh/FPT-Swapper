"""Tests for P2 features: out-of-app notifications, insights/heatmap, chat media/read/rate-limit, admin analytics/CSV/bulk/import/broadcast, and ND13 consent."""

import base64
import io
import pathlib
import uuid
import zipfile
from xml.sax.saxutils import escape as xml_escape

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.common.enums import UserRole
from app.core.rate_limit import clear_rate_limits
from app.database.base import Base
from app.database.models import (
    AcademicClass,
    Campus,
    ClassSchedule,
    Course,
    Notification,
    Semester,
    Student,
    StudentProfile,
)
from app.database.session import get_db
from app.main import app
from app.modules.notifications.delivery import clear_recent_dispatches, get_recent_dispatches
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_p2.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Minimal valid 1x1 PNG bytes
_TINY_PNG = base64.b64decode(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+X2Z0AAAAASUVORK5CYII="
)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    if not db.get(Campus, CAMPUS_ID):
        db.add(Campus(id=CAMPUS_ID, code="HN", name="Hà Nội"))
        db.commit()
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    pathlib.Path("test_p2.db").unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def reset_state():
    clear_rate_limits()
    clear_recent_dispatches()
    yield
    clear_rate_limits()
    clear_recent_dispatches()


@pytest.fixture(scope="session")
def db_session():
    db = TestingSessionLocal()
    yield db
    db.close()


@pytest.fixture(scope="session")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


def _make_profiled_student(db, email: str, full_name: str, role: UserRole = UserRole.STUDENT):
    stu, tok = make_student(db, email, role=role)
    db.add(
        StudentProfile(
            student_id=stu.id,
            full_name=full_name,
            major="SE",
        )
    )
    db.commit()
    db.refresh(stu)
    return stu, tok


def _build_sample_xlsx(rows: list[list[str]]) -> bytes:
    """Create a minimal valid OOXML .xlsx archive in memory for import testing."""
    sheet_rows = []
    for r_idx, row in enumerate(rows, start=1):
        cells = []
        for c_idx, val in enumerate(row):
            col_letter = chr(ord("A") + c_idx)
            cells.append(f'<c r="{col_letter}{r_idx}" t="inlineStr"><is><t>{xml_escape(val)}</t></is></c>')
        sheet_rows.append(f'<row r="{r_idx}">{"".join(cells)}</row>')
    sheet_xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
        f'<sheetData>{"".join(sheet_rows)}</sheetData></worksheet>'
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)
    return buf.getvalue()


def test_nd13_consent_and_out_of_app_notifications(client, db_session):
    # Explicit agree_privacy_terms=False must fail 422
    r_reject = client.post(
        "/api/v1/auth/register",
        json={
            "email": "noconsent@fpt.edu.vn",
            "student_code": "HE990001",
            "full_name": "No Consent",
            "major": "SE",
            "campus_id": str(CAMPUS_ID),
            "password": "StrongPw8",
            "agree_privacy_terms": False,
        },
    )
    assert r_reject.status_code == 422

    r_ok = client.post(
        "/api/v1/auth/register",
        json={
            "email": "consent@fpt.edu.vn",
            "student_code": "HE990002",
            "full_name": "With Consent",
            "major": "SE",
            "campus_id": str(CAMPUS_ID),
            "password": "StrongPw8",
            "agree_privacy_terms": True,
        },
    )
    assert r_ok.status_code == 201
    stu = db_session.query(Student).filter(Student.email == "consent@fpt.edu.vn").first()
    assert stu is not None
    assert stu.consent_accepted_at is not None
    assert stu.consent_version == "2026-L91-ND356-v1"

    cookies = {"access_token": r_ok.cookies.get("access_token")}
    # Update notification preferences & register push subscription
    pref = client.put(
        "/api/v1/notifications/preferences",
        json={"notify_email": False, "notify_push": True},
        cookies=cookies,
    )
    assert pref.status_code == 200
    assert pref.json()["notify_email"] is False
    assert pref.json()["notify_push"] is True

    sub = client.post(
        "/api/v1/notifications/push-subscriptions",
        json={
            "endpoint": "https://push.example.local/sub/12345",
            "keys": {"p256dh": "test_p256dh_key", "auth": "test_auth_key"},
            "user_agent": "pytest",
        },
        cookies=cookies,
    )
    assert sub.status_code == 201

    disp = client.post("/api/v1/notifications/test-dispatch", cookies=cookies)
    assert disp.status_code == 200
    assert disp.json()["push_targets"] == 1
    assert any(d["kind"] == "SYSTEM" for d in get_recent_dispatches())

    assert client.delete("/api/v1/notifications/push-subscriptions", cookies=cookies).status_code == 200


def test_insights_recommendations_heatmap_and_chat_p2(client, db_session):
    stu_a, tok_a = _make_profiled_student(db_session, "p2_a@fpt.edu.vn", "Alice P2")
    stu_b, tok_b = _make_profiled_student(db_session, "p2_b@fpt.edu.vn", "Bob P2")

    sem = Semester(id=uuid.uuid4(), code="SP26_P2", name="Spring 2026 P2", is_active=True)
    course = Course(id=uuid.uuid4(), code="SWP391_P2", name="SWP Project", credits=3)
    db_session.add_all([sem, course])
    db_session.flush()

    c1 = AcademicClass(
        id=uuid.uuid4(), course_id=course.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1801_P2"
    )
    c2 = AcademicClass(
        id=uuid.uuid4(), course_id=course.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1802_P2"
    )
    db_session.add_all([c1, c2])
    db_session.flush()
    db_session.add_all([
        ClassSchedule(class_id=c1.id, day_of_week="Thứ 2", slot="Slot 1 (07:00 - 09:15)"),
        ClassSchedule(class_id=c2.id, day_of_week="Thứ 3", slot="Slot 2 (09:30 - 11:45)"),
    ])
    db_session.commit()

    req_a = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(c1.id),
            "target_class_id": str(c2.id),
        },
        headers=auth_headers(tok_a),
    ).json()
    req_b = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(c2.id),
            "target_class_id": str(c1.id),
        },
        headers=auth_headers(tok_b),
    ).json()

    # B likes A -> A receives LIKE notification & sees B at top of insights recommendations + heatmap
    sw_b = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_b["id"], "target_request_id": req_a["id"], "action": "LIKE"},
        headers=auth_headers(tok_b),
    )
    assert sw_b.status_code == 200 and sw_b.json()["match_created"] is False
    assert (
        db_session.query(Notification)
        .filter(Notification.student_id == stu_a.id, Notification.title.contains("Like"))
        .first()
        is not None
    )

    ins = client.get("/api/v1/class-swap/insights", headers=auth_headers(tok_a))
    assert ins.status_code == 200
    ins_data = ins.json()
    assert len(ins_data["recommendations"]) >= 1
    assert ins_data["recommendations"][0]["is_reciprocal_ready"] is True
    assert ins_data["recommendations"][0]["score"] >= 80
    assert any(h["class_code"] == "SE1801_P2" and h["entering_count"] >= 1 for h in ins_data["heatmap"])

    # A likes B -> Match created -> chat image upload, read receipt, and rate-limit
    sw_a = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_a["id"], "target_request_id": req_b["id"], "action": "LIKE"},
        headers=auth_headers(tok_a),
    )
    assert sw_a.status_code == 200 and sw_a.json()["match_created"] is True
    conv_id = sw_a.json()["match"]["conversation_id"]

    up = client.post(
        f"/api/v1/conversations/{conv_id}/attachments",
        json={"data_url": f"data:image/png;base64,{base64.b64encode(_TINY_PNG).decode()}"},
        headers=auth_headers(tok_a),
    )
    assert up.status_code == 200
    att_url = up.json()["attachment_url"]

    img_msg = client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "Đây là TKB của mình", "attachment_url": att_url, "message_type": "IMAGE"},
        headers=auth_headers(tok_a),
    )
    assert img_msg.status_code == 200
    assert img_msg.json()["message_type"] == "IMAGE"
    assert img_msg.json()["attachment_url"] == att_url

    # Attachment can be fetched back
    assert client.get(att_url).status_code == 200
    # Clean up uploaded test file
    fname = att_url.rsplit("/", 1)[-1]
    (pathlib.Path("uploads/chat") / fname).unlink(missing_ok=True)

    # B marks read -> A sees partner_last_read_at
    assert client.post(f"/api/v1/conversations/{conv_id}/read", headers=auth_headers(tok_b)).status_code == 200
    conv_a = client.get(f"/api/v1/conversations/{conv_id}", headers=auth_headers(tok_a)).json()
    assert conv_a["partner_last_read_at"] is not None

    # Anti-spam rate limit: > 20 messages within 30s returns 429
    clear_rate_limits()
    for i in range(20):
        res = client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": f"msg {i}"},
            headers=auth_headers(tok_a),
        )
        assert res.status_code == 200
    spam = client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "spam 21"},
        headers=auth_headers(tok_a),
    )
    assert spam.status_code == 429


def test_admin_p2_analytics_csv_bulk_import_and_broadcast(client, db_session):
    admin, tok_admin = _make_profiled_student(db_session, "p2_admin@fpt.edu.vn", "Admin P2", role=UserRole.ADMIN)
    stu_1, _ = _make_profiled_student(db_session, "p2_u1@fpt.edu.vn", "User One")
    stu_2, _ = _make_profiled_student(db_session, "p2_u2@fpt.edu.vn", "User Two")

    # Analytics
    an = client.get("/api/v1/admin/analytics?days=7", headers=auth_headers(tok_admin))
    assert an.status_code == 200
    assert len(an.json()["series"]) == 7

    # CSV exports
    for res_name in ("users", "requests", "reports", "audit_logs"):
        exp = client.get(f"/api/v1/admin/export/{res_name}", headers=auth_headers(tok_admin))
        assert exp.status_code == 200
        assert "text/csv" in exp.headers["content-type"]

    # Bulk user status
    bulk = client.post(
        "/api/v1/admin/users/bulk-status",
        json={"student_ids": [str(stu_1.id), str(stu_2.id)], "status": "SUSPENDED"},
        headers=auth_headers(tok_admin),
    )
    assert bulk.status_code == 200
    assert bulk.json()["updated"] == 2

    assert (
        client.post(
            "/api/v1/admin/users/bulk-status",
            json={"student_ids": [str(stu_1.id), str(stu_2.id)], "status": "ACTIVE"},
            headers=auth_headers(tok_admin),
        ).json()["updated"]
        == 2
    )

    # Timetable import via real .xlsx bytes
    sem = Semester(id=uuid.uuid4(), code="FA26_IMP", name="Fall 2026 Import", is_active=False)
    db_session.add(sem)
    db_session.commit()

    xlsx_bytes = _build_sample_xlsx([
        ["course_code", "class_code", "day_of_week", "slot", "room", "lecturer", "campus_code", "semester_code"],
        ["VOV121", "VOV121_HN_01", "Thứ 2 & Thứ 4", "Slot 1 (07:00 - 08:30)", "Sân Võ", "Thay A", "HN", "FA26_IMP"],
        ["PRN212", "SE1899", "Thứ 3 & Thứ 5", "Slot 2 (09:30 - 11:45)", "AL-301", "Co B", "HN", "FA26_IMP"],
    ])
    imp = client.post(
        "/api/v1/admin/academic/import-timetable",
        json={
            "filename": "tkb_fa26.xlsx",
            "content_base64": base64.b64encode(xlsx_bytes).decode(),
        },
        headers=auth_headers(tok_admin),
    )
    assert imp.status_code == 200
    assert imp.json()["created_classes"] == 2
    assert imp.json()["created_schedules"] == 2
    assert db_session.query(AcademicClass).filter(AcademicClass.code == "VOV121_HN_01").first() is not None

    # Global broadcast
    bc = client.post(
        "/api/v1/admin/broadcast",
        json={"title": "Mở đợt đổi lớp Fall 2026", "body": "Hệ thống đã cập nhật lịch mới."},
        headers=auth_headers(tok_admin),
    )
    assert bc.status_code == 200
    assert bc.json()["sent_count"] >= 2
    assert (
        db_session.query(Notification)
        .filter(Notification.student_id == stu_1.id, Notification.title == "Mở đợt đổi lớp Fall 2026")
        .first()
        is not None
    )
