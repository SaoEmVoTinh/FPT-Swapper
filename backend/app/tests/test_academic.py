"""Tests for Academic Catalog endpoints (M3)."""

import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.database.session import get_db
from app.database.models import Campus  # noqa - ensure model registered
from app.main import app
from app.tests.helpers import CAMPUS_ID, auth_headers, make_student
from app.common.enums import UserRole

TEST_DB_URL = "sqlite:///./test_academic.db"
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
    pathlib.Path("test_academic.db").unlink(missing_ok=True)


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
def admin_token(db_session):
    _, token = make_student(db_session, "admin_acad@fpt.edu.vn", role=UserRole.ADMIN)
    return token


# ═══════════════════════════════════════════
#  Campus tests
# ═══════════════════════════════════════════

def test_list_campuses_empty(client):
    r = client.get("/api/v1/academic/campuses")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_create_campus_requires_admin(client):
    r = client.post("/api/v1/academic/campuses", json={"code": "DN", "name": "Đà Nẵng"})
    assert r.status_code == 401


def test_create_campus_as_admin(client, admin_token):
    r = client.post(
        "/api/v1/academic/campuses",
        json={"code": "HCM", "name": "TP HCM"},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 201
    assert r.json()["code"] == "HCM"


def test_list_campuses_has_items(client):
    r = client.get("/api/v1/academic/campuses")
    assert r.status_code == 200
    assert len(r.json()) >= 1


# ═══════════════════════════════════════════
#  Semester tests
# ═══════════════════════════════════════════

def test_create_and_list_semesters(client, admin_token):
    r = client.post(
        "/api/v1/academic/semesters",
        json={"code": "FA2025", "name": "Fall 2025", "is_active": True},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 201

    r2 = client.get("/api/v1/academic/semesters/active")
    assert r2.status_code == 200
    assert r2.json()["code"] == "FA2025"


# ═══════════════════════════════════════════
#  Course tests
# ═══════════════════════════════════════════

def test_create_and_get_course(client, admin_token):
    r = client.post(
        "/api/v1/academic/courses",
        json={"code": "PRF192", "name": "Introduction to Programming", "credits": 3},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r2 = client.get(f"/api/v1/academic/courses/{course_id}")
    assert r2.status_code == 200
    assert r2.json()["code"] == "PRF192"


def test_update_course(client, admin_token):
    r = client.post(
        "/api/v1/academic/courses",
        json={"code": "MAD101", "name": "Discrete Mathematics", "credits": 3},
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r2 = client.put(
        f"/api/v1/academic/courses/{course_id}",
        json={"credits": 4},
        headers=auth_headers(admin_token),
    )
    assert r2.status_code == 200
    assert r2.json()["credits"] == 4


# ═══════════════════════════════════════════
#  Class + Schedule tests
# ═══════════════════════════════════════════

def test_create_class_with_schedules(client, admin_token):
    campus_id = client.get("/api/v1/academic/campuses").json()[0]["id"]
    semester_id = client.get("/api/v1/academic/semesters/active").json()["id"]
    course_id = client.get("/api/v1/academic/courses").json()[0]["id"]

    r = client.post(
        "/api/v1/academic/classes",
        json={
            "code": "PRF192_SE1234",
            "course_id": course_id,
            "semester_id": semester_id,
            "campus_id": campus_id,
            "lecturer": "Nguyen Van A",
            "schedules": [{"day_of_week": "Monday", "slot": "1", "room": "A101"}],
        },
        headers=auth_headers(admin_token),
    )
    assert r.status_code == 201
    data = r.json()
    assert len(data["schedules"]) == 1

    class_id = data["id"]
    r2 = client.get(f"/api/v1/academic/classes/{class_id}/schedules")
    assert r2.status_code == 200
    assert len(r2.json()) == 1


def test_list_classes_filtered(client):
    sem_r = client.get("/api/v1/academic/semesters/active")
    assert sem_r.status_code == 200
    sem_id = sem_r.json()["id"]
    r = client.get(f"/api/v1/academic/classes?semester_id={sem_id}")
    assert r.status_code == 200
    assert len(r.json()) >= 1
