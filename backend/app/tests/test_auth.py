import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from app.database.models import Base, Campus
from app.database.session import get_db
from app.main import app

# ---- In-memory SQLite test DB ----

@pytest.fixture(scope="session")
def test_client():
    engine = create_engine(
        "sqlite:///./test_auth.db",
        connect_args={"check_same_thread": False},
    )

    @event.listens_for(engine, "connect")
    def _set_fk(dbapi_conn, _rec):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Seed campus
    db = TestingSession()
    campus = Campus(id=uuid.UUID("00000000-0000-0000-0000-000000000001"), code="HL", name="FPTU Hoa Lac")
    db.merge(campus)
    db.commit()
    db.close()

    client = TestClient(app, raise_server_exceptions=True)
    yield client

    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    import os, pathlib
    pathlib.Path("test_auth.db").unlink(missing_ok=True)


CAMPUS_ID = "00000000-0000-0000-0000-000000000001"
TEST_EMAIL = "testuser@fpt.edu.vn"
TEST_PASSWORD = "securepassword123"


def test_register_success(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/register",
        json={
            "email": TEST_EMAIL,
            "student_code": "HE180999",
            "full_name": "Nguyen Test User",
            "major": "Software Engineering",
            "campus_id": CAMPUS_ID,
            "password": TEST_PASSWORD,
        },
    )
    assert res.status_code == 201, res.json()
    data = res.json()
    assert data["email"] == TEST_EMAIL
    assert data["student_code"] == "HE180999"
    assert "password" not in data
    assert "password_hash" not in data


def test_register_duplicate_email(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/register",
        json={
            "email": TEST_EMAIL,
            "student_code": "HE180998",
            "full_name": "Duplicate",
            "major": "SE",
            "campus_id": CAMPUS_ID,
            "password": TEST_PASSWORD,
        },
    )
    assert res.status_code == 409


def test_register_non_fpt_email(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "user@gmail.com",
            "student_code": "HE180997",
            "full_name": "Bad Email",
            "major": "SE",
            "campus_id": CAMPUS_ID,
            "password": TEST_PASSWORD,
        },
    )
    assert res.status_code == 422


def test_login_success(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert res.status_code == 200, res.json()
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "access_token" in res.cookies


def test_login_wrong_password(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": "wrongpassword"},
    )
    assert res.status_code == 401


def test_me_authenticated(test_client: TestClient) -> None:
    # Login to get cookie
    login_res = test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    assert login_res.status_code == 200
    res = test_client.get("/api/v1/auth/me")
    assert res.status_code == 200
    assert res.json()["email"] == TEST_EMAIL


def test_me_unauthenticated(test_client: TestClient) -> None:
    client = TestClient(app, raise_server_exceptions=True)
    res = client.get("/api/v1/auth/me")
    assert res.status_code == 401


def test_get_my_profile(test_client: TestClient) -> None:
    test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    res = test_client.get("/api/v1/students/me")
    assert res.status_code == 200
    data = res.json()
    assert data["full_name"] == "Nguyen Test User"
    assert data["major"] == "Software Engineering"


def test_update_my_profile(test_client: TestClient) -> None:
    test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    res = test_client.put(
        "/api/v1/students/me",
        json={"full_name": "Updated Name", "bio": "Hello FPT ClassSwap!"},
    )
    assert res.status_code == 200
    assert res.json()["full_name"] == "Updated Name"
    assert res.json()["bio"] == "Hello FPT ClassSwap!"


def test_login_by_student_code(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/login",
        json={"email": "he180999", "password": TEST_PASSWORD},
    )
    assert res.status_code == 200, res.json()
    assert "access_token" in res.cookies


def test_register_by_campus_code(test_client: TestClient) -> None:
    res = test_client.post(
        "/api/v1/auth/register",
        json={
            "email": "seconduser@fpt.edu.vn",
            "student_code": "SE180888",
            "full_name": "Second User",
            "major": "AI",
            "campus_id": "HL",
            "password": TEST_PASSWORD,
        },
    )
    assert res.status_code == 201, res.json()
    assert res.json()["campus_code"] == "HL"


def test_logout(test_client: TestClient) -> None:
    test_client.post(
        "/api/v1/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD},
    )
    res = test_client.post("/api/v1/auth/logout")
    assert res.status_code == 200
