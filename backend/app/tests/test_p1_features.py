"""Tests for P1 features: timetable/conflicts, 3-way cycles, reports, blocks, undo, reviews, and contact privacy."""

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
    ReportStatus,
    SwapRequestStatus,
    UserRole,
)
from app.core.rate_limit import clear_rate_limits
from app.database.base import Base
from app.database.models import (
    AcademicClass,
    Campus,
    ClassSchedule,
    Conversation,
    Course,
    Match,
    MatchingRequest,
    Notification,
    Semester,
    StudentProfile,
    ThreeWaySwapProposal,
)
from app.database.session import get_db
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_p1.db"
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
    pathlib.Path("test_p1.db").unlink(missing_ok=True)


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


def _make_profiled_student(
    db,
    email: str,
    full_name: str,
    role: UserRole = UserRole.STUDENT,
    share_contact: bool = False,
):
    student, token = make_student(db, email, role=role)
    profile = StudentProfile(
        student_id=student.id,
        full_name=full_name,
        major="Software Engineering",
        share_contact_after_match=share_contact,
        share_email_after_match=share_contact,
        share_student_code_after_match=share_contact,
    )
    db.add(profile)
    db.commit()
    db.refresh(student)
    return student, token


def _seed_course_classes(db, course_code: str, class_specs: list[tuple[str, str, str]]):
    """Create Semester, Course, and classes with schedules: (code, day_of_week, slot)."""
    sem = Semester(id=uuid.uuid4(), code=f"SU26_{uuid.uuid4().hex[:4]}", name="Summer 2026")
    course = Course(
        id=uuid.uuid4(),
        code=course_code,
        name=f"Course {course_code}",
        credits=3,
    )
    db.add_all([sem, course])
    db.flush()

    classes = []
    for code, day, slot in class_specs:
        cls = AcademicClass(
            id=uuid.uuid4(),
            course_id=course.id,
            semester_id=sem.id,
            campus_id=CAMPUS_ID,
            code=code,
            lecturer="GV Test",
        )
        db.add(cls)
        db.flush()
        db.add(
            ClassSchedule(
                class_id=cls.id,
                day_of_week=day,
                slot=slot,
                room="AL-101",
            )
        )
        classes.append(cls)
    db.commit()
    return sem, course, classes


