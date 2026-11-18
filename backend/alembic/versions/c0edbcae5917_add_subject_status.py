"""Add subject status

Revision ID: c0edbcae5917
Revises: c19a8e9f7b80
Create Date: 2026-10-27 21:35:55.113587

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c0edbcae5917'
down_revision: Union[str, Sequence[str], None] = 'c19a8e9f7b80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("subjects", recreate="always") as batch_op:
        batch_op.add_column(
            sa.Column(
                "status",
                sa.Enum(
                    "active",
                    "disabled",
                    name="subject_status_enum",
                    native_enum=False,
                    create_constraint=True,
                ),
                server_default=sa.text("'active'"),
                nullable=False,
            )
        )



def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("subjects", recreate="always") as batch_op:
        batch_op.drop_column("status")
