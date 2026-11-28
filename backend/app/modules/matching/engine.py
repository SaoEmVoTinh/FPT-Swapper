"""
Matching engine: determines whether two swap requests are compatible.

Compatibility rule (from §9 of project plan):
  req_a wants to swap FROM class_A TO class_B
  req_b wants to swap FROM class_B TO class_A
  → they are a perfect match if:
      req_a.current_class_id == req_b.target_class_id
      AND
      req_a.target_class_id == req_b.current_class_id
      AND
      same course + same semester
"""

from app.database.models.matching import MatchingRequest


def is_compatible(req_a: MatchingRequest, req_b: MatchingRequest) -> bool:
    """Return True when req_a and req_b are a valid exchange pair.

    When target_class_id is None, that side is open to any other class in the same
    course and semester (as long as the two students are not already in the same class).
    """
    if req_a.id == req_b.id:
        return False
    if req_a.course_id != req_b.course_id:
        return False
    if req_a.semester_id != req_b.semester_id:
        return False
    if req_a.current_class_id == req_b.current_class_id:
        return False
    return (
        req_a.target_class_id is None or req_a.target_class_id == req_b.current_class_id
    ) and (
        req_b.target_class_id is None or req_b.target_class_id == req_a.current_class_id
    )
