"""p1 reports blocks reviews cycles privacy

Revision ID: c9b2d4f5a618
Revises: b8a1c9e2f304
Create Date: 2026-11-25 22:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9b2d4f5a618"
down_revision: Union[str, Sequence[str], None] = "b8a1c9e2f304"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column(
            "share_contact_after_match",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "student_profiles",
        sa.Column("trust_score", sa.Float(), server_default="5.0", nullable=False),
    )
    op.add_column(
        "student_profiles",
        sa.Column("completed_swaps_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column(
        "student_profiles",
        sa.Column("no_show_count", sa.Integer(), server_default="0", nullable=False),
    )
    op.add_column("reports", sa.Column("resolution_note", sa.Text(), nullable=True))

    op.create_table(
        "student_blocks",
        sa.Column("blocker_id", sa.Uuid(), nullable=False),
        sa.Column("blocked_student_id", sa.Uuid(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["blocker_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["blocked_student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("blocker_id", "blocked_student_id", name="uq_student_blocks_pair"),
    )
    op.create_index("ix_student_blocks_blocker_id", "student_blocks", ["blocker_id"])
    op.create_index("ix_student_blocks_blocked_student_id", "student_blocks", ["blocked_student_id"])

    op.create_table(
        "match_reviews",
        sa.Column("match_id", sa.Uuid(), nullable=False),
        sa.Column("reviewer_id", sa.Uuid(), nullable=False),
        sa.Column("reviewee_id", sa.Uuid(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("outcome", sa.String(length=24), server_default="SUCCESS", nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewer_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewee_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("match_id", "reviewer_id", name="uq_match_reviews_pair"),
    )
    op.create_index("ix_match_reviews_match_id", "match_reviews", ["match_id"])

    bind = op.get_bind()
    match_status_enum = sa.Enum(
        "PENDING_CONFIRMATION",
        "CONFIRMED",
        "DECLINED",
        "COMPLETED",
        "CANCELLED",
        "EXPIRED",
        name="match_status",
        create_type=False,
    )
    if bind.dialect.name == "postgresql":
        from sqlalchemy.dialects import postgresql

        match_status_enum = postgresql.ENUM(
            "PENDING_CONFIRMATION",
            "CONFIRMED",
            "DECLINED",
            "COMPLETED",
            "CANCELLED",
            "EXPIRED",
            name="match_status",
            create_type=False,
        )

    op.create_table(
        "three_way_swap_proposals",
        sa.Column("course_id", sa.Uuid(), nullable=False),
        sa.Column("semester_id", sa.Uuid(), nullable=False),
        sa.Column("req_a_id", sa.Uuid(), nullable=False),
        sa.Column("req_b_id", sa.Uuid(), nullable=False),
        sa.Column("req_c_id", sa.Uuid(), nullable=False),
        sa.Column("student_a_id", sa.Uuid(), nullable=False),
        sa.Column("student_b_id", sa.Uuid(), nullable=False),
        sa.Column("student_c_id", sa.Uuid(), nullable=False),
        sa.Column("a_accepted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("b_accepted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("c_accepted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("status", match_status_enum, nullable=False),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["semester_id"], ["semesters.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["req_a_id"], ["matching_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["req_b_id"], ["matching_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["req_c_id"], ["matching_requests.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_a_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_b_id"], ["students.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_c_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_three_way_course_id", "three_way_swap_proposals", ["course_id"])


def downgrade() -> None:
    op.drop_index("ix_three_way_course_id", table_name="three_way_swap_proposals")
    op.drop_table("three_way_swap_proposals")
    op.drop_index("ix_match_reviews_match_id", table_name="match_reviews")
    op.drop_table("match_reviews")
    op.drop_index("ix_student_blocks_blocked_student_id", table_name="student_blocks")
    op.drop_index("ix_student_blocks_blocker_id", table_name="student_blocks")
    op.drop_table("student_blocks")
    op.drop_column("reports", "resolution_note")
    op.drop_column("student_profiles", "no_show_count")
    op.drop_column("student_profiles", "completed_swaps_count")
    op.drop_column("student_profiles", "trust_score")
    op.drop_column("student_profiles", "share_contact_after_match")
