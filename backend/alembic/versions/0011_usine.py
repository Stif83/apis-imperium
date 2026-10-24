"""usine : marche/arrêt des centrifugeuses automatiques et rayons mis de côté

Revision ID: 0011
Revises: 0010
"""
from alembic import op
import sqlalchemy as sa


revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('factory', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'factory')
