"""p2 push subscriptions, chat attachments, consent

Revision ID: d4e5f6a7b890
Revises: c9b2d4f5a618
Create Date: 2026-11-25 23:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b890"
down_revision: Union[str, Sequence[str], None] = "c9b2d4f5a618"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE message_type ADD VALUE IF NOT EXISTS 'IMAGE'")

    op.add_column(
        "students",
        sa.Column("consent_accepted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "students",
        sa.Column("consent_version", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "student_profiles",
        sa.Column(
            "notify_email",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "student_profiles",
        sa.Column(
            "notify_push",
            sa.Boolean(),
            server_default=sa.text("true"),
            nullable=False,
        ),
    )
    op.add_column(
        "messages",
        sa.Column("attachment_url", sa.String(length=512), nullable=True),
    )

    op.create_table(
        "push_subscriptions",
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("endpoint", sa.String(length=1024), nullable=False),
        sa.Column("p256dh", sa.String(length=255), nullable=False),
        sa.Column("auth", sa.String(length=255), nullable=False),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("endpoint"),
    )
    op.create_index("ix_push_subscriptions_student_id", "push_subscriptions", ["student_id"])


def downgrade() -> None:
    op.drop_index("ix_push_subscriptions_student_id", table_name="push_subscriptions")
    op.drop_table("push_subscriptions")
    op.drop_column("messages", "attachment_url")
    op.drop_column("student_profiles", "notify_push")
    op.drop_column("student_profiles", "notify_email")
    op.drop_column("students", "consent_version")
    op.drop_column("students", "consent_accepted_at")
