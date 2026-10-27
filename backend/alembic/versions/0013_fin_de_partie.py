"""fin de partie : Musée du miel, Ruche-monde et effets des élixirs

Revision ID: 0013
Revises: 0012
"""
from alembic import op
import sqlalchemy as sa


revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('museum', sa.JSON(), nullable=True))
    op.add_column('players', sa.Column('world_hive', sa.JSON(), nullable=True))
    op.add_column('players', sa.Column('effects', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'effects')
    op.drop_column('players', 'world_hive')
    op.drop_column('players', 'museum')
