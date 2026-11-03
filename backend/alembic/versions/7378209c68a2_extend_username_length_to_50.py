"""Extend username length to 50

Revision ID: 7378209c68a2
Revises: a4f99afcfa61
Create Date: 2026-11-01 21:40:00.703297

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7378209c68a2'
down_revision: Union[str, Sequence[str], None] = 'a4f99afcfa61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "username",
            existing_type=sa.VARCHAR(length=8),
            type_=sa.String(length=50),
            existing_nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("users") as batch_op:
        batch_op.alter_column(
            "username",
            existing_type=sa.String(length=50),
            type_=sa.String(length=8),
            existing_nullable=False,
        )
