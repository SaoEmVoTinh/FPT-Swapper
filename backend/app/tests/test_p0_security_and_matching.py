"""Tests for P0 security, RBAC, 2FA, Match conflict/expiry, and safe account deletion."""

import pathlib
import uuid
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.common.enums import (
    AccountStatus,
    MatchStatus,
    SwapRequestStatus,
    SwipeAction,
    UserRole,
)
from app.core.rate_limit import clear_rate_limits
from app.core.totp import current_totp
from app.database.base import Base
from app.database.models import (
    AcademicClass,
    Campus,
    Course,
    Match,
    MatchingRequest,
    Notification,
    Report,
    Semester,
    Student,
)
from app.database.session import get_db
from app.main import app
from app.modules.students.cleanup import purge_student_account
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_p0.db"
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
    pathlib.Path("test_p0.db").unlink(missing_ok=True)


@pytest.fixture(autouse=True)
def reset_limits():
    clear_rate_limits()
    yield
    clear_rate_limits()


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


def test_password_minimum_8_chars_and_refresh_rotation_revocation(client, db_session):
    # 7-char password rejected -> 422
    r_short = client.post(
        "/api/v1/auth/register",
        json={
            "email": "shortpw@fpt.edu.vn",
            "student_code": "DE200101",
            "full_name": "Short Password",
            "major": "SE",
            "campus_id": str(CAMPUS_ID),
            "password": "1234567",
        },
    )
    assert r_short.status_code == 422

    # Valid 8-char password succeeds
    r_reg = client.post(
        "/api/v1/auth/register",
        json={
            "email": "goodpw@fpt.edu.vn",
            "student_code": "DE200102",
            "full_name": "Good Password",
            "major": "SE",
            "campus_id": str(CAMPUS_ID),
            "password": "StrongPw8",
        },
    )
    assert r_reg.status_code == 201
    old_refresh = r_reg.cookies.get("refresh_token")
    assert old_refresh

    # Rotate refresh token once -> new refresh token issued
    r_ref1 = client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert r_ref1.status_code == 200
    rotated_refresh = r_ref1.cookies.get("refresh_token")
    assert rotated_refresh and rotated_refresh != old_refresh

    # Reusing already-rotated refresh token fails -> 401 and revokes active tokens
    r_reuse = client.post(
        "/api/v1/auth/refresh",
        cookies={"refresh_token": old_refresh},
    )
    assert r_reuse.status_code == 401
    assert (
        client.post(
            "/api/v1/auth/refresh",
            cookies={"refresh_token": rotated_refresh},
        ).status_code
        == 401
    )

    # Fresh login, then change password -> old access & refresh tokens are revoked
    r_login = client.post(
        "/api/v1/auth/login",
        json={"email": "DE200102", "password": "StrongPw8"},
    )
    assert r_login.status_code == 200
    access_before = r_login.cookies.get("access_token")
    refresh_before = r_login.cookies.get("refresh_token")

    assert (
        client.post(
            "/api/v1/students/me/change-password",
            json={"current_password": "StrongPw8", "new_password": "NewStrong9"},
            cookies={"access_token": access_before},
        ).status_code
        == 204
    )
    assert (
        client.get("/api/v1/auth/me", cookies={"access_token": access_before}).status_code
        == 401
    )
    assert (
        client.post(
            "/api/v1/auth/refresh", cookies={"refresh_token": refresh_before}
        ).status_code
        == 401
    )


def test_bruteforce_lockout_and_rate_limit(client, db_session):
    make_student(db_session, "locktest@fpt.edu.vn", student_code="DE200201")

    for _ in range(4):
        r = client.post(
            "/api/v1/auth/login",
            json={"email": "locktest@fpt.edu.vn", "password": "WrongPassword1"},
        )
        assert r.status_code == 401

    # 5th failed attempt triggers temporary lockout -> 429
    r_5th = client.post(
        "/api/v1/auth/login",
        json={"email": "locktest@fpt.edu.vn", "password": "WrongPassword1"},
    )
    assert r_5th.status_code == 429

    # Even correct password stays locked -> 429
    r_locked = client.post(
        "/api/v1/auth/login",
        json={"email": "locktest@fpt.edu.vn", "password": "Pass@12345"},
    )
    assert r_locked.status_code == 429