def test_schedule_conflict_detection_and_timetable(client, db_session):
    stu_a, tok_a = _make_profiled_student(db_session, "p1_sched_a@fpt.edu.vn", "Student A")
    stu_b, tok_b = _make_profiled_student(db_session, "p1_sched_b@fpt.edu.vn", "Student B")

    sem = Semester(id=uuid.uuid4(), code="SP26_SCHED", name="Spring 2026")
    c_prj = Course(id=uuid.uuid4(), code="PRJ301_P1", name="Java Web", credits=3)
    c_swp = Course(id=uuid.uuid4(), code="SWP391_P1", name="Software Project", credits=3)
    db_session.add_all([sem, c_prj, c_swp])
    db_session.flush()

    cls_prj_1 = AcademicClass(
        id=uuid.uuid4(), course_id=c_prj.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1801"
    )
    cls_prj_2 = AcademicClass(
        id=uuid.uuid4(), course_id=c_prj.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1802"
    )
    cls_swp_1 = AcademicClass(
        id=uuid.uuid4(), course_id=c_swp.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1803"
    )
    cls_swp_2 = AcademicClass(
        id=uuid.uuid4(), course_id=c_swp.id, semester_id=sem.id, campus_id=CAMPUS_ID, code="SE1804"
    )
    db_session.add_all([cls_prj_1, cls_prj_2, cls_swp_1, cls_swp_2])
    db_session.flush()

    db_session.add_all(
        [
            ClassSchedule(class_id=cls_prj_1.id, day_of_week="Thứ 2", slot="Slot 1", room="AL-101"),
            # cls_prj_2 conflicts with cls_swp_1 (Thứ 4 • Slot 2)
            ClassSchedule(class_id=cls_prj_2.id, day_of_week="Thứ 4", slot="Slot 2", room="AL-102"),
            ClassSchedule(class_id=cls_swp_1.id, day_of_week="Thứ 4", slot="Slot 2", room="AL-201"),
            ClassSchedule(class_id=cls_swp_2.id, day_of_week="Thứ 6", slot="Slot 3", room="AL-202"),
        ]
    )
    db_session.commit()

    # Student A holds SWP391 SE1803 (Thứ 4, Slot 2) and PRJ301 SE1801 -> wants SE1802 (Thứ 4, Slot 2)
    r_swp = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_swp.id),
            "current_class_id": str(cls_swp_1.id),
            "target_class_id": str(cls_swp_2.id),
        },
        headers=auth_headers(tok_a),
    )
    assert r_swp.status_code == 201

    r_prj = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_prj.id),
            "current_class_id": str(cls_prj_1.id),
            "target_class_id": str(cls_prj_2.id),
        },
        headers=auth_headers(tok_a),
    )
    assert r_prj.status_code == 201
    assert "SE1803" in (r_prj.json().get("schedule_conflict_warning") or "")

    # Student B posts PRJ301 SE1802 -> SE1801; Student A sees conflict warning on Discover card
    r_b = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_prj.id),
            "current_class_id": str(cls_prj_2.id),
            "target_class_id": str(cls_prj_1.id),
        },
        headers=auth_headers(tok_b),
    )
    assert r_b.status_code == 201

    disc = client.get(
        f"/api/v1/class-swap/discover?request_id={r_prj.json()['id']}",
        headers=auth_headers(tok_a),
    )
    assert disc.status_code == 200
    cards = disc.json()
    assert len(cards) == 1
    assert "SE1803" in (cards[0].get("schedule_conflict_warning") or "")

    # Weekly timetable lists Student A's held classes
    tkb = client.get("/api/v1/class-swap/timetable", headers=auth_headers(tok_a))
    assert tkb.status_code == 200
    class_codes = {slot["class_code"] for slot in tkb.json()}
    assert {"SE1801", "SE1803"}.issubset(class_codes)


