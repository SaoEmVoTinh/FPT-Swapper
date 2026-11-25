"""Tests for Super Admin endpoints (/api/v1/admin/*)."""

import pathlib
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.common.enums import (
    AccountStatus,
    ConversationSourceType,
    MatchStatus,
    NotificationType,
    SwapRequestStatus,
    SwipeAction,
    UserRole,
)
from app.core.config import settings
from app.database.base import Base
from app.database.models import (
    AcademicClass,
    Campus,
    Conversation,
    ConversationMember,
    Course,
    Match,
    MatchingRequest,
    Message,
    Notification,
    Semester,
    Student,
    Swipe,
)
from app.database.session import get_db
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_admin.db"
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
    pathlib.Path("test_admin.db").unlink(missing_ok=True)


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


@pytest.fixture(scope="session")
def tokens(db_session):
    super_admin, super_token = make_student(
        db_session,
        settings.ADMIN_EMAIL,
        role=UserRole.SUPER_ADMIN,
        student_code="DE210638",
    )
    _, other_admin_token = make_student(
        db_session,
        "other_admin@fpt.edu.vn",
        role=UserRole.ADMIN,
        student_code="DE990001",
    )
    _, student_token = make_student(
        db_session,
        "normal_student@fpt.edu.vn",
        role=UserRole.STUDENT,
        student_code="DE990002",
    )
    return {
        "super_admin": super_admin,
        "super_token": super_token,
        "other_admin_token": other_admin_token,
        "student_token": student_token,
    }


def test_admin_rbac_hierarchy(client, tokens):
    # Unauthenticated -> 401
    assert client.get("/api/v1/admin/overview").status_code == 401

    # Normal student -> 403
    r_student = client.get(
        "/api/v1/admin/overview",
        headers=auth_headers(tokens["student_token"]),
    )
    assert r_student.status_code == 403

    # Regular ADMIN can read overview & users, but gets 403 on SUPER_ADMIN endpoints
    r_other_admin = client.get(
        "/api/v1/admin/overview",
        headers=auth_headers(tokens["other_admin_token"]),
    )
    assert r_other_admin.status_code == 200
    assert (
        client.patch(
            f"/api/v1/admin/users/{tokens['super_admin'].id}/role",
            json={"role": "STUDENT"},
            headers=auth_headers(tokens["other_admin_token"]),
        ).status_code
        == 403
    )
    assert (
        client.delete(
            f"/api/v1/admin/users/{tokens['super_admin'].id}",
            headers=auth_headers(tokens["other_admin_token"]),
        ).status_code
        == 403
    )

    # SUPER_ADMIN -> 200
    r_super = client.get(
        "/api/v1/admin/overview",
        headers=auth_headers(tokens["super_token"]),
    )
    assert r_super.status_code == 200
    assert r_super.json()["total_students"] >= 3


