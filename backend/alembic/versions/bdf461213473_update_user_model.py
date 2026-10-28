
"""Update user model

Revision ID: bdf461213473
Revises: 25e02caa1084
Create Date: 2026-10-27 21:02:13.532739
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "bdf461213473"
down_revision: Union[str, Sequence[str], None] = "25e02caa1084"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column(
            "account_status",
            existing_type=sa.VARCHAR(length=20),
            type_=sa.Enum(
                "pending",
                "active",
                "disabled",
                name="account_status_enum",
                native_enum=False,
                create_constraint=True,
            ),
            existing_nullable=False,
            existing_server_default=sa.text("'pending'"),
        )


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("users", recreate="always") as batch_op:
        batch_op.alter_column(
            "account_status",
            existing_type=sa.Enum(
                "pending",
                "active",
                "disabled",
                name="account_status_enum",
                native_enum=False,
                create_constraint=True,
            ),
            type_=sa.VARCHAR(length=20),
            existing_nullable=False,
            existing_server_default=sa.text("'pending'"),
        )
