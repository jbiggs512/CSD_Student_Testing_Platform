"""Add subject status check constraint

Revision ID: 069ba91419ce
Revises: c0edbcae5917
Create Date: 2026-10-27 21:41:08.315090

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '069ba91419ce'
down_revision: Union[str, Sequence[str], None] = 'c0edbcae5917'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add database constraint for valid subject statuses."""
    with op.batch_alter_table("subjects", recreate="always") as batch_op:
        batch_op.create_check_constraint(
            "subject_status_enum",
            "status IN ('active', 'disabled')",
        )


def downgrade() -> None:
    """Remove database constraint for subject statuses."""
    with op.batch_alter_table("subjects", recreate="always") as batch_op:
        batch_op.drop_constraint(
            "subject_status_enum",
            type_="check",
        )

