"""expéditions : équipes en cours et carnet de route

Revision ID: 0010
Revises: 0009
"""
from alembic import op
import sqlalchemy as sa


revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('expeditions', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'expeditions')
