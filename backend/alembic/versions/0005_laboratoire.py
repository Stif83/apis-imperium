"""laboratoire : niveaux, travaux en cours, doses de gènes

Revision ID: 0005
Revises: 0004
"""
from alembic import op
import sqlalchemy as sa


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('players', sa.Column('lab_level', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('players', sa.Column('lab', sa.JSON(), nullable=True))
    op.add_column('player_genes', sa.Column('doses', sa.Integer(), nullable=False, server_default='3'))
    # Les joueurs qui avaient déjà le laboratoire démarrent au niveau 1
    players = sa.table('players', sa.column('lab_level', sa.Integer()), sa.column('genetics_unlocked', sa.Boolean()))
    op.execute(players.update().where(players.c.genetics_unlocked == sa.true()).values(lab_level=1))


def downgrade() -> None:
    op.drop_column('player_genes', 'doses')
    op.drop_column('players', 'lab')
    op.drop_column('players', 'lab_level')
