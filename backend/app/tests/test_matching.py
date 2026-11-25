"""Tests for ClassSwap Requests (M4) + Matching Engine (M5)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.database.session import get_db
from app.database.models import Campus  # noqa
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student

TEST_DB_URL = "sqlite:///./test_matching.db"
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
    import pathlib
    pathlib.Path("test_matching.db").unlink(missing_ok=True)


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


# ── Academic seed helper ──────────────────────────────────────────────────────

def _seed_academic(db):
    from app.database.models.academic import Campus, Semester, Course, AcademicClass, ClassSchedule

    campus = db.get(Campus, CAMPUS_ID)

    semester = Semester(code=f"TST{uuid.uuid4().hex[:4]}", name="Test Sem", is_active=False)
    db.add(semester)
    db.flush()

    course = Course(code=f"TST{uuid.uuid4().hex[:4]}", name="Test Course", credits=3)
    db.add(course)
    db.flush()

    cls_a = AcademicClass(
        code=f"CLS_A_{uuid.uuid4().hex[:4]}",
        course_id=course.id, semester_id=semester.id, campus_id=campus.id,
    )
    cls_b = AcademicClass(
        code=f"CLS_B_{uuid.uuid4().hex[:4]}",
        course_id=course.id, semester_id=semester.id, campus_id=campus.id,
    )
    db.add_all([cls_a, cls_b])
    db.flush()

    db.add(ClassSchedule(class_id=cls_a.id, day_of_week="Monday", slot="1"))
    db.add(ClassSchedule(class_id=cls_b.id, day_of_week="Tuesday", slot="2"))
    db.commit()

    return semester, course, cls_a, cls_b


# ══════════════════════════════════════════════════════════════════════════════
#  ClassSwap Request tests (M4)
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def swap_context(db_session):
    student_a, token_a = make_student(db_session, "student_a_swap@fpt.edu.vn")
    student_b, token_b = make_student(db_session, "student_b_swap@fpt.edu.vn")
    sem, course, cls_a, cls_b = _seed_academic(db_session)
    return {
        "token_a": token_a, "token_b": token_b,
        "semester_id": str(sem.id),
        "course_id": str(course.id),
        "class_a_id": str(cls_a.id),
        "class_b_id": str(cls_b.id),
        "request_a_id": None,
    }


def test_create_swap_request(client, swap_context):
    token_a = swap_context["token_a"]
    r = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": swap_context["semester_id"],
            "course_id": swap_context["course_id"],
            "current_class_id": swap_context["class_a_id"],
            "target_class_id": swap_context["class_b_id"],
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 201, r.text
    assert r.json()["status"] == "ACTIVE"
    swap_context["request_a_id"] = r.json()["id"]


def test_duplicate_active_request_rejected(client, swap_context):
    token_a = swap_context["token_a"]
    r = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": swap_context["semester_id"],
            "course_id": swap_context["course_id"],
            "current_class_id": swap_context["class_a_id"],
            "target_class_id": swap_context["class_b_id"],
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 409


def test_same_class_rejected(client, swap_context):
    token_a = swap_context["token_a"]
    r = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": swap_context["semester_id"],
            "course_id": swap_context["course_id"],
            "current_class_id": swap_context["class_a_id"],
            "target_class_id": swap_context["class_a_id"],
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 422


def test_list_my_requests(client, swap_context):
    token_a = swap_context["token_a"]
    r = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_pause_and_resume_request(client, swap_context):
    req_id = swap_context["request_a_id"]
    token_a = swap_context["token_a"]

    r = client.put(
        f"/api/v1/class-swap/requests/{req_id}",
        json={"status": "PAUSED"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "PAUSED"

    r2 = client.put(
        f"/api/v1/class-swap/requests/{req_id}",
        json={"status": "ACTIVE"},
        headers=auth_headers(token_a),
    )
    assert r2.status_code == 200
    assert r2.json()["status"] == "ACTIVE"


def test_other_student_cannot_update(client, swap_context):
    req_id = swap_context["request_a_id"]
    token_b = swap_context["token_b"]
    r = client.put(
        f"/api/v1/class-swap/requests/{req_id}",
        json={"note": "hack"},
        headers=auth_headers(token_b),
    )
    assert r.status_code == 403


# ══════════════════════════════════════════════════════════════════════════════
#  Matching engine unit tests (M5)
# ══════════════════════════════════════════════════════════════════════════════

def test_matching_engine_compatible():
    from app.modules.matching.engine import is_compatible
    from app.database.models.matching import MatchingRequest

    id_a, id_b, id_c, id_d = uuid.uuid4(), uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    sem_id = uuid.uuid4()
    course_id = uuid.uuid4()

    req_a = MatchingRequest(id=id_a, student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=course_id, current_class_id=id_c, target_class_id=id_d)
    req_b = MatchingRequest(id=id_b, student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=course_id, current_class_id=id_d, target_class_id=id_c)
    assert is_compatible(req_a, req_b) is True


def test_matching_engine_incompatible_no_flip():
    from app.modules.matching.engine import is_compatible
    from app.database.models.matching import MatchingRequest

    id_a, id_b, id_c, id_d, id_e = [uuid.uuid4() for _ in range(5)]
    sem_id, course_id = uuid.uuid4(), uuid.uuid4()

    req_a = MatchingRequest(id=id_a, student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=course_id, current_class_id=id_c, target_class_id=id_d)
    req_b = MatchingRequest(id=id_b, student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=course_id, current_class_id=id_d, target_class_id=id_e)
    assert is_compatible(req_a, req_b) is False


def test_matching_engine_different_course():
    from app.modules.matching.engine import is_compatible
    from app.database.models.matching import MatchingRequest

    id_c, id_d = uuid.uuid4(), uuid.uuid4()
    sem_id = uuid.uuid4()

    req_a = MatchingRequest(id=uuid.uuid4(), student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=uuid.uuid4(), current_class_id=id_c, target_class_id=id_d)
    req_b = MatchingRequest(id=uuid.uuid4(), student_id=uuid.uuid4(), semester_id=sem_id,
                            course_id=uuid.uuid4(), current_class_id=id_d, target_class_id=id_c)
    assert is_compatible(req_a, req_b) is False


def test_matching_engine_self():
    from app.modules.matching.engine import is_compatible
    from app.database.models.matching import MatchingRequest

    shared_id = uuid.uuid4()
    req = MatchingRequest(id=shared_id, student_id=uuid.uuid4(), semester_id=uuid.uuid4(),
                          course_id=uuid.uuid4(), current_class_id=uuid.uuid4(), target_class_id=uuid.uuid4())
    assert is_compatible(req, req) is False


# ══════════════════════════════════════════════════════════════════════════════
#  Swipe + Match API tests
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def match_context(client, db_session):
    student_a, token_a = make_student(db_session, "matcher_a@fpt.edu.vn")
    student_b, token_b = make_student(db_session, "matcher_b@fpt.edu.vn")
    sem, course, cls_a, cls_b = _seed_academic(db_session)

    r_a = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(cls_a.id),
            "target_class_id": str(cls_b.id),
        },
        headers=auth_headers(token_a),
    )
    assert r_a.status_code == 201, r_a.text

    r_b = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(sem.id),
            "course_id": str(course.id),
            "current_class_id": str(cls_b.id),
            "target_class_id": str(cls_a.id),
        },
        headers=auth_headers(token_b),
    )
    assert r_b.status_code == 201, r_b.text

    return {
        "token_a": token_a, "token_b": token_b,
        "request_a_id": r_a.json()["id"],
        "request_b_id": r_b.json()["id"],
        "match_id": None, "confirmed": False,
    }


def test_discover_returns_candidate(client, match_context):
    req_a_id = match_context["request_a_id"]
    req_b_id = match_context["request_b_id"]
    token_a = match_context["token_a"]
    r = client.get(
        f"/api/v1/class-swap/discover?request_id={req_a_id}",
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    ids = [item["id"] for item in r.json()]
    assert req_b_id in ids


def test_swipe_like_one_sided(client, match_context):
    req_a_id = match_context["request_a_id"]
    req_b_id = match_context["request_b_id"]
    token_a = match_context["token_a"]
    r = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_a_id, "target_request_id": req_b_id, "action": "LIKE"},
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200
    assert r.json()["action"] == "LIKE"
    assert r.json()["match_id"] is None


def test_mutual_like_creates_match(client, match_context):
    req_a_id = match_context["request_a_id"]
    req_b_id = match_context["request_b_id"]
    token_b = match_context["token_b"]
    r = client.post(
        "/api/v1/class-swap/swipes",
        json={"swiper_request_id": req_b_id, "target_request_id": req_a_id, "action": "LIKE"},
        headers=auth_headers(token_b),
    )
    assert r.status_code == 200, r.text
    assert r.json()["match_id"] is not None
    match_context["match_id"] = r.json()["match_id"]


def test_list_matches(client, match_context):
    token_a = match_context["token_a"]
    r = client.get("/api/v1/class-swap/matches", headers=auth_headers(token_a))
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_confirm_match(client, match_context):
    match_id = match_context["match_id"]
    token_a = match_context["token_a"]
    token_b = match_context["token_b"]

    r = client.post(f"/api/v1/class-swap/matches/{match_id}/confirm",
                    headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["status"] == "PENDING_CONFIRMATION"

    r2 = client.post(f"/api/v1/class-swap/matches/{match_id}/confirm",
                     headers=auth_headers(token_b))
    assert r2.status_code == 200
    assert r2.json()["status"] == "CONFIRMED"
    match_context["confirmed"] = True


def test_complete_match(client, match_context):
    assert match_context["confirmed"]
    match_id = match_context["match_id"]
    token_a = match_context["token_a"]
    r = client.post(f"/api/v1/class-swap/matches/{match_id}/complete",
                    headers=auth_headers(token_a))
    assert r.status_code == 200
    assert r.json()["status"] == "COMPLETED"


# ══════════════════════════════════════════════════════════════════════════════
#  Real-data flow: ensure classes → requests → discover → match → chat/notify
# ══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def flow(client, db_session):
    from app.database.models.academic import Course, Semester

    student_a, token_a = make_student(db_session, "flow_a@fpt.edu.vn")
    student_b, token_b = make_student(db_session, "flow_b@fpt.edu.vn")

    semester = Semester(code=f"FLW{uuid.uuid4().hex[:4]}", name="Flow Semester", is_active=False)
    course = Course(code=f"FLW{uuid.uuid4().hex[:4]}", name="Flow Course", credits=3)
    db_session.add_all([semester, course])
    db_session.commit()

    r = client.post(
        "/api/v1/academic/classes/ensure",
        json={
            "course_id": str(course.id),
            "semester_id": str(semester.id),
            "campus_id": str(CAMPUS_ID),
        },
        headers=auth_headers(token_a),
    )
    assert r.status_code == 200, r.text
    classes = r.json()

    def make_request(token, cur, tgt):
        res = client.post(
            "/api/v1/class-swap/requests",
            json={
                "semester_id": str(semester.id),
                "course_id": str(course.id),
                "current_class_id": cur["id"],
                "target_class_id": tgt["id"],
                "note": "flow test",
                "expires_at": "2099-01-01T00:00:00Z",
            },
            headers=auth_headers(token),
        )
        assert res.status_code == 201, res.text
        return res.json()

    req_a = make_request(token_a, classes[0], classes[1])
    req_b = make_request(token_b, classes[1], classes[0])
    return {
        "student_a": student_a, "student_b": student_b,
        "token_a": token_a, "token_b": token_b,
        "classes": classes, "course": course, "semester": semester,
        "req_a": req_a, "req_b": req_b,
    }


def test_ensure_classes_provisions_default_slots(client, flow):
    classes = flow["classes"]
    assert len(classes) == 4
    assert all(len(c["schedules"]) == 1 for c in classes)

    # Idempotent: calling again must not create duplicates
    r = client.post(
        "/api/v1/academic/classes/ensure",
        json={
            "course_id": str(flow["course"].id),
            "semester_id": str(flow["semester"].id),
            "campus_id": str(CAMPUS_ID),
        },
        headers=auth_headers(flow["token_a"]),
    )
    assert r.status_code == 200
    assert len(r.json()) == 4


def test_ensure_classes_requires_login(client, flow):
    r = client.post(
        "/api/v1/academic/classes/ensure",
        json={
            "course_id": str(flow["course"].id),
            "semester_id": str(flow["semester"].id),
            "campus_id": str(CAMPUS_ID),
        },
    )
    assert r.status_code == 401


def test_request_rejects_class_from_other_course(client, flow, db_session):
    from app.database.models.academic import AcademicClass, Course

    other_course = Course(code=f"OTH{uuid.uuid4().hex[:4]}", name="Other", credits=3)
    db_session.add(other_course)
    db_session.flush()
    foreign = AcademicClass(
        code=f"OTH_{uuid.uuid4().hex[:4]}",
        course_id=other_course.id,
        semester_id=flow["semester"].id,
        campus_id=CAMPUS_ID,
    )
    db_session.add(foreign)
    db_session.commit()

    _, token_c = make_student(db_session, f"flow_c_{uuid.uuid4().hex[:4]}@fpt.edu.vn")
    r = client.post(
        "/api/v1/class-swap/requests",
        json={
            "semester_id": str(flow["semester"].id),
            "course_id": str(flow["course"].id),
            "current_class_id": flow["classes"][2]["id"],
            "target_class_id": str(foreign.id),
        },
        headers=auth_headers(token_c),
    )
    assert r.status_code == 422


def test_my_requests_are_enriched(client, flow):
    r = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(flow["token_a"]))
    assert r.status_code == 200
    req = next(x for x in r.json() if x["id"] == flow["req_a"]["id"])
    assert req["course_code"] == flow["course"].code
    assert req["semester_name"] == "Flow Semester"
    assert req["current_class_code"] == flow["classes"][0]["code"]
    assert req["target_class_code"] == flow["classes"][1]["code"]
    assert req["current_schedule_text"]


def test_discover_without_request_id_aggregates_active_requests(client, flow):
    r = client.get("/api/v1/class-swap/discover", headers=auth_headers(flow["token_a"]))
    assert r.status_code == 200, r.text
    card = next(x for x in r.json() if x["id"] == flow["req_b"]["id"])
    assert card["for_request_id"] == flow["req_a"]["id"]
    assert card["course_code"] == flow["course"].code
    assert card["current_class_code"] == flow["classes"][1]["code"]
    assert card["target_class_code"] == flow["classes"][0]["code"]
    assert card["student_code_masked"].endswith("****")
    assert card["is_reciprocal_ready"] is False
    # never leak private identifiers
    assert "email" not in card


def test_discover_marks_reciprocal_after_other_side_likes(client, flow):
    # B likes A first → A's discover must show B as a guaranteed match
    r = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": flow["req_b"]["id"],
            "target_request_id": flow["req_a"]["id"],
            "action": "LIKE",
        },
        headers=auth_headers(flow["token_b"]),
    )
    assert r.status_code == 200
    assert r.json()["match_id"] is None

    r2 = client.get("/api/v1/class-swap/discover", headers=auth_headers(flow["token_a"]))
    card = next(x for x in r2.json() if x["id"] == flow["req_b"]["id"])
    assert card["is_reciprocal_ready"] is True


def test_cannot_swipe_own_request(client, flow):
    r = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": flow["req_a"]["id"],
            "target_request_id": flow["req_a"]["id"],
            "action": "LIKE",
        },
        headers=auth_headers(flow["token_a"]),
    )
    assert r.status_code == 422


def test_mutual_like_opens_conversation_and_notifies_both(client, flow):
    r = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": flow["req_a"]["id"],
            "target_request_id": flow["req_b"]["id"],
            "action": "LIKE",
        },
        headers=auth_headers(flow["token_a"]),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["match_created"] is True
    match = body["match"]
    assert match["status"] == "PENDING_CONFIRMATION"
    assert match["my_class_code"] == flow["classes"][0]["code"]
    assert match["partner_class_code"] == flow["classes"][1]["code"]
    assert match["conversation_id"] is not None
    flow["match_id"] = match["id"]
    flow["conversation_id"] = match["conversation_id"]

    # Swiping again is idempotent and returns the same match without re-creating it
    again = client.post(
        "/api/v1/class-swap/swipes",
        json={
            "swiper_request_id": flow["req_a"]["id"],
            "target_request_id": flow["req_b"]["id"],
            "action": "LIKE",
        },
        headers=auth_headers(flow["token_a"]),
    )
    assert again.json()["match_id"] == match["id"]
    assert again.json()["match_created"] is False

    # Both students got a MATCH notification
    for token in (flow["token_a"], flow["token_b"]):
        notifs = client.get("/api/v1/notifications", headers=auth_headers(token)).json()
        assert any(n["notification_type"] == "MATCH" for n in notifs)


def test_match_is_viewer_relative(client, flow):
    a = client.get(
        f"/api/v1/class-swap/matches/{flow['match_id']}", headers=auth_headers(flow["token_a"])
    ).json()
    b = client.get(
        f"/api/v1/class-swap/matches/{flow['match_id']}", headers=auth_headers(flow["token_b"])
    ).json()
    assert a["my_class_code"] == b["partner_class_code"]
    assert a["partner_class_code"] == b["my_class_code"]
    assert a["my_request_id"] == b["partner_request_id"]


def test_match_conversation_is_usable_by_both_members(client, flow):
    convs = client.get("/api/v1/conversations", headers=auth_headers(flow["token_b"])).json()
    conv = next(c for c in convs if c["id"] == flow["conversation_id"])
    assert conv["match_id"] == flow["match_id"]
    assert conv["partner_name"]
    assert conv["course_code"] == flow["course"].code
    assert conv["match_status"] == "PENDING_CONFIRMATION"

    sent = client.post(
        f"/api/v1/conversations/{flow['conversation_id']}/messages",
        json={"content": "Chào bạn!", "client_message_id": "flow-msg-1"},
        headers=auth_headers(flow["token_a"]),
    )
    assert sent.status_code == 200
    convs = client.get("/api/v1/conversations", headers=auth_headers(flow["token_b"])).json()
    conv = next(c for c in convs if c["id"] == flow["conversation_id"])
    assert conv["last_message"] == "Chào bạn!"


def test_matched_pair_leaves_discover(client, flow):
    r = client.get("/api/v1/class-swap/discover", headers=auth_headers(flow["token_a"]))
    assert all(x["id"] != flow["req_b"]["id"] for x in r.json())


def test_confirm_flow_marks_requests_matched_then_completed(client, flow):
    mid = flow["match_id"]
    r1 = client.post(f"/api/v1/class-swap/matches/{mid}/confirm", headers=auth_headers(flow["token_a"]))
    assert r1.status_code == 200
    assert r1.json()["my_confirmed"] is True
    assert r1.json()["partner_confirmed"] is False

    # Partner is notified that A confirmed
    notifs = client.get("/api/v1/notifications", headers=auth_headers(flow["token_b"])).json()
    assert any("đã xác nhận" in n["title"] for n in notifs)

    r2 = client.post(f"/api/v1/class-swap/matches/{mid}/confirm", headers=auth_headers(flow["token_b"]))
    assert r2.json()["status"] == "CONFIRMED"

    mine = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(flow["token_a"])).json()
    assert next(x for x in mine if x["id"] == flow["req_a"]["id"])["status"] == "MATCHED"

    r3 = client.post(f"/api/v1/class-swap/matches/{mid}/complete", headers=auth_headers(flow["token_a"]))
    assert r3.json()["status"] == "COMPLETED"
    mine = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(flow["token_b"])).json()
    assert next(x for x in mine if x["id"] == flow["req_b"]["id"])["status"] == "COMPLETED"


def test_outsider_cannot_read_match(client, flow, db_session):
    _, token_x = make_student(db_session, f"flow_x_{uuid.uuid4().hex[:4]}@fpt.edu.vn")
    r = client.get(f"/api/v1/class-swap/matches/{flow['match_id']}", headers=auth_headers(token_x))
    assert r.status_code == 403


def test_decline_confirmed_match_reopens_requests(client, db_session, flow):
    """A fresh pair: confirm both, then one declines → both requests are ACTIVE again."""
    student_c, token_c = make_student(db_session, f"flow_c2_{uuid.uuid4().hex[:4]}@fpt.edu.vn")
    student_d, token_d = make_student(db_session, f"flow_d2_{uuid.uuid4().hex[:4]}@fpt.edu.vn")
    classes = flow["classes"]

    def mk(token, cur, tgt):
        res = client.post(
            "/api/v1/class-swap/requests",
            json={
                "semester_id": str(flow["semester"].id),
                "course_id": str(flow["course"].id),
                "current_class_id": cur["id"],
                "target_class_id": tgt["id"],
            },
            headers=auth_headers(token),
        )
        assert res.status_code == 201, res.text
        return res.json()

    rc = mk(token_c, classes[2], classes[3])
    rd = mk(token_d, classes[3], classes[2])
    for tok, me, other in ((token_c, rc, rd), (token_d, rd, rc)):
        client.post(
            "/api/v1/class-swap/swipes",
            json={"swiper_request_id": me["id"], "target_request_id": other["id"], "action": "LIKE"},
            headers=auth_headers(tok),
        )
    matches = client.get("/api/v1/class-swap/matches", headers=auth_headers(token_c)).json()
    mid = matches[0]["id"]
    for tok in (token_c, token_d):
        client.post(f"/api/v1/class-swap/matches/{mid}/confirm", headers=auth_headers(tok))

    dec = client.post(f"/api/v1/class-swap/matches/{mid}/decline", headers=auth_headers(token_c))
    assert dec.json()["status"] == "DECLINED"
    mine = client.get("/api/v1/class-swap/requests/me", headers=auth_headers(token_d)).json()
    assert next(x for x in mine if x["id"] == rd["id"])["status"] == "ACTIVE"
