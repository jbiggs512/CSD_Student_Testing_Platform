"""link questions to subject and make test_id nullable

Revision ID: d9f4a812c3e5
Revises: 3d81b0d1181d
Create Date: 2026-11-12 18:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd9f4a812c3e5'
down_revision: Union[str, Sequence[str], None] = '3d81b0d1181d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('questions', sa.Column('subject_id', sa.Integer(), nullable=True))
    op.alter_column('questions', 'test_id', existing_type=sa.Integer(), nullable=True)
    op.create_index('idx_questions_subject_id', 'questions', ['subject_id'], unique=False)
    op.create_foreign_key(
        'questions_subject_id_fkey',
        'questions',
        'subjects',
        ['subject_id'],
        ['subject_id'],
        ondelete='RESTRICT',
    )
    op.execute(
        """
        UPDATE questions q
        SET subject_id = t.subject_id
        FROM tests t
        WHERE q.test_id = t.test_id AND q.subject_id IS NULL
        """
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('questions_subject_id_fkey', 'questions', type_='foreignkey')
    op.drop_index('idx_questions_subject_id', table_name='questions')
    op.alter_column('questions', 'test_id', existing_type=sa.Integer(), nullable=False)
    op.drop_column('questions', 'subject_id')
