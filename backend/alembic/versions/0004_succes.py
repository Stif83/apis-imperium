"""succès : statistiques et succès débloqués

Revision ID: 0004
Revises: 0003
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('stats', sa.JSON(), nullable=True))
    op.add_column('players', sa.Column('achievements', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'achievements')
    op.drop_column('players', 'stats')
