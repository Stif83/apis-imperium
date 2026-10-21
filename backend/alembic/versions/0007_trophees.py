"""trophées du Carnet et pedigree des espèces

Revision ID: 0007
Revises: 0006
"""
from alembic import op
import sqlalchemy as sa


revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Restent vides : le jeu les remplit à la première lecture (conversion des objectifs et succès)
    op.add_column('players', sa.Column('trophies', sa.JSON(), nullable=True))
    op.add_column('players', sa.Column('pedigree', sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column('players', 'pedigree')
    op.drop_column('players', 'trophies')
