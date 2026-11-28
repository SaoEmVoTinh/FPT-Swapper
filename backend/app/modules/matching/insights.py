"""Smart swap recommendations and class demand heatmap insights."""

import uuid
from collections import defaultdict
from datetime import datetime, timezone

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.common.enums import SwapRequestStatus
from app.database.models.academic import AcademicClass, Course, Semester
from app.database.models.identity import Student
from app.database.models.matching import MatchingRequest, Swipe
from app.modules.matching.conflicts import detect_schedule_conflict
from app.modules.matching.engine import is_compatible
from app.modules.matching.service import MatchingService
from app.modules.views import schedule_text


def build_swap_insights(
    db: Session,
    student_id: uuid.UUID,
    campus_id: uuid.UUID,
    limit: int = 8,
) -> dict:
    now = datetime.now(timezone.utc)
    blocked_ids = MatchingService._blocked_student_ids(db, student_id)
    my_requests = MatchingService.list_my_active_requests(db, student_id)

    active_campus_reqs = (
        db.query(MatchingRequest)
        .join(Student, Student.id == MatchingRequest.student_id)
        .join(AcademicClass, AcademicClass.id == MatchingRequest.current_class_id)
        .filter(
            MatchingRequest.status == SwapRequestStatus.ACTIVE,
            Student.campus_id == campus_id,
            AcademicClass.campus_id == campus_id,
            or_(MatchingRequest.expires_at.is_(None), MatchingRequest.expires_at > now),
        )
        .order_by(MatchingRequest.created_at.desc())
        .limit(300)
        .all()
    )

    swiped_ids = {
        row[0]
        for row in db.query(Swipe.target_request_id).filter(
            Swipe.swiper_student_id == student_id
        )
    }

    recommendations: list[dict] = []
    for cand in active_campus_reqs:
        if cand.student_id == student_id or cand.student_id in blocked_ids:
            continue
        if cand.id in swiped_ids:
            continue

        compatible_mine = next(
            (m for m in my_requests if is_compatible(m, cand)),
            None,
        )
        reciprocal = (
            MatchingService.has_liked(db, cand.id, compatible_mine.id)
            if compatible_mine is not None
            else False
        )

        cur_cls = db.get(AcademicClass, cand.current_class_id)
        tgt_cls = db.get(AcademicClass, cand.target_class_id) if cand.target_class_id else None
        course = db.get(Course, cand.course_id)
        partner = db.get(Student, cand.student_id)
        profile = partner.profile if partner else None
        trust = float(profile.trust_score) if profile else 5.0
        completed = int(profile.completed_swaps_count) if profile else 0

        conflict = detect_schedule_conflict(
            db,
            student_id,
            cur_cls,
            exclude_request_id=compatible_mine.id if compatible_mine else None,
        )

        score = 20
        reasons: list[str] = []
        if reciprocal:
            score += 45
            reasons.append("Đã Like bạn trước")
        if compatible_mine is not None:
            score += 25
            if compatible_mine.target_class_id is not None and cand.target_class_id is not None:
                reasons.append("Khớp ngược chiều 100%")
            else:
                reasons.append("Cùng môn • Mở đổi lớp")
        elif any(m.course_id == cand.course_id for m in my_requests):
            score += 10
            reasons.append("Cùng môn bạn đang tìm")
        if conflict is None:
            score += 10
            reasons.append("Không trùng TKB")
        else:
            score -= 20
            reasons.append("Cảnh báo trùng lịch")
        if trust >= 4.5:
            score += 10
            if completed > 0:
                reasons.append(f"Uy tín {trust:.1f}★ ({completed} lượt)")
            else:
                reasons.append(f"Uy tín {trust:.1f}★")

        score = max(0, min(100, score))
        recommendations.append(
            {
                "request_id": cand.id,
                "for_request_id": compatible_mine.id if compatible_mine else None,
                "course_code": course.code if course else "",
                "course_name": course.name if course else "",
                "current_class_code": cur_cls.code if cur_cls else "",
                "target_class_code": tgt_cls.code if tgt_cls else "",
                "current_schedule_text": schedule_text(cur_cls),
                "partner_name": profile.full_name if profile and profile.full_name else "Sinh viên FPT",
                "trust_score": trust,
                "is_compatible": compatible_mine is not None,
                "is_reciprocal_ready": reciprocal,
                "schedule_conflict_warning": conflict,
                "score": score,
                "reasons": reasons[:3],
            }
        )

    recommendations.sort(key=lambda r: (-r["score"], -r["trust_score"]))

    # Heatmap aggregation by (course, class)
    leaving_counts: dict[uuid.UUID, int] = defaultdict(int)
    entering_counts: dict[uuid.UUID, int] = defaultdict(int)
    class_meta: dict[uuid.UUID, AcademicClass] = {}

    for req in active_campus_reqs:
        leaving_counts[req.current_class_id] += 1
        if req.target_class_id is not None:
            entering_counts[req.target_class_id] += 1
        if req.current_class_id not in class_meta:
            c = db.get(AcademicClass, req.current_class_id)
            if c:
                class_meta[req.current_class_id] = c
        if req.target_class_id is not None and req.target_class_id not in class_meta:
            c = db.get(AcademicClass, req.target_class_id)
            if c:
                class_meta[req.target_class_id] = c

    heatmap: list[dict] = []
    for cls_id, cls in class_meta.items():
        leaving = leaving_counts.get(cls_id, 0)
        entering = entering_counts.get(cls_id, 0)
        total = leaving + entering
        if total == 0:
            continue
        course = db.get(Course, cls.course_id)
        semester = db.get(Semester, cls.semester_id)
        heat_level = "HIGH" if total >= 4 or entering >= 3 else ("MEDIUM" if total >= 2 else "LOW")
        heatmap.append(
            {
                "class_id": cls_id,
                "course_code": course.code if course else "",
                "course_name": course.name if course else "",
                "class_code": cls.code,
                "semester_name": semester.name if semester else "",
                "schedule_text": schedule_text(cls),
                "leaving_count": leaving,
                "entering_count": entering,
                "net_demand": entering - leaving,
                "total_activity": total,
                "heat_level": heat_level,
            }
        )

    heatmap.sort(key=lambda h: (-h["total_activity"], -h["entering_count"], h["course_code"]))
    return {
        "recommendations": recommendations[:limit],
        "heatmap": heatmap[:25],
    }