def test_three_way_swap_cycle_confirm_and_decline(client, db_session):
    stu_a, tok_a = _make_profiled_student(db_session, "p1_cyc_a@fpt.edu.vn", "Cycle A")
    stu_b, tok_b = _make_profiled_student(db_session, "p1_cyc_b@fpt.edu.vn", "Cycle B")
    stu_c, tok_c = _make_profiled_student(db_session, "p1_cyc_c@fpt.edu.vn", "Cycle C")

    sem, course, classes = _seed_course_classes(
        db_session,
        "CSD201_P1",
        [
            ("SE1901", "Thứ 2", "Slot 1"),
            ("SE1902", "Thứ 3", "Slot 2"),
            ("SE1903", "Thứ 5", "Slot 3"),
        ],
    )
    c1, c2, c3 = classes

    # A: c1->c2, B: c2->c3, C: c3->c1
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
            "target_class_id": str(c3.id),
        },
        headers=auth_headers(tok_b),
    ).json()
    req_c = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(c3.id),
            "target_class_id": str(c1.id),
        },
        headers=auth_headers(tok_c),
    ).json()

    cycles = client.get("/api/v1/class-swap/cycles", headers=auth_headers(tok_a)).json()
    assert len(cycles) >= 1
    cyc = next(item for item in cycles if {item["req_a_id"], item["req_b_id"], item["req_c_id"]} == {req_a["id"], req_b["id"], req_c["id"]})
    assert cyc["status"] == "SUGGESTED"

    # A & B accept -> still PENDING_CONFIRMATION
    acc_a = client.post(
        "/api/v1/class-swap/cycles/accept",
        json={"req_a_id": cyc["req_a_id"], "req_b_id": cyc["req_b_id"], "req_c_id": cyc["req_c_id"]},
        headers=auth_headers(tok_a),
    )
    assert acc_a.status_code == 200
    assert acc_a.json()["status"] == "PENDING_CONFIRMATION"

    acc_b = client.post(
        "/api/v1/class-swap/cycles/accept",
        json={"req_a_id": cyc["req_a_id"], "req_b_id": cyc["req_b_id"], "req_c_id": cyc["req_c_id"]},
        headers=auth_headers(tok_b),
    )
    assert acc_b.status_code == 200
    assert acc_b.json()["status"] == "PENDING_CONFIRMATION"

    # C accepts -> CONFIRMED, creates group chat, sets all 3 requests MATCHED
    acc_c = client.post(
        "/api/v1/class-swap/cycles/accept",
        json={"req_a_id": cyc["req_a_id"], "req_b_id": cyc["req_b_id"], "req_c_id": cyc["req_c_id"]},
        headers=auth_headers(tok_c),
    )
    assert acc_c.status_code == 200
    body = acc_c.json()
    assert body["status"] == "CONFIRMED"
    assert body["conversation_id"] is not None
    proposal_id = body["proposal_id"]

    # Group conversation hides 1-1 partner_id so block/report isn't misdirected
    convs = client.get("/api/v1/conversations", headers=auth_headers(tok_a)).json()
    group_conv = next(c for c in convs if c["id"] == body["conversation_id"])
    assert group_conv["partner_id"] is None
    assert group_conv["my_class_code"] == "Nhóm 3 bên"

    for rid in (req_a["id"], req_b["id"], req_c["id"]):
        r = db_session.get(MatchingRequest, uuid.UUID(rid))
        db_session.refresh(r)
        assert r.status == SwapRequestStatus.MATCHED

    # Decline confirmed proposal -> DECLINED and all 3 requests reopen to ACTIVE
    dec = client.post(
        f"/api/v1/class-swap/cycles/{proposal_id}/decline",
        headers=auth_headers(tok_b),
    )
    assert dec.status_code == 200
    assert dec.json()["status"] == "DECLINED"
    for rid in (req_a["id"], req_b["id"], req_c["id"]):
        r = db_session.get(MatchingRequest, uuid.UUID(rid))
        db_session.refresh(r)
        assert r.status == SwapRequestStatus.ACTIVE

    # Declining again returns 422
    dec_again = client.post(
        f"/api/v1/class-swap/cycles/{proposal_id}/decline",
        headers=auth_headers(tok_c),
    )
    assert dec_again.status_code == 422


