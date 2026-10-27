"""Change subject status default

Revision ID: b491ce2c1e84
Revises: 069ba91419ce
Create Date: 2026-10-27 21:44:37.683037

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b491ce2c1e84'
down_revision: Union[str, Sequence[str], None] = '069ba91419ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
