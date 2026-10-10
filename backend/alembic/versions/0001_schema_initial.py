"""schema initial

Revision ID: 0001
Revises: 
"""
from alembic import op
import sqlalchemy as sa


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('players',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('sub', sa.String(length=255), nullable=False),
    sa.Column('username', sa.String(length=255), nullable=False),
    sa.Column('honey', sa.BigInteger(), nullable=False),
    sa.Column('genetics_unlocked', sa.Boolean(), nullable=False),
    sa.Column('last_sim_ms', sa.BigInteger(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_players_sub'), ['sub'], unique=True)

    op.create_table('discoveries',
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=16), nullable=False),
    sa.Column('species_id', sa.String(length=64), nullable=False),
    sa.Column('discovered_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('player_id', 'kind', 'species_id')
    )
    op.create_table('hives',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('hive_type', sa.String(length=32), nullable=False),
    sa.Column('name', sa.String(length=64), nullable=False),
    sa.Column('biome', sa.String(length=32), nullable=False),
    sa.Column('slots', sa.Integer(), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('modules', sa.JSON(), nullable=False),
    sa.Column('queen', sa.JSON(none_as_null=True), nullable=True),
    sa.Column('output', sa.JSON(), nullable=False),
    sa.Column('settings', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('hives', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_hives_player_id'), ['player_id'], unique=False)

    op.create_table('inventory_items',
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('item_id', sa.String(length=64), nullable=False),
    sa.Column('qty', sa.BigInteger(), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('player_id', 'item_id')
    )
    op.create_table('machines',
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('machine_id', sa.String(length=32), nullable=False),
    sa.Column('qty', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('player_id', 'machine_id')
    )
    op.create_table('player_genes',
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=16), nullable=False),
    sa.Column('chromosome', sa.String(length=32), nullable=False),
    sa.Column('allele', sa.String(length=64), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('player_id', 'kind', 'chromosome', 'allele')
    )
    op.create_table('showcases',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('title', sa.String(length=80), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('entries', sa.JSON(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('showcases', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_showcases_player_id'), ['player_id'], unique=False)

    op.create_table('bees',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('kind', sa.String(length=16), nullable=False),
    sa.Column('type', sa.String(length=16), nullable=False),
    sa.Column('genome', sa.JSON(), nullable=False),
    sa.Column('genome_hash', sa.String(length=40), nullable=False),
    sa.Column('count', sa.Integer(), nullable=False),
    sa.Column('hive_id', sa.String(length=36), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=False),
    sa.ForeignKeyConstraint(['hive_id'], ['hives.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('bees', schema=None) as batch_op:
        batch_op.create_index(batch_op.f('ix_bees_player_id'), ['player_id'], unique=False)

    op.create_table('showcase_likes',
    sa.Column('showcase_id', sa.String(length=36), nullable=False),
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['showcase_id'], ['showcases.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('showcase_id', 'player_id')
    )


def downgrade() -> None:
    op.drop_table('showcase_likes')
    with op.batch_alter_table('bees', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_bees_player_id'))

    op.drop_table('bees')
    with op.batch_alter_table('showcases', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_showcases_player_id'))

    op.drop_table('showcases')
    op.drop_table('player_genes')
    op.drop_table('machines')
    op.drop_table('inventory_items')
    with op.batch_alter_table('hives', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_hives_player_id'))

    op.drop_table('hives')
    op.drop_table('discoveries')
    with op.batch_alter_table('players', schema=None) as batch_op:
        batch_op.drop_index(batch_op.f('ix_players_sub'))

    op.drop_table('players')
