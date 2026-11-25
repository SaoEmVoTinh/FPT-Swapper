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
