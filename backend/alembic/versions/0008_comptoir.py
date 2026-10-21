"""comptoir : commandes des guildes et réputation

Revision ID: 0008
Revises: 0007
"""
from alembic import op
import sqlalchemy as sa


revision = '0008'
down_revision = '0007'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('orders', sa.JSON(), nullable=True))
    op.add_column('players', sa.Column('reputation', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('players', 'reputation')
    op.drop_column('players', 'orders')