def test_block_swipe_undo_review_privacy_and_reports(client, db_session):
    admin, tok_admin = _make_profiled_student(
        db_session, "p1_admin@fpt.edu.vn", "Mod Admin", role=UserRole.ADMIN
    )
    stu_a, tok_a = _make_profiled_student(
        db_session, "p1_flow_a@fpt.edu.vn", "Alice P1", share_contact=True
    )
    stu_b, tok_b = _make_profiled_student(
        db_session, "p1_flow_b@fpt.edu.vn", "Bob P1", share_contact=False
    )

    sem, course, classes = _seed_course_classes(
        db_session,
        "DBI202_P1",
        [("SE2001", "Thứ 2", "Slot 1"), ("SE2002", "Thứ 3", "Slot 2")],
    )
    c1, c2 = classes

    # Request A expires within 24h -> triggers expiring-soon notification
    req_a = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(c1.id),
            "target_class_id": str(c2.id),
            "expires_at": (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat(),
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

    # Discover triggers expiring reminder for A
    disc_a = client.get("/api/v1/class-swap/discover", headers=auth_headers(tok_a))
    assert disc_a.status_code == 200
    rem = (
        db_session.query(Notification)
        .filter(
            Notification.student_id == stu_a.id,
            Notification.title == "Yêu cầu đổi lớp sắp hết hạn",
        )
        .first()
    )
    assert rem is not None

    # A likes B, then B likes A -> Match created (PENDING_CONFIRMATION)
    sw_a = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_a["id"], "target_request_id": req_b["id"], "action": "LIKE"},
        headers=auth_headers(tok_a),
    )
    assert sw_a.status_code == 200 and sw_a.json()["match_created"] is False

    sw_b = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_b["id"], "target_request_id": req_a["id"], "action": "LIKE"},
        headers=auth_headers(tok_b),
    )
    assert sw_b.status_code == 200 and sw_b.json()["match_created"] is True
    match_id = sw_b.json()["match_id"]
    conv_id = sw_b.json()["match"]["conversation_id"]

    # Before confirmation, contact email is hidden even if share_contact_after_match=True
    assert sw_b.json()["match"]["partner_email"] is None

    # B undoes last swipe -> cancels PENDING_CONFIRMATION match
    undo = client.post("/api/v1/class-swap/swipes/undo", headers=auth_headers(tok_b))
    assert undo.status_code == 200
    assert undo.json()["cancelled_match_id"] == match_id

    # B re-likes A -> revives match
    sw_b2 = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_b["id"], "target_request_id": req_a["id"], "action": "LIKE"},
        headers=auth_headers(tok_b),
    )
    assert sw_b2.status_code == 200 and sw_b2.json()["match_created"] is True

    # Both confirm -> CONFIRMED; B sees A's email/code (share_contact=True), A does NOT see B's (share_contact=False)
    assert client.post(f"/api/v1/class-swap/matches/{match_id}/confirm", headers=auth_headers(tok_a)).status_code == 200
    conf_b = client.post(f"/api/v1/class-swap/matches/{match_id}/confirm", headers=auth_headers(tok_b))
    assert conf_b.status_code == 200
    assert conf_b.json()["status"] == "CONFIRMED"
    assert conf_b.json()["partner_email"] == "p1_flow_a@fpt.edu.vn"
    assert conf_b.json()["partner_student_code"] == stu_a.student_code

    match_for_a = client.get(f"/api/v1/class-swap/matches/{match_id}", headers=auth_headers(tok_a)).json()
    assert match_for_a["partner_email"] is None

    # Undo after CONFIRMED is rejected (422)
    assert client.post("/api/v1/class-swap/swipes/undo", headers=auth_headers(tok_b)).status_code == 422

    # Review & No-show reputation
    rev = client.post(
        f"/api/v1/class-swap/matches/{match_id}/review",
        json={"rating": 2, "outcome": "NO_SHOW", "comment": "Không thấy phản hồi"},
        headers=auth_headers(tok_a),
    )
    assert rev.status_code == 200
    # Duplicate review rejected (409)
    assert (
        client.post(
            f"/api/v1/class-swap/matches/{match_id}/review",
            json={"rating": 5, "outcome": "SUCCESS"},
            headers=auth_headers(tok_a),
        ).status_code
        == 409
    )

    db_session.refresh(stu_b.profile)
    assert stu_b.profile.trust_score == 2.0
    assert stu_b.profile.no_show_count == 1
    assert stu_b.profile.completed_swaps_count == 0

    # Block user -> blocks chat messaging (403) and hides from blocks/discover
    blk = client.post(
        f"/api/v1/students/me/blocks/{stu_b.id}",
        json={"reason": "Spam"},
        headers=auth_headers(tok_a),
    )
    assert blk.status_code == 200
    assert len(client.get("/api/v1/students/me/blocks", headers=auth_headers(tok_a)).json()) == 1
    assert (
        client.post(
            f"/api/v1/conversations/{conv_id}/messages",
            json={"content": "hello"},
            headers=auth_headers(tok_b),
        ).status_code
        == 403
    )
    assert (
        client.delete(f"/api/v1/students/me/blocks/{stu_b.id}", headers=auth_headers(tok_a)).status_code
        == 204
    )

    # Report user from chat + Admin resolves report with SUSPEND
    rep = client.post(
        "/api/v1/reports",
        json={
            "conversation_id": conv_id,
            "reason": "Không phản hồi / bỏ hẹn đổi lớp",
            "details": "Bỏ hẹn 2 lần",
        },
        headers=auth_headers(tok_a),
    )
    assert rep.status_code == 201
    report_id = rep.json()["id"]

    # Non-staff cannot access admin reports
    assert client.get("/api/v1/admin/reports", headers=auth_headers(tok_a)).status_code == 403

    admin_reps = client.get("/api/v1/admin/reports?status=OPEN", headers=auth_headers(tok_admin))
    assert admin_reps.status_code == 200
    assert any(r["id"] == report_id for r in admin_reps.json())

    res = client.patch(
        f"/api/v1/admin/reports/{report_id}",
        json={"status": "RESOLVED", "action": "SUSPEND", "resolution_note": "Xác minh bỏ hẹn"},
        headers=auth_headers(tok_admin),
    )
    assert res.status_code == 200
    assert res.json()["status"] == ReportStatus.RESOLVED.value

    db_session.refresh(stu_b)
    assert stu_b.status == AccountStatus.SUSPENDED
    # Confirmed match was cancelled and A's request reopened to ACTIVE
    m_obj = db_session.get(Match, uuid.UUID(match_id))
    db_session.refresh(m_obj)
    assert m_obj.status == MatchStatus.CANCELLED
    r_a_obj = db_session.get(MatchingRequest, uuid.UUID(req_a["id"]))
    db_session.refresh(r_a_obj)
    assert r_a_obj.status == SwapRequestStatus.ACTIVE


