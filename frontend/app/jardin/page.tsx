'use client';

import { useState } from 'react';
import { ButterflyIcon, TreeIcon, treeName } from '@/components/garden';
import { Honey, ItemQty, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { GameState, Genome, Plot } from '@/lib/types';

type Harvest = { items: Record<string, number>; butterflies: string[] };

const percent = (chance: number) => `${(chance * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

function TreeGenome({ genome }: { genome: Genome }) {
  const { content } = useGame();
  const { chromosomes, alleles, trees } = content.garden;
  const label = (c: string, allele: string) => (c === 'species' ? trees[allele]?.label : alleles[c]?.[allele]?.label) ?? allele;
  return (
    <table className="genome">
      <thead>
        <tr>
          <th />
          <th>Actif</th>
          <th>Inactif</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(chromosomes).map(([c, name]) => (
          <tr key={c}>
            <th>{name}</th>
            <td>{label(c, genome[c][0])}</td>
            <td className="muted">{label(c, genome[c][1])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PlotCard({ plot, index, onHarvest }: { plot: Plot; index: number; onHarvest: (h: Harvest) => void }) {
  const { content, state, act, request } = useGame();
  const [sapling, setSapling] = useState('');
  const [pollen, setPollen] = useState('');
  const saplings = state.garden.saplings;
  const total = saplings.reduce((n, s) => n + s.count, 0);
  const saplingId = saplings.some((s) => s.id === sapling) ? sapling : saplings[0]?.id ?? '';
  // Par défaut, on pollinise avec une autre espèce : c'est ce qui permet les croisements
  const pollenId = saplings.some((s) => s.id === pollen) ? pollen : (saplings.find((s) => s.id !== saplingId) ?? saplings[0])?.id ?? '';
  const tree = plot.tree;
  const species = tree ? content.garden.trees[tree.genome.species[0]] : null;
  const grown = tree ? (tree.max_health - tree.health) / tree.max_health : 0;

  const harvest = async () => {
    const result = await request<GameState & { harvest: Harvest }>(`/garden/plots/${plot.id}/harvest`);
    if (result) onHarvest(result.harvest);
  };

  return (
    <div className="card plot-card">
      <div className="row between">
        <span className="title">Parcelle {index + 1}</span>
        {plot.status === 'empty' && <span className="badge">Libre</span>}
        {plot.status === 'growing' && <span className="badge ok">En croissance</span>}
        {plot.status === 'mature' && <span className="badge warn">À récolter</span>}
      </div>

      {tree && species ? (
        <>
          <div className="plot-tree">
            <TreeIcon color={species.color} secondary={species.secondary} size={Math.round(28 + 52 * grown)} />
          </div>
          <div>
            <div className="title">{treeName(content, tree.genome)}</div>
            <div className="muted">Pollinisé par : {treeName(content, tree.mate)}</div>
          </div>
          {plot.status === 'growing' ? (
            <div className="bar" title={`Reste ${tree.health} cycles sur ${tree.max_health}`}>
              <div style={{ width: `${100 * grown}%` }} />
            </div>
          ) : (
            <button className="primary" onClick={harvest}>
              Récolter
            </button>
          )}
        </>
      ) : total >= 2 ? (
        <div className="stack">
          <label className="muted">Pousse à planter</label>
          <select value={saplingId} onChange={(e) => setSapling(e.target.value)}>
            {saplings.map((s) => (
              <option key={s.id} value={s.id}>
                {treeName(content, s.genome)} ×{s.count}
              </option>
            ))}
          </select>
          <label className="muted">Pollinisée avec</label>
          <select value={pollenId} onChange={(e) => setPollen(e.target.value)}>
            {saplings.map((s) => (
              <option key={s.id} value={s.id}>
                {treeName(content, s.genome)} ×{s.count}
              </option>
            ))}
          </select>
          <button className="primary" onClick={() => act(`/garden/plots/${plot.id}/plant`, { sapling_id: saplingId, pollen_id: pollenId })}>
            Planter
          </button>
        </div>
      ) : (
        <div className="muted">Il faut deux pousses : une à planter, une pour la polliniser. Les pousses s'achètent en boutique.</div>
      )}
    </div>
  );
}

export default function GardenPage() {
  const { content, state, act } = useGame();
  const [last, setLast] = useState<Harvest | null>(null);
  const { trees, butterflies, mutations, sapling_sell } = content.garden;
  const garden = state.garden;
  const foundTrees = new Set(garden.found_trees);
  const foundButterflies = new Set(garden.found_butterflies);
  const owned = Object.fromEntries(garden.butterflies.map((b) => [b.species, b]));
  const treeLabel = (id: string) => (foundTrees.has(id) ? trees[id].label : '???');
  const knownMutations = mutations.filter((m) => foundTrees.has(m.a) && foundTrees.has(m.b));
  const plotOffer = state.offers.plot;

  return (
    <>
      <h1>Jardin</h1>
      <p className="muted">
        Plantez une pousse et pollinisez-la avec une autre : l'arbre grandit, puis sa récolte donne du bois, des fruits et de nouvelles
        pousses qui héritent des deux parents — parfois d'une espèce nouvelle. Chaque espèce d'arbre attire ses propres papillons.
      </p>

      {last && (
        <div className="notice row between">
          <span className="row">
            Récolte :
            {Object.entries(last.items).map(([item, n]) => (
              <ItemQty key={item} id={item} qty={n} />
            ))}
            {Object.keys(last.items).length === 0 && <span className="muted">aucun produit cette fois</span>}
            {last.butterflies.map((b) => (
              <span key={b} className="chip">
                <ButterflyIcon color={butterflies[b].color} secondary={butterflies[b].secondary} size={18} />
                {butterflies[b].label}
              </span>
            ))}
          </span>
          <button className="small" onClick={() => setLast(null)}>
            ×
          </button>
        </div>
      )}

      <h2>Parcelles</h2>
      <div className="grid">
        {garden.plots.map((plot, i) => (
          <PlotCard key={plot.id} plot={plot} index={i} onHarvest={setLast} />
        ))}
        <div className="card locked-soft">
          <div className="title">Nouvelle parcelle</div>
          <div className="muted">Agrandissez le jardin pour faire pousser plus d'arbres en même temps.</div>
          <div className="actions">
            <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'plot' })}>
              Acheter (<Honey amount={plotOffer.cost.honey} />)
            </button>
          </div>
        </div>
      </div>

      <h2>Pousses</h2>
      {garden.saplings.length === 0 && <p className="muted">Aucune pousse. Les espèces de base s'achètent en boutique.</p>}
      <div className="grid">
        {garden.saplings.map((s) => {
          const tree = trees[s.genome.species[0]];
          return (
            <div key={s.id} className="card">
              <div className="bee-head">
                <TreeIcon color={tree.color} secondary={tree.secondary} />
                <div>
                  <div className="title">{treeName(content, s.genome)}</div>
                  <div className="muted">
                    Pousse{s.count > 1 && <b> ×{fmt(s.count)}</b>} · {tree.branch}
                  </div>
                </div>
              </div>
              <TreeGenome genome={s.genome} />
              <div className="actions">
                <button className="small" onClick={() => act('/garden/sell', { specimen_id: s.id, qty: 1 })}>
                  Vendre 1 (<Honey amount={sapling_sell} />)
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <h2>
        Papillons ({foundButterflies.size} / {Object.keys(butterflies).length})
      </h2>
      <div className="row">
        {Object.entries(butterflies).map(([id, b]) => {
          const mine = owned[id];
          return foundButterflies.has(id) ? (
            <div key={id} className="mini" title={`Attiré par : ${b.hosts.map(treeLabel).join(', ')}`}>
              <ButterflyIcon color={b.color} secondary={b.secondary} size={32} />
              {b.label}
              <span className="muted">×{mine?.count ?? 0}</span>
              {mine && (
                <button className="small" onClick={() => act('/garden/sell', { specimen_id: mine.id, qty: 1 })}>
                  Vendre (<Honey amount={b.sell} />)
                </button>
              )}
            </div>
          ) : (
            <div key={id} className="mini">
              <ButterflyIcon color="000000" secondary="000000" size={32} unknown />
              ???
            </div>
          );
        })}
      </div>

      <h2>
        Arbres connus ({foundTrees.size} / {Object.keys(trees).length})
      </h2>
      <div className="row">
        {Object.entries(trees).map(([id, t]) => (
          <div key={id} className="mini" title={foundTrees.has(id) ? t.products.map(([item]) => content.items[item]?.label).join(', ') : undefined}>
            <TreeIcon color={t.color} secondary={t.secondary} size={32} unknown={!foundTrees.has(id)} />
            {treeLabel(id)}
          </div>
        ))}
      </div>

      <h2>Croisements connus</h2>
      {knownMutations.length === 0 && <p className="muted">Découvrez deux espèces pouvant se croiser pour voir leur descendance ici.</p>}
      <div className="grid">
        {knownMutations.map((m, i) => (
          <div key={i} className="card">
            <div>
              {treeLabel(m.a)} + {treeLabel(m.b)} → <b>{treeLabel(m.result)}</b>
            </div>
            <div className="muted">{percent(m.chance)} de chance par pousse</div>
          </div>
        ))}
      </div>
    </>
  );
}
