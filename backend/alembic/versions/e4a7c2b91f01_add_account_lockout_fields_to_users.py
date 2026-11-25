"""add account lockout fields to users

Revision ID: e4a7c2b91f01
Revises: d9f4a812c3e5
Create Date: 2026-11-21 11:52:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e4a7c2b91f01'
down_revision: Union[str, Sequence[str], None] = 'd9f4a812c3e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        'users',
        sa.Column(
            'failed_login_attempts',
            sa.Integer(),
            nullable=False,
            server_default='0',
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'locked_until',
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_check_constraint(
        'ck_users_failed_login_attempts_nonnegative',
        'users',
        'failed_login_attempts >= 0',
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint(
        'ck_users_failed_login_attempts_nonnegative',
        'users',
        type_='check',
    )
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