def test_vovinam_slots_and_cross_schedule_overlap(client, db_session):
    stu_v, tok_v = _make_profiled_student(db_session, "p1_vov@fpt.edu.vn", "Vovinam Student")
    sem = Semester(id=uuid.uuid4(), code="FA26_VOV", name="Fall 2026")
    c_jpd = Course(id=uuid.uuid4(), code="JPD123_VOV", name="Japanese 123", credits=3)
    c_vov = Course(id=uuid.uuid4(), code="VOV112", name="Vovinam 1", credits=1)
    db_session.add_all([sem, c_jpd, c_vov])
    db_session.commit()

    # ensure_default_classes provisions 5 regular slots and 6 Vovinam slots
    reg_classes = client.post(
        "/api/v1/academic/classes/ensure",
        json={"course_id": str(c_jpd.id), "semester_id": str(sem.id), "campus_id": str(CAMPUS_ID)},
        headers=auth_headers(tok_v),
    )
    assert reg_classes.status_code == 200
    reg_slots = [c["schedules"][0]["slot"] for c in reg_classes.json()]
    assert "Slot 1 (07:00 - 09:15)" in reg_slots
    assert "Slot 2 (09:30 - 11:45)" in reg_slots
    assert "Slot 3 (12:30 - 14:45)" in reg_slots
    assert "Slot 4 (15:00 - 17:15)" in reg_slots

    vov_classes = client.post(
        "/api/v1/academic/classes/ensure",
        json={"course_id": str(c_vov.id), "semester_id": str(sem.id), "campus_id": str(CAMPUS_ID)},
        headers=auth_headers(tok_v),
    )
    assert vov_classes.status_code == 200
    vov_list = vov_classes.json()
    vov_slots = [c["schedules"][0]["slot"] for c in vov_list]
    assert vov_slots == [
        "Slot 1 (07:00 - 08:30)",
        "Slot 2 (08:45 - 10:15)",
        "Slot 3 (10:30 - 12:00)",
        "Slot 4 (12:30 - 14:00)",
        "Slot 5 (14:15 - 15:45)",
        "Slot 6 (16:00 - 17:30)",
    ]

    # Student holds JPD123 Slot 1 (07:00 - 09:15) -> wants Slot 4 (15:00 - 17:15)
    jpd_s1 = next(c for c in reg_classes.json() if "Slot 1" in c["schedules"][0]["slot"])
    jpd_s4 = next(c for c in reg_classes.json() if "Slot 4" in c["schedules"][0]["slot"])
    r_jpd = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_jpd.id),
            "current_class_id": jpd_s1["id"],
            "target_class_id": jpd_s4["id"],
        },
        headers=auth_headers(tok_v),
    )
    assert r_jpd.status_code == 201

    # Wants Vovinam Slot 2 (08:45 - 10:15) -> overlaps JPD123 Slot 1 (07:00 - 09:15)!
    vov_s2 = vov_list[1]
    vov_s3 = vov_list[2]
    vov_s4 = vov_list[3]
    r_vov_conflict = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_vov.id),
            "current_class_id": vov_s4["id"],
            "target_class_id": vov_s2["id"],
        },
        headers=auth_headers(tok_v),
    )
    assert r_vov_conflict.status_code == 201
    assert jpd_s1["code"] in (r_vov_conflict.json().get("schedule_conflict_warning") or "")

    # Wants Vovinam Slot 3 (10:30 - 12:00) -> does NOT overlap JPD123 Slot 1 (07:00 - 09:15)
    assert (
        client.delete(
            f"/api/v1/class-swap/requests/{r_vov_conflict.json()['id']}",
            headers=auth_headers(tok_v),
        ).status_code
        == 204
    )
    r_vov_ok = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(c_vov.id),
            "current_class_id": vov_s4["id"],
            "target_class_id": vov_s3["id"],
        },
        headers=auth_headers(tok_v),
    )
    assert r_vov_ok.status_code == 201
    assert r_vov_ok.json().get("schedule_conflict_warning") is None


