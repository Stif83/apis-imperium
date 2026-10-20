"""usure des cadres et modules : réserve des modules démontés entamés

Revision ID: 0006
Revises: 0005
"""
from alembic import op
import sqlalchemy as sa


revision = '0006'
down_revision = '0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('worn_modules', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'worn_modules')
