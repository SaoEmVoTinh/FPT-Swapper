"""p0 security rbac match expiry reports

Revision ID: b8a1c9e2f304
Revises: 7431e8d449a7
Create Date: 2026-11-25 22:08:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8a1c9e2f304"
down_revision: Union[str, Sequence[str], None] = "7431e8d449a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        with op.get_context().autocommit_block():
            op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'SUPER_ADMIN'")
            op.execute("ALTER TYPE match_status ADD VALUE IF NOT EXISTS 'EXPIRED'")

    op.add_column("students", sa.Column("failed_login_attempts", sa.Integer(), server_default="0", nullable=False))
    op.add_column("students", sa.Column("locked_until", sa.DateTime(timezone=True), nullable=True))
    op.add_column("students", sa.Column("token_version", sa.Integer(), server_default="0", nullable=False))
    op.add_column("students", sa.Column("totp_secret", sa.String(length=64), nullable=True))
    op.add_column("students", sa.Column("totp_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False))
    op.add_column("students", sa.Column("scheduled_purge_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "refresh_tokens",
        sa.Column("student_id", sa.Uuid(), nullable=False),
        sa.Column("token_jti", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["student_id"], ["students.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_jti"),
    )
    op.create_index("ix_refresh_tokens_student_id", "refresh_tokens", ["student_id"])
    op.create_index("ix_refresh_tokens_token_jti", "refresh_tokens", ["token_jti"])

    op.add_column("matches", sa.Column("confirm_deadline_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("reports", sa.Column("anonymized_reporter_ref", sa.String(length=64), nullable=True))
    op.add_column("reports", sa.Column("anonymized_reported_ref", sa.String(length=64), nullable=True))
    op.alter_column("reports", "reporter_id", nullable=True)
    op.alter_column("reports", "reported_student_id", nullable=True)


def downgrade() -> None:
    op.alter_column("reports", "reported_student_id", nullable=False)
    op.alter_column("reports", "reporter_id", nullable=False)
    op.drop_column("reports", "anonymized_reported_ref")
    op.drop_column("reports", "anonymized_reporter_ref")
    op.drop_column("matches", "confirm_deadline_at")
    op.drop_index("ix_refresh_tokens_token_jti", table_name="refresh_tokens")
    op.drop_index("ix_refresh_tokens_student_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_column("students", "scheduled_purge_at")
    op.drop_column("students", "totp_enabled")
    op.drop_column("students", "totp_secret")
    op.drop_column("students", "token_version")
    op.drop_column("students", "locked_until")
    op.drop_column("students", "failed_login_attempts")