def test_multi_admin_rbac_and_2fa_totp(client, db_session):
    super_admin, super_token = make_student(
        db_session,
        "super_backup@fpt.edu.vn",
        role=UserRole.SUPER_ADMIN,
        student_code="DE200301",
    )
    mod_user, mod_token = make_student(
        db_session,
        "mod_candidate@fpt.edu.vn",
        role=UserRole.STUDENT,
        student_code="DE200302",
    )
    super_headers = auth_headers(super_token)

    # Promote student -> MODERATOR
    r_prom = client.patch(
        f"/api/v1/admin/users/{mod_user.id}/role",
        json={"role": "MODERATOR"},
        headers=super_headers,
    )
    assert r_prom.status_code == 200
    assert r_prom.json()["role"] == "MODERATOR"

    mod_headers = auth_headers(mod_token)
    assert client.get("/api/v1/admin/overview", headers=mod_headers).status_code == 200
    assert (
        client.delete(
            f"/api/v1/admin/users/{super_admin.id}", headers=mod_headers
        ).status_code
        == 403
    )

    # Setup & Enable 2FA for super_admin
    r_setup = client.post("/api/v1/auth/2fa/setup", headers=super_headers)
    assert r_setup.status_code == 200
    secret = r_setup.json()["secret"]
    assert "otpauth://totp/" in r_setup.json()["otpauth_uri"]

    otp = current_totp(secret)
    r_enable = client.post(
        "/api/v1/auth/2fa/enable", json={"code": otp}, headers=super_headers
    )
    assert r_enable.status_code == 200
    assert r_enable.json()["totp_enabled"] is True

    # Login without OTP -> 403 with X-2FA-Required
    r_no_otp = client.post(
        "/api/v1/auth/login",
        json={"email": "super_backup@fpt.edu.vn", "password": "Pass@12345"},
    )
    assert r_no_otp.status_code == 403
    assert r_no_otp.headers.get("X-2FA-Required") == "true"

    # Login with valid OTP -> 200
    r_ok = client.post(
        "/api/v1/auth/login",
        json={
            "email": "super_backup@fpt.edu.vn",
            "password": "Pass@12345",
            "totp_code": current_totp(secret),
        },
    )
    assert r_ok.status_code == 200

    # Disable 2FA
    assert (
        client.post(
            "/api/v1/auth/2fa/disable",
            json={"password": "Pass@12345", "code": current_totp(secret)},
            headers=super_headers,
        ).status_code
        == 200
    )


def test_match_conflict_cancellation_and_48h_request_expiry(client, db_session):
    stu_a, tok_a = make_student(db_session, "mat_a@fpt.edu.vn", student_code="DE200401")
    stu_b, tok_b = make_student(db_session, "mat_b@fpt.edu.vn", student_code="DE200402")
    stu_c, tok_c = make_student(db_session, "mat_c@fpt.edu.vn", student_code="DE200403")

    sem = Semester(id=uuid.uuid4(), code="P0S1", name="P0 Sem", is_active=True)
    crs = Course(id=uuid.uuid4(), code="P0C101", name="P0 Course", credits=3)
    db_session.add_all([sem, crs])
    db_session.flush()

    c1 = AcademicClass(
        id=uuid.uuid4(), code="P0_01", course_id=crs.id, semester_id=sem.id, campus_id=CAMPUS_ID
    )
    c2 = AcademicClass(
        id=uuid.uuid4(), code="P0_02", course_id=crs.id, semester_id=sem.id, campus_id=CAMPUS_ID
    )
    db_session.add_all([c1, c2])
    db_session.flush()

    req_a = MatchingRequest(
        id=uuid.uuid4(),
        student_id=stu_a.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c1.id,
        target_class_id=c2.id,
        status=SwapRequestStatus.ACTIVE,
    )
    req_b = MatchingRequest(
        id=uuid.uuid4(),
        student_id=stu_b.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c2.id,
        target_class_id=c1.id,
        status=SwapRequestStatus.ACTIVE,
    )
    req_c = MatchingRequest(
        id=uuid.uuid4(),
        student_id=stu_c.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c2.id,
        target_class_id=c1.id,
        status=SwapRequestStatus.ACTIVE,
    )
    expired_req = MatchingRequest(
        id=uuid.uuid4(),
        student_id=stu_c.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c1.id,
        target_class_id=c2.id,
        status=SwapRequestStatus.ACTIVE,
        expires_at=datetime.now(timezone.utc) - timedelta(hours=1),
    )
    db_session.add_all([req_a, req_b, req_c, expired_req])
    db_session.commit()

    # Overdue request automatically transitions to EXPIRED when listing
    r_mine_c = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(tok_c))
    assert r_mine_c.status_code == 200
    exp_item = next(item for item in r_mine_c.json() if item["id"] == str(expired_req.id))
    assert exp_item["status"] == "EXPIRED"

    # A matches both B and C
    for stu_tok, req_id in ((tok_b, req_b.id), (tok_c, req_c.id)):
        client.post(
            "/api/v1/class-swap/swipes",
            json={
                "swiper_request_id": str(req_id),
                "target_request_id": str(req_a.id),
                "action": "LIKE",
            },
            headers=auth_headers(stu_tok),
        )
    m_ab = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": str(req_a.id),
            "target_request_id": str(req_b.id),
            "action": "LIKE",
        },
        headers=auth_headers(tok_a),
    ).json()["match_id"]
    m_ac = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": str(req_a.id),
            "target_request_id": str(req_c.id),
            "action": "LIKE",
        },
        headers=auth_headers(tok_a),
    ).json()["match_id"]

    # Confirm match (A, B) -> competing pending match (A, C) automatically CANCELLED
    assert (
        client.post(
            f"/api/v1/class-swap/matches/{m_ab}/confirm", headers=auth_headers(tok_a)
        ).status_code
        == 200
    )
    r_conf = client.post(
        f"/api/v1/class-swap/matches/{m_ab}/confirm", headers=auth_headers(tok_b)
    )
    assert r_conf.status_code == 200
    assert r_conf.json()["status"] == "CONFIRMED"

    db_session.expire_all()
    assert db_session.get(Match, uuid.UUID(m_ac)).status == MatchStatus.CANCELLED

    # Test 48h overdue match expires cleanly
    overdue_match = Match(
        id=uuid.uuid4(),
        request_low_id=min(req_b.id, req_c.id, key=str),
        request_high_id=max(req_b.id, req_c.id, key=str),
        student_a_id=stu_b.id,
        student_b_id=stu_c.id,
        status=MatchStatus.PENDING_CONFIRMATION,
        confirm_deadline_at=datetime.now(timezone.utc) - timedelta(minutes=5),
    )
    db_session.add(overdue_match)
    db_session.commit()

    r_list_c = client.get("/api/v1/class-swap/matches", headers=auth_headers(tok_c))
    assert r_list_c.status_code == 200
    found_overdue = next(m for m in r_list_c.json() if m["id"] == str(overdue_match.id))
    assert found_overdue["status"] == "EXPIRED"


