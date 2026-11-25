"""cascade student deletion to test attempts

Revision ID: f2c1a8b7d9e0
Revises: e4a7c2b91f01
Create Date: 2026-11-25 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f2c1a8b7d9e0"
down_revision: Union[str, Sequence[str], None] = "e4a7c2b91f01"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "test_attempts_user_id_fkey",
        "test_attempts",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "test_attempts_user_id_fkey",
        "test_attempts",
        "users",
        ["user_id"],
        ["user_id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(
        "test_attempts_user_id_fkey",
        "test_attempts",
        type_="foreignkey",
    )
    op.create_foreign_key(
        "test_attempts_user_id_fkey",
        "test_attempts",
        "users",
        ["user_id"],
        ["user_id"],
        ondelete="RESTRICT",
    )
