"""split share_contact_after_match into email and student code flags

Revision ID: f2a3b4c5d6e7
Revises: e1f2a3b4c5d6
Create Date: 2026-11-26 09:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f2a3b4c5d6e7"
down_revision: Union[str, Sequence[str], None] = "e1f2a3b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "student_profiles",
        sa.Column(
            "share_email_after_match",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.add_column(
        "student_profiles",
        sa.Column(
            "share_student_code_after_match",
            sa.Boolean(),
            server_default=sa.text("false"),
            nullable=False,
        ),
    )
    op.execute(
        """
        UPDATE student_profiles
        SET share_email_after_match = share_contact_after_match,
            share_student_code_after_match = share_contact_after_match
        """
    )


def downgrade() -> None:
    op.drop_column("student_profiles", "share_student_code_after_match")
    op.drop_column("student_profiles", "share_email_after_match")
