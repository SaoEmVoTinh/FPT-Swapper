"""
Seed script: populate the database with initial data for FPT ClassSwap.
Run from backend/ directory:
    python seed.py

Target: DATABASE_URL in environment (or SQLite fallback for local dev)
"""

import os
import sys
from datetime import date, datetime, timezone

# Allow running as a script
sys.path.insert(0, os.path.dirname(__file__))

from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.database.models import *  # noqa: F401, F403 — ensure all models are imported for metadata

CAMPUSES = [
    {"code": "HN", "name": "Hà Nội (Hòa Lạc)"},
    {"code": "HCM", "name": "TP. Hồ Chí Minh"},
    {"code": "DN", "name": "Đà Nẵng"},
    {"code": "CT", "name": "Cần Thơ"},
    {"code": "QN", "name": "Quy Nhơn"},
]

SEMESTERS = [
    {
        "code": "SP2025",
        "name": "Spring 2025",
        "start_date": date(2025, 1, 6),
        "end_date": date(2025, 5, 16),
        "is_active": False,
    },
    {
        "code": "SU2025",
        "name": "Summer 2025",
        "start_date": date(2025, 5, 19),
        "end_date": date(2025, 9, 5),
        "is_active": False,
    },
    {
        "code": "FA2025",
        "name": "Fall 2025",
        "start_date": date(2025, 9, 8),
        "end_date": date(2026, 1, 9),
        "is_active": True,
    },
]

COURSES = [
    {"code": "PRF192", "name": "Introduction to Programming", "credits": 3},
    {"code": "MAD101", "name": "Discrete Mathematics", "credits": 3},
    {"code": "ENW492", "name": "English Writing 4", "credits": 3},
    {"code": "CEA201", "name": "Computer Organization & Architecture", "credits": 3},
    {"code": "OSG202", "name": "Operating Systems", "credits": 3},
    {"code": "SWE201c", "name": "Introduction to Software Engineering", "credits": 3},
    {"code": "DBM301", "name": "Database Management", "credits": 3},
    {"code": "NET1014", "name": "Computer Networks", "credits": 3},
]

# Classes for active semester (FA2025) at HCM campus
# Schedules: slot convention Mon/Tue/.., 1-6 (FPT slot system)
CLASSES_HCM_FA2025 = [
    {
        "code": "PRF192_SE1234",
        "course_code": "PRF192",
        "lecturer": "Nguyen Van A",
        "schedules": [{"day_of_week": "Monday", "slot": "1", "room": "A101"}],
    },
    {
        "code": "PRF192_SE1235",
        "course_code": "PRF192",
        "lecturer": "Tran Thi B",
        "schedules": [{"day_of_week": "Monday", "slot": "3", "room": "A102"}],
    },
    {
        "code": "PRF192_SE1236",
        "course_code": "PRF192",
        "lecturer": "Le Van C",
        "schedules": [{"day_of_week": "Tuesday", "slot": "1", "room": "A201"}],
    },
    {
        "code": "MAD101_SE1240",
        "course_code": "MAD101",
        "lecturer": "Pham Thi D",
        "schedules": [{"day_of_week": "Wednesday", "slot": "2", "room": "B301"}],
    },
    {
        "code": "MAD101_SE1241",
        "course_code": "MAD101",
        "lecturer": "Hoang Van E",
        "schedules": [{"day_of_week": "Thursday", "slot": "4", "room": "B302"}],
    },
    {
        "code": "DBM301_SE1250",
        "course_code": "DBM301",
        "lecturer": "Vo Thi F",
        "schedules": [
            {"day_of_week": "Friday", "slot": "1", "room": "C401"},
            {"day_of_week": "Friday", "slot": "2", "room": "C401"},
        ],
    },
    {
        "code": "DBM301_SE1251",
        "course_code": "DBM301",
        "lecturer": "Bui Van G",
        "schedules": [
            {"day_of_week": "Saturday", "slot": "1", "room": "C402"},
            {"day_of_week": "Saturday", "slot": "2", "room": "C402"},
        ],
    },
]


def run():
    from app.database.models.academic import (
        AcademicClass,
        Campus,
        ClassSchedule,
        Course,
        Semester,
    )

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Campuses
        campus_map: dict[str, Campus] = {}
        for c in CAMPUSES:
            existing = db.query(Campus).filter(Campus.code == c["code"]).first()
            if not existing:
                obj = Campus(**c)
                db.add(obj)
                db.flush()
                campus_map[c["code"]] = obj
                print(f"  [+] Campus: {c['code']}")
            else:
                campus_map[c["code"]] = existing

        # Semesters
        semester_map: dict[str, Semester] = {}
        for s in SEMESTERS:
            existing = db.query(Semester).filter(Semester.code == s["code"]).first()
            if not existing:
                obj = Semester(**s)
                db.add(obj)
                db.flush()
                semester_map[s["code"]] = obj
                print(f"  [+] Semester: {s['code']}")
            else:
                semester_map[s["code"]] = existing

        # Courses
        course_map: dict[str, Course] = {}
        for co in COURSES:
            existing = db.query(Course).filter(Course.code == co["code"]).first()
            if not existing:
                obj = Course(**co)
                db.add(obj)
                db.flush()
                course_map[co["code"]] = obj
                print(f"  [+] Course: {co['code']}")
            else:
                course_map[co["code"]] = existing

        # Classes (FA2025 / HCM)
        hcm = campus_map["HCM"]
        fa2025 = semester_map["FA2025"]
        for cl in CLASSES_HCM_FA2025:
            existing = (
                db.query(AcademicClass)
                .filter(
                    AcademicClass.code == cl["code"],
                    AcademicClass.semester_id == fa2025.id,
                    AcademicClass.campus_id == hcm.id,
                )
                .first()
            )
            if not existing:
                course = course_map[cl["course_code"]]
                obj = AcademicClass(
                    code=cl["code"],
                    course_id=course.id,
                    semester_id=fa2025.id,
                    campus_id=hcm.id,
                    lecturer=cl.get("lecturer"),
                )
                db.add(obj)
                db.flush()
                for sch in cl["schedules"]:
                    db.add(ClassSchedule(class_id=obj.id, **sch))
                print(f"  [+] Class: {cl['code']}")

        db.commit()
        print("\nSeed complete!")
    except Exception as e:
        db.rollback()
        print(f"ERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding database...")
    run()
