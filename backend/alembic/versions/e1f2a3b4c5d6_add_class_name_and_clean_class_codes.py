"""add student class_name and scope classes uniqueness per course without campus code

Revision ID: e1f2a3b4c5d6
Revises: d4e5f6a7b890
Create Date: 2026-11-25 23:50:00.000000

"""
import re
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e1f2a3b4c5d6"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b890"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_LEGACY_CODE_RE = re.compile(r"^[A-Z0-9]+_(?:HN|DN|HCM|QN|CT|HL)_([0-9]+)$")


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column("class_name", sa.String(length=32), nullable=True),
    )

    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("classes") as batch_op:
            batch_op.drop_constraint("uq_classes_code_sem_campus", type_="unique")
            batch_op.create_unique_constraint(
                "uq_classes_code_course_sem_campus",
                ["code", "course_id", "semester_id", "campus_id"],
            )
    else:
        op.drop_constraint("uq_classes_code_sem_campus", "classes", type_="unique")
        op.create_unique_constraint(
            "uq_classes_code_course_sem_campus",
            "classes",
            ["code", "course_id", "semester_id", "campus_id"],
        )

    rows = bind.execute(
        sa.text("SELECT id, code, course_id, semester_id, campus_id FROM classes")
    ).fetchall()
    existing_keys = {
        (row[1], row[2], row[3], row[4]) for row in rows
    }
    for row in rows:
        cls_id, code, course_id, semester_id, campus_id = row
        m = _LEGACY_CODE_RE.match((code or "").strip().upper())
        if not m:
            continue
        new_code = f"Lớp {m.group(1)}"
        key = (new_code, course_id, semester_id, campus_id)
        if key in existing_keys:
            continue
        existing_keys.add(key)
        bind.execute(
            sa.text("UPDATE classes SET code = :code WHERE id = :id"),
            {"code": new_code, "id": cls_id},
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "sqlite":
        with op.batch_alter_table("classes") as batch_op:
            batch_op.drop_constraint("uq_classes_code_course_sem_campus", type_="unique")
            batch_op.create_unique_constraint(
                "uq_classes_code_sem_campus",
                ["code", "semester_id", "campus_id"],
            )
    else:
        op.drop_constraint("uq_classes_code_course_sem_campus", "classes", type_="unique")
        op.create_unique_constraint(
            "uq_classes_code_sem_campus",
            "classes",
            ["code", "semester_id", "campus_id"],
        )

    op.drop_column("student_profiles", "class_name")