def test_split_email_and_student_code_sharing_after_match(client, db_session):
    stu_a, tok_a = _make_profiled_student(
        db_session, "split_a@fpt.edu.vn", "Split Alice", share_contact=False
    )
    stu_b, tok_b = _make_profiled_student(
        db_session, "split_b@fpt.edu.vn", "Split Bob", share_contact=False
    )

    # A opts into Email only; B opts into Student Code only
    assert (
        client.put(
            "/api/v1/students/me",
            json={"share_email_after_match": True, "share_student_code_after_match": False},
            headers=auth_headers(tok_a),
        ).status_code
        == 200
    )
    assert (
        client.put(
            "/api/v1/students/me",
            json={"share_email_after_match": False, "share_student_code_after_match": True},
            headers=auth_headers(tok_b),
        ).status_code
        == 200
    )

    sem, course, classes = _seed_course_classes(
        db_session,
        "SWP391_SP",
        [("SE2101", "Thứ 2", "Slot 1"), ("SE2102", "Thứ 4", "Slot 2")],
    )
    c1, c2 = classes

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

    assert (
        client.post(
            "/api/v1/class-swap/swipes",
            json={"swiper_request_id": req_a["id"], "target_request_id": req_b["id"], "action": "LIKE"},
            headers=auth_headers(tok_a),
        ).status_code
        == 200
    )
    sw_b = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_b["id"], "target_request_id": req_a["id"], "action": "LIKE"},
        headers=auth_headers(tok_b),
    )
    assert sw_b.status_code == 200 and sw_b.json()["match_created"] is True
    match_id = sw_b.json()["match_id"]
    conv_id = sw_b.json()["match"]["conversation_id"]

    assert client.post(f"/api/v1/class-swap/matches/{match_id}/confirm", headers=auth_headers(tok_a)).status_code == 200
    conf_b = client.post(f"/api/v1/class-swap/matches/{match_id}/confirm", headers=auth_headers(tok_b))
    assert conf_b.status_code == 200
    b_view = conf_b.json()
    assert b_view["partner_email"] == "split_a@fpt.edu.vn"
    assert b_view["partner_student_code"] is None

    a_view = client.get(f"/api/v1/class-swap/matches/{match_id}", headers=auth_headers(tok_a)).json()
    assert a_view["partner_email"] is None
    assert a_view["partner_student_code"] == stu_b.student_code

    # 1-1 chat remains functional regardless of contact-sharing toggles
    msg = client.post(
        f"/api/v1/conversations/{conv_id}/messages",
        json={"content": "Chào bạn, mình xác nhận đổi trên FAP nhé."},
        headers=auth_headers(tok_a),
    )
    assert msg.status_code == 200


