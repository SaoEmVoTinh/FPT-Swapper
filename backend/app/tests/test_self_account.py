"""Tests for User Self-Service Account Management (/api/v1/students/me/*)."""

import pathlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.common.enums import NotificationType, SwapRequestStatus, UserRole
from app.core.config import settings
from app.database.base import Base
from app.database.models import (
    AcademicClass,
    Campus,
    Course,
    MatchingRequest,
    Notification,
    Semester,
    Student,
)
from app.database.session import get_db
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_self_account.db"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


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
    pathlib.Path("test_self_account.db").unlink(missing_ok=True)


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


def test_self_account_management_full_flow(client, db_session):
    user, token = make_student(
        db_session,
        "self_user@fpt.edu.vn",
        student_code="DE190001",
    )
    other, _ = make_student(
        db_session,
        "other_user@fpt.edu.vn",
        student_code="DE190002",
    )
    headers = auth_headers(token)

    # Seed request + notification
    sem = Semester(id=uuid.uuid4(), code="SA26", name="Self Sem", is_active=True)
    crs = Course(id=uuid.uuid4(), code="SLF101", name="Self Course", credits=3)
    db_session.add_all([sem, crs])
    db_session.flush()
    cls_a = AcademicClass(
        id=uuid.uuid4(),
        code="SLF_01",
        course_id=crs.id,
        semester_id=sem.id,
        campus_id=CAMPUS_ID,
    )
    cls_b = AcademicClass(
        id=uuid.uuid4(),
        code="SLF_02",
        course_id=crs.id,
        semester_id=sem.id,
        campus_id=CAMPUS_ID,
    )
    db_session.add_all([cls_a, cls_b])
    db_session.flush()

    req = MatchingRequest(
        id=uuid.uuid4(),
        student_id=user.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=cls_a.id,
        target_class_id=cls_b.id,
        status=SwapRequestStatus.ACTIVE,
    )
    notif = Notification(
        id=uuid.uuid4(),
        student_id=user.id,
        notification_type=NotificationType.SYSTEM,
        title="Welcome",
        body="Hello self account",
    )
    db_session.add_all([req, notif])
    db_session.commit()

    # 1. Summary reflects stats
    r_sum = client.get("/api/v1/students/me/summary", headers=headers)
    assert r_sum.status_code == 200
    assert r_sum.json()["active_requests"] == 1
    assert r_sum.json()["unread_notifications"] == 1

    # 2. Pause-all and resume-all requests
    r_pause = client.post("/api/v1/students/me/requests/pause-all", headers=headers)
    assert r_pause.status_code == 200
    assert r_pause.json()["updated_count"] == 1

    r_resume = client.post("/api/v1/students/me/requests/resume-all", headers=headers)
    assert r_resume.status_code == 200
    assert r_resume.json()["updated_count"] == 1

    # 3. Update email & student_code (duplicate rejected with 409)
    r_dup = client.patch(
        "/api/v1/students/me/account",
        json={"email": other.email},
        headers=headers,
    )
    assert r_dup.status_code == 409

    r_upd = client.patch(
        "/api/v1/students/me/account",
        json={"email": "self_renamed@fpt.edu.vn", "student_code": "DE190999"},
        headers=headers,
    )
    assert r_upd.status_code == 200
    assert r_upd.json()["email"] == "self_renamed@fpt.edu.vn"
    assert r_upd.json()["student_code"] == "DE190999"

    # 4. Change password (wrong current -> 400, same -> 400, valid -> 204)
    assert (
        client.post(
            "/api/v1/students/me/change-password",
            json={"current_password": "WrongPassword", "new_password": "NewPassword2"},
            headers=headers,
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/v1/students/me/change-password",
            json={"current_password": "Pass@12345", "new_password": "Pass@12345"},
            headers=headers,
        ).status_code
        == 400
    )
    r_pw = client.post(
        "/api/v1/students/me/change-password",
        json={"current_password": "Pass@12345", "new_password": "NewPassword2"},
        headers=headers,
    )
    assert r_pw.status_code == 204

    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "DE190999", "password": "NewPassword2"},
        ).status_code
        == 200
    )

    # 5. Export personal data
    r_exp = client.get("/api/v1/students/me/export", headers=headers)
    assert r_exp.status_code == 200
    exp = r_exp.json()
    assert exp["account"]["student_code"] == "DE190999"
    assert len(exp["requests"]) == 1
    assert len(exp["notifications"]) == 1

    # 6. Delete own account (wrong password -> 400, valid -> 204 and user purged)
    assert (
        client.request(
            "DELETE",
            "/api/v1/students/me",
            json={"password": "WrongPassword"},
            headers=headers,
        ).status_code
        == 400
    )
    r_del = client.request(
        "DELETE",
        "/api/v1/students/me",
        json={"password": "NewPassword2"},
        headers=headers,
    )
    assert r_del.status_code == 204
    db_session.expire_all()
    closed_user = db_session.get(Student, user.id)
    assert closed_user is not None
    assert closed_user.status.value == "CLOSED"
    assert closed_user.scheduled_purge_at is not None


def test_super_admin_cannot_self_delete_or_change_email(client, db_session):
    _, admin_token = make_student(
        db_session,
        settings.ADMIN_EMAIL,
        role=UserRole.SUPER_ADMIN,
        student_code="DE210638",
    )
    headers = auth_headers(admin_token)

    assert (
        client.patch(
            "/api/v1/students/me/account",
            json={"email": "another_email@fpt.edu.vn"},
            headers=headers,
        ).status_code
        == 400
    )
    assert (
        client.request(
            "DELETE",
            "/api/v1/students/me",
            json={"password": "Pass@12345"},
            headers=headers,
        ).status_code
        == 400
    )
