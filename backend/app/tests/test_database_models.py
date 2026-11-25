import uuid

import pytest
from sqlalchemy import create_engine, event, inspect
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.common.enums import (
    ConversationSourceType,
    ConversationType,
    MatchStatus,
    SwapRequestStatus,
    SwipeAction,
)
from app.database.models import (
    AcademicClass,
    Base,
    Campus,
    Conversation,
    Course,
    Match,
    MatchingRequest,
    Message,
    Semester,
    Student,
    StudentProfile,
    Swipe,
)


@pytest.fixture()
def db_session() -> Session:
    engine = create_engine("sqlite:///:memory:")

    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, _connection_record) -> None:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


def test_all_18_tables_exist(db_session: Session) -> None:
    inspector = inspect(db_session.bind)
    tables = set(inspector.get_table_names())
    expected = {
        "students",
        "student_profiles",
        "campuses",
        "semesters",
        "courses",
        "classes",
        "class_schedules",
        "student_enrollments",
        "matching_requests",
        "class_exchange_preferences",
        "swipes",
        "matches",
        "conversations",
        "conversation_members",
        "messages",
        "notifications",
        "reports",
        "audit_logs",
    }
    assert expected.issubset(tables)


def test_matching_and_chat_constraints(db_session: Session) -> None:
    campus = Campus(code="HL", name="FPTU Hoa Lac")
    semester = Semester(code="SP26", name="Spring 2026", is_active=True)
    course = Course(code="MKT201", name="Consumer Behavior", credits=3)
    db_session.add_all([campus, semester, course])
    db_session.flush()

    cls1 = AcademicClass(
        code="MKT201_01",
        course_id=course.id,
        semester_id=semester.id,
        campus_id=campus.id,
    )
    cls2 = AcademicClass(
        code="MKT201_02",
        course_id=course.id,
        semester_id=semester.id,
        campus_id=campus.id,
    )
    stu_a = Student(
        email="a@fpt.edu.vn",
        student_code="HE180001",
        password_hash="hashed_pw_a",
        campus_id=campus.id,
    )
    stu_b = Student(
        email="b@fpt.edu.vn",
        student_code="HE180002",
        password_hash="hashed_pw_b",
        campus_id=campus.id,
    )
    db_session.add_all([cls1, cls2, stu_a, stu_b])
    db_session.flush()

    db_session.add_all([
        StudentProfile(student_id=stu_a.id, full_name="Student A", major="SE"),
        StudentProfile(student_id=stu_b.id, full_name="Student B", major="DM"),
    ])
    db_session.commit()

    # Cannot create request with same current and target class
    bad_req = MatchingRequest(
        student_id=stu_a.id,
        semester_id=semester.id,
        course_id=course.id,
        current_class_id=cls1.id,
        target_class_id=cls1.id,
        status=SwapRequestStatus.ACTIVE,
    )
    db_session.add(bad_req)
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Re-create valid requests
    req_a = MatchingRequest(
        student_id=stu_a.id,
        semester_id=semester.id,
        course_id=course.id,
        current_class_id=cls1.id,
        target_class_id=cls2.id,
        status=SwapRequestStatus.ACTIVE,
    )
    req_b = MatchingRequest(
        student_id=stu_b.id,
        semester_id=semester.id,
        course_id=course.id,
        current_class_id=cls2.id,
        target_class_id=cls1.id,
        status=SwapRequestStatus.ACTIVE,
    )
    db_session.add_all([req_a, req_b])
    db_session.commit()

    # Duplicate swipe rejected
    db_session.add(
        Swipe(
            swiper_request_id=req_a.id,
            target_request_id=req_b.id,
            swiper_student_id=stu_a.id,
            action=SwipeAction.LIKE,
        )
    )
    db_session.commit()
    db_session.add(
        Swipe(
            swiper_request_id=req_a.id,
            target_request_id=req_b.id,
            swiper_student_id=stu_a.id,
            action=SwipeAction.LIKE,
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()

    # Normalized match pair prevents duplicates
    low_id, high_id = sorted([req_a.id, req_b.id])
    match = Match(
        request_low_id=low_id,
        request_high_id=high_id,
        student_a_id=stu_a.id,
        student_b_id=stu_b.id,
        status=MatchStatus.PENDING_CONFIRMATION,
    )
    db_session.add(match)
    db_session.commit()

    # Message idempotency via client_message_id
    conv = Conversation(
        conversation_type=ConversationType.DIRECT,
        source_type=ConversationSourceType.CLASS_SWAP,
        source_id=match.id,
    )
    db_session.add(conv)
    db_session.commit()

    client_msg_id = str(uuid.uuid4())
    db_session.add(
        Message(
            conversation_id=conv.id,
            sender_id=stu_a.id,
            client_message_id=client_msg_id,
            content="Hello",
        )
    )
    db_session.commit()

    db_session.add(
        Message(
            conversation_id=conv.id,
            sender_id=stu_a.id,
            client_message_id=client_msg_id,
            content="Hello duplicate",
        )
    )
    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()