def test_soft_delete_notifies_partner_and_hard_purge_anonymizes_reports(
    client, db_session
):
    u1, tok1 = make_student(db_session, "del1@fpt.edu.vn", student_code="DE200501")
    u2, _ = make_student(db_session, "del2@fpt.edu.vn", student_code="DE200502")

    sem = Semester(id=uuid.uuid4(), code="P0S2", name="P0 Sem 2", is_active=True)
    crs = Course(id=uuid.uuid4(), code="P0C202", name="P0 Course 2", credits=3)
    db_session.add_all([sem, crs])
    db_session.flush()
    c1 = AcademicClass(
        id=uuid.uuid4(), code="P0_11", course_id=crs.id, semester_id=sem.id, campus_id=CAMPUS_ID
    )
    c2 = AcademicClass(
        id=uuid.uuid4(), code="P0_12", course_id=crs.id, semester_id=sem.id, campus_id=CAMPUS_ID
    )
    db_session.add_all([c1, c2])
    db_session.flush()

    r1 = MatchingRequest(
        id=uuid.uuid4(),
        student_id=u1.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c1.id,
        target_class_id=c2.id,
        status=SwapRequestStatus.MATCHED,
    )
    r2 = MatchingRequest(
        id=uuid.uuid4(),
        student_id=u2.id,
        semester_id=sem.id,
        course_id=crs.id,
        current_class_id=c2.id,
        target_class_id=c1.id,
        status=SwapRequestStatus.MATCHED,
    )
    db_session.add_all([r1, r2])
    db_session.flush()

    low_id, high_id = sorted([r1.id, r2.id], key=str)
    match = Match(
        id=uuid.uuid4(),
        request_low_id=low_id,
        request_high_id=high_id,
        student_a_id=u1.id,
        student_b_id=u2.id,
        status=MatchStatus.CONFIRMED,
    )
    rep = Report(
        id=uuid.uuid4(),
        reporter_id=u2.id,
        reported_student_id=u1.id,
        reason="No show",
    )
    db_session.add_all([match, rep])
    db_session.commit()

    # Soft delete u1 -> cancels match, reopens r2 -> ACTIVE, notifies u2, sets 14-day grace
    r_del = client.request(
        "DELETE",
        "/api/v1/students/me",
        json={"password": "Pass@12345"},
        headers=auth_headers(tok1),
    )
    assert r_del.status_code == 204
    db_session.expire_all()
    assert db_session.get(Student, u1.id).status == AccountStatus.CLOSED
    assert db_session.get(Match, match.id).status == MatchStatus.CANCELLED
    assert db_session.get(MatchingRequest, r2.id).status == SwapRequestStatus.ACTIVE
    assert (
        db_session.query(Notification)
        .filter(Notification.student_id == u2.id)
        .count()
        >= 1
    )

    # Restore within grace period -> ACTIVE
    r_res = client.post(
        "/api/v1/auth/restore-account",
        json={"email": "del1@fpt.edu.vn", "password": "Pass@12345"},
    )
    assert r_res.status_code == 200
    db_session.expire_all()
    assert db_session.get(Student, u1.id).status == AccountStatus.ACTIVE

    # Hard purge preserves anonymized report evidence instead of deleting report
    purge_student_account(db_session, u1.id)
    db_session.commit()
    db_session.expire_all()
    assert db_session.get(Student, u1.id) is None
    kept_rep = db_session.get(Report, rep.id)
    assert kept_rep is not None
    assert kept_rep.reported_student_id is None
    assert kept_rep.anonymized_reported_ref is not None
    assert kept_rep.anonymized_reported_ref.startswith("anon_")