def test_super_admin_user_lifecycle_create_suspend_reset_delete(
    client, db_session, tokens
):
    headers = auth_headers(tokens["super_token"])

    # 1. Create user
    r_create = client.post(
        "/api/v1/admin/users",
        json={
            "email": "created_by_admin@fpt.edu.vn",
            "student_code": "DE210777",
            "full_name": "Created Student",
            "major": "Kỹ thuật phần mềm",
            "campus_id": str(CAMPUS_ID),
            "password": "InitPassword1",
            "role": "STUDENT",
        },
        headers=headers,
    )
    assert r_create.status_code == 201
    created = r_create.json()
    created_id = created["id"]
    assert created["student_code"] == "DE210777"
    assert created["status"] == AccountStatus.ACTIVE.value

    # 2. Search users by student_code
    r_list = client.get("/api/v1/admin/users?q=DE210777", headers=headers)
    assert r_list.status_code == 200
    assert any(u["id"] == created_id for u in r_list.json())

    # 3. Suspend user -> login fails with 403
    r_suspend = client.patch(
        f"/api/v1/admin/users/{created_id}/status",
        json={"status": "SUSPENDED"},
        headers=headers,
    )
    assert r_suspend.status_code == 200
    assert r_suspend.json()["status"] == "SUSPENDED"
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "DE210777", "password": "InitPassword1"},
        ).status_code
        == 403
    )

    # 4. Reactivate and reset password -> login succeeds with new password
    r_activate = client.patch(
        f"/api/v1/admin/users/{created_id}/status",
        json={"status": "ACTIVE"},
        headers=headers,
    )
    assert r_activate.status_code == 200

    r_reset = client.post(
        f"/api/v1/admin/users/{created_id}/reset-password",
        json={"new_password": "NewPassword9"},
        headers=headers,
    )
    assert r_reset.status_code == 204
    assert (
        client.post(
            "/api/v1/auth/login",
            json={"email": "DE210777", "password": "NewPassword9"},
        ).status_code
        == 200
    )

    # 5. Cannot delete or suspend self
    self_id = str(tokens["super_admin"].id)
    assert client.delete(f"/api/v1/admin/users/{self_id}", headers=headers).status_code == 400
    assert (
        client.patch(
            f"/api/v1/admin/users/{self_id}/status",
            json={"status": "SUSPENDED"},
            headers=headers,
        ).status_code
        == 400
    )

    # 6. Attach request, swipe, match, conversation, message, notification before delete
    peer, _ = make_student(
        db_session,
        "peer_for_delete@fpt.edu.vn",
        student_code="DE210888",
    )
    sem = Semester(id=uuid.uuid4(), code="AD26", name="Admin Sem", is_active=True)
    crs = Course(id=uuid.uuid4(), code="ADM101", name="Admin Test Course", credits=3)
    db_session.add_all([sem, crs])
    db_session.flush()
    cls_a = AcademicClass(
        id=uuid.uuid4(),
        code="ADM_01",
        course_id=crs.id,
        semester_id=sem.id,
        campus_id=CAMPUS_ID,
    )
    cls_b = AcademicClass(
        id=uuid.uuid4(),
        code="ADM_02",
        course_id=crs.id,
        semester_id=sem.id,
        campus_id=CAMPUS_ID,
    )
    db_session.add_all([cls_a, cls_b])
    db_session.flush()

    target_uuid = uuid.UUID(created_id)
    req_a = MatchingRequest(
        id=uuid.uuid4(),
        student_id=target_uuid,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=cls_a.id,
        target_class_id=cls_b.id,
        status=SwapRequestStatus.ACTIVE,
    )
    req_b = MatchingRequest(
        id=uuid.uuid4(),
        student_id=peer.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=cls_b.id,
        target_class_id=cls_a.id,
        status=SwapRequestStatus.ACTIVE,
    )
    db_session.add_all([req_a, req_b])
    db_session.flush()

    swipe = Swipe(
        id=uuid.uuid4(),
        swiper_request_id=req_a.id,
        target_request_id=req_b.id,
        swiper_student_id=target_uuid,
        action=SwipeAction.LIKE,
    )
    low_id, high_id = sorted([req_a.id, req_b.id])
    match = Match(
        id=uuid.uuid4(),
        request_low_id=low_id,
        request_high_id=high_id,
        student_a_id=target_uuid,
        student_b_id=peer.id,
        status=MatchStatus.CONFIRMED,
    )
    db_session.add_all([swipe, match])
    db_session.flush()

    conv = Conversation(
        id=uuid.uuid4(),
        source_type=ConversationSourceType.CLASS_SWAP,
        source_id=match.id,
    )
    db_session.add(conv)
    db_session.flush()
    db_session.add_all(
        [
            ConversationMember(id=uuid.uuid4(), conversation_id=conv.id, student_id=target_uuid),
            ConversationMember(id=uuid.uuid4(), conversation_id=conv.id, student_id=peer.id),
            Message(
                id=uuid.uuid4(),
                conversation_id=conv.id,
                sender_id=target_uuid,
                client_message_id=str(uuid.uuid4()),
                content="hello",
            ),
            Notification(
                id=uuid.uuid4(),
                student_id=target_uuid,
                notification_type=NotificationType.SYSTEM,
                title="Hi",
                body="Test",
            ),
        ]
    )
    db_session.commit()

    # Delete request and verify audit log + clean user deletion
    r_del = client.delete(f"/api/v1/admin/users/{created_id}", headers=headers)
    assert r_del.status_code == 204
    db_session.expire_all()
    assert db_session.get(Student, target_uuid) is None

    # Peer request can also be deleted via /admin/requests/{id}
    r_reqs = client.get("/api/v1/admin/requests", headers=headers)
    assert r_reqs.status_code == 200
    assert any(item["id"] == str(req_b.id) for item in r_reqs.json())

    r_del_req = client.delete(
        f"/api/v1/admin/requests/{req_b.id}", headers=headers
    )
    assert r_del_req.status_code == 204

    r_logs = client.get("/api/v1/admin/audit-logs", headers=headers)
    assert r_logs.status_code == 200
    actions = {item["action"] for item in r_logs.json()}
    assert "ADMIN_CREATE_USER" in actions
    assert "ADMIN_DELETE_USER" in actions
    assert "ADMIN_DELETE_REQUEST" in actions
