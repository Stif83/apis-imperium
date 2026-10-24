"""suppression du jardin (parcelles, pousses, papillons, colonnes « kind ») et de genetics_unlocked

Revision ID: 0012
Revises: 0011
"""
from alembic import op
import sqlalchemy as sa


revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None

# Objets que seuls les arbres donnaient
TREE_ITEMS = ("wood", "apple", "nut", "chestnut", "papaya", "dates")


def upgrade() -> None:
    op.execute("DELETE FROM bees WHERE kind <> 'bee'")
    op.execute("DELETE FROM discoveries WHERE kind <> 'bee'")
    op.execute("DELETE FROM player_genes WHERE kind <> 'bee'")
    op.execute("DELETE FROM inventory_items WHERE item_id IN ('" + "', '".join(TREE_ITEMS) + "')")
    # Les vitrines gardent une copie des spécimens : on n'y laisse que les abeilles
    showcases = sa.table('showcases', sa.column('id', sa.String()), sa.column('entries', sa.JSON()))
    conn = op.get_bind()
    for sid, entries in conn.execute(sa.select(showcases.c.id, showcases.c.entries)).all():
        bees = [{k: v for k, v in e.items() if k != 'kind'} for e in entries or [] if e.get('kind', 'bee') == 'bee']
        if bees != entries:
            conn.execute(showcases.update().where(showcases.c.id == sid).values(entries=bees))
    op.drop_index('ix_plots_player_id', table_name='plots')
    op.drop_table('plots')
    op.drop_column('bees', 'kind')
    # La colonne faisait partie de la clé primaire : on la retire, puis on recrée la clé sans elle
    op.drop_constraint('discoveries_pkey', 'discoveries', type_='primary')
    op.drop_column('discoveries', 'kind')
    op.create_primary_key('discoveries_pkey', 'discoveries', ['player_id', 'species_id'])
    op.drop_constraint('player_genes_pkey', 'player_genes', type_='primary')
    op.drop_column('player_genes', 'kind')
    op.create_primary_key('player_genes_pkey', 'player_genes', ['player_id', 'chromosome', 'allele'])
    # Remplacée par lab_level depuis le laboratoire à niveaux
    op.drop_column('players', 'genetics_unlocked')


def downgrade() -> None:
    op.add_column('players', sa.Column('genetics_unlocked', sa.Boolean(), nullable=False, server_default=sa.false()))
    op.drop_constraint('player_genes_pkey', 'player_genes', type_='primary')
    op.add_column('player_genes', sa.Column('kind', sa.String(length=16), nullable=False, server_default='bee'))
    op.create_primary_key('player_genes_pkey', 'player_genes', ['player_id', 'kind', 'chromosome', 'allele'])
    op.drop_constraint('discoveries_pkey', 'discoveries', type_='primary')
    op.add_column('discoveries', sa.Column('kind', sa.String(length=16), nullable=False, server_default='bee'))
    op.create_primary_key('discoveries_pkey', 'discoveries', ['player_id', 'kind', 'species_id'])
    op.add_column('bees', sa.Column('kind', sa.String(length=16), nullable=False, server_default='bee'))
    op.create_table('plots',
    sa.Column('id', sa.String(length=36), nullable=False),
    sa.Column('player_id', sa.String(length=36), nullable=False),
    sa.Column('position', sa.Integer(), nullable=False),
    sa.Column('tree', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['player_id'], ['players.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_plots_player_id', 'plots', ['player_id'], unique=False)
