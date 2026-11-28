"""make target_class_id optional on matching_requests

Revision ID: a3b4c5d6e7f8
Revises: f2a3b4c5d6e7
Create Date: 2026-11-28 17:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, Sequence[str], None] = "f2a3b4c5d6e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("matching_requests") as batch_op:
        batch_op.drop_constraint("ck_matching_requests_diff_classes", type_="check")
        batch_op.alter_column(
            "target_class_id",
            existing_type=sa.Uuid(),
            nullable=True,
        )
        batch_op.create_check_constraint(
            "ck_matching_requests_diff_classes",
            "target_class_id IS NULL OR current_class_id <> target_class_id",
        )


def downgrade() -> None:
    with op.batch_alter_table("matching_requests") as batch_op:
        batch_op.drop_constraint("ck_matching_requests_diff_classes", type_="check")
        batch_op.alter_column(
            "target_class_id",
            existing_type=sa.Uuid(),
            nullable=False,
        )
        batch_op.create_check_constraint(
            "ck_matching_requests_diff_classes",
            "current_class_id <> target_class_id",
        )
