'use client';

import { useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { ItemQty, PageHead, Traits } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Content } from '@/lib/types';

type Mutation = Content['mutations'][number];

const NODE_W = 66;
const NODE_H = 86;
const ICON = 32;

const percent = (chance: number) => `${(chance * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** Rang d'une espèce : 0 pour les espèces de base, sinon 1 + le rang de son parent le plus avancé. */
function computeTiers(content: Content): Record<string, number> {
  const tiers: Record<string, number> = {};
  const results = new Set(content.mutations.map((m) => m.result));
  for (const id of Object.keys(content.species)) if (!results.has(id)) tiers[id] = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of content.mutations) {
      if (tiers[m.a] === undefined || tiers[m.b] === undefined) continue;
      const tier = 1 + Math.max(tiers[m.a], tiers[m.b]);
      if (tiers[m.result] === undefined || tier < tiers[m.result]) {
        tiers[m.result] = tier;
        changed = true;
      }
    }
  }
  for (const id of Object.keys(content.species)) tiers[id] ??= 0;
  return tiers;
}

function layout(ids: string[], mutations: Mutation[], tiers: Record<string, number>) {
  const shown = new Set(ids);
  const levels = [...new Set(ids.map((id) => tiers[id]))].sort((a, b) => a - b);
  const rows = levels.map((level) => ids.filter((id) => tiers[id] === level));
  const widest = Math.max(1, ...rows.map((row) => row.length));
  const pos: Record<string, { x: number; y: number }> = {};
  rows.forEach((row, r) => {
    if (r > 0) {
      // Chaque espèce se place sous ses parents pour limiter les croisements
      const anchor = (id: string) => {
        const xs = mutations
          .filter((m) => m.result === id)
          .flatMap((m) => [m.a, m.b])
          .filter((parent) => pos[parent])
          .map((parent) => pos[parent].x);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      };
      const anchors = Object.fromEntries(row.map((id) => [id, anchor(id)]));
      row.sort((a, b) => anchors[a] - anchors[b]);
    }
    const left = ((widest - row.length) * NODE_W) / 2;
    row.forEach((id, i) => {
      pos[id] = { x: left + (i + 0.5) * NODE_W, y: r * NODE_H + 8 };
    });
  });
  const edges = mutations
    .filter((m) => shown.has(m.result))
    .flatMap((m) => [m.a, m.b].filter((parent) => shown.has(parent)).map((parent) => ({ from: parent, to: m.result })));
  return { pos, edges, width: widest * NODE_W, height: rows.length * NODE_H };
}

type Branch = { name: string; ids: string[]; tier: number; color: string; secondary: string; parents: string[] };

/** Branches dans l'ordre de progression : palier médian de leurs espèces, puis ordre du contenu. */
function computeBranches(content: Content, tiers: Record<string, number>): Branch[] {
  const map = new Map<string, Branch>();
  for (const [id, s] of Object.entries(content.species)) {
    let b = map.get(s.branch);
    if (!b) {
      b = { name: s.branch, ids: [], tier: 0, color: s.color, secondary: s.secondary, parents: [] };
      map.set(s.branch, b);
    }
    b.ids.push(id);
  }
  for (const b of map.values()) {
    // La médiane évite qu'une seule espèce vendue en boutique tire toute la branche vers le début
    const sorted = b.ids.map((id) => tiers[id]).sort((x, y) => x - y);
    b.tier = sorted[Math.floor((sorted.length - 1) / 2)];
    const parents = new Set<string>();
    for (const m of content.mutations) {
      if (!b.ids.includes(m.result)) continue;
      for (const p of [m.a, m.b]) {
        const pb = content.species[p].branch;
        if (pb !== b.name) parents.add(pb);
      }
    }
    b.parents = [...parents];
  }
  return [...map.values()].sort((a, b) => a.tier - b.tier);
}

const TIER_NAMES = ['Premiers pas', 'Premières mutations', 'Élevage confirmé', 'Lignées avancées', 'Raretés', 'Légendes'];
// Paliers regroupés en six étapes pour ne pas multiplier les sections
const band = (t: number) => (t <= 1 ? 0 : t <= 3 ? 1 : t <= 4 ? 2 : t <= 6 ? 3 : t <= 8 ? 4 : 5);

const FILTERS = [
  ['all', 'Toutes'],
  ['progress', 'À compléter'],
  ['done', 'Complètes'],
] as const;

export default function ApidexPage() {
  const { content, state } = useGame();
  const [view, setView] = useState<'branches' | 'tree'>('branches');
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const [partial, setPartial] = useState(false);

  const known = useMemo(() => new Set(state.discovered), [state.discovered]);
  const tiers = useMemo(() => computeTiers(content), [content]);
  const branches = useMemo(() => computeBranches(content, tiers), [content, tiers]);
  const allIds = Object.keys(content.species);
  // Une espèce inconnue reste anonyme partout : ni nom, ni couleurs
  const name = (id: string) => (known.has(id) ? content.species[id].label : '???');

  const parentsOf = (id: string) => content.mutations.filter((m) => m.result === id);
  const childrenOf = (id: string) => content.mutations.filter((m) => m.a === id || m.b === id);

  const open = (id: string) => {
    setSelected(id);
    setSheet(true);
  };

  const visible = useMemo(() => {
    if (!partial || !selected) return allIds;
    const keep = new Set<string>([selected]);
    const climb = (id: string) => {
      for (const m of content.mutations.filter((x) => x.result === id)) {
        for (const parent of [m.a, m.b]) {
          if (!keep.has(parent)) {
            keep.add(parent);
            climb(parent);
          }
        }
      }
    };
    climb(selected);
    for (const m of content.mutations.filter((x) => x.a === selected || x.b === selected)) {
      keep.add(m.result);
      keep.add(m.a);
      keep.add(m.b);
    }
    return allIds.filter((id) => keep.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partial, selected, content]);

  const tree = useMemo(() => layout([...visible], content.mutations, tiers), [visible, content, tiers]);

  const linked = new Set<string>();
  if (selected) {
    for (const m of parentsOf(selected)) linked.add(m.a).add(m.b);
    for (const m of childrenOf(selected)) linked.add(m.result).add(m.a).add(m.b);
  }

  const Mini = ({ id }: { id: string }) => {
    const species = content.species[id];
    return (
      <button className="mini" onClick={() => open(id)}>
        <BeeIcon species={id} color={species.color} secondary={species.secondary} type="queen" size={28} unknown={!known.has(id)} />
        {name(id)}
      </button>
    );
  };

  const Family = ({ m }: { m: Mutation }) => (
    <div className="family">
      <Mini id={m.a} />
      <span className="op">+</span>
      <Mini id={m.b} />
      <span className="op">→</span>
      <Mini id={m.result} />
      <span className="muted">{percent(m.chance)}</span>
      {m.cond_text && <span className="cond">{m.cond_text}</span>}
    </div>
  );

  const shown = branches.filter((b) => {
    const n = b.ids.filter((id) => known.has(id)).length;
    if (filter === 'done') return n === b.ids.length;
    if (filter === 'progress') return n < b.ids.length;
    return true;
  });
  const bands = [...new Set(shown.map((b) => band(b.tier)))].sort((a, b) => a - b);
  const complete = branches.filter((b) => b.ids.every((id) => known.has(id))).length;
  const species = selected ? content.species[selected] : null;

  return (
    <>
      <PageHead
        title="Apidex"
        extra={
          <span className="row">
            <span className="badge ok">
              {known.size} / {allIds.length} espèces
            </span>
            <span className="badge">
              {complete} / {branches.length} branches
            </span>
          </span>
        }
      >
        Toutes les espèces, rangées par branche, de la plus accessible à la plus rare. Les espèces encore inconnues restent anonymes.
        Cliquez sur une abeille pour voir comment l'obtenir et ce qu'elle peut donner. Certaines mutations demandent une condition
        (heure, météo, biome…) : elle doit être réunie au moment où la reine meurt.
      </PageHead>

      <div className="row tabs">
        <button className={`tab${view === 'branches' ? ' active' : ''}`} onClick={() => setView('branches')}>
          Branches
        </button>
        <button className={`tab${view === 'tree' ? ' active' : ''}`} onClick={() => setView('tree')}>
          Arbre des mutations
        </button>
        {view === 'branches' && (
          <span className="row" style={{ marginLeft: 'auto' }} role="radiogroup" aria-label="Filtre">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={filter === id}
                className={`chip pick${filter === id ? ' selected' : ''}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </span>
        )}
      </div>

      {view === 'branches' && (
        <>
          {shown.length === 0 && <p className="muted">Aucune branche ici pour l'instant.</p>}
          {bands.map((t) => (
            <section key={t}>
              <h2 className="tier-head">{TIER_NAMES[t]}</h2>
              <div className="branch-grid">
                {shown
                  .filter((b) => band(b.tier) === t)
                  .map((b) => {
                    const n = b.ids.filter((id) => known.has(id)).length;
                    return (
                      <div key={b.name} className={`branch-card${n === b.ids.length ? ' complete' : ''}`}>
                        <div
                          className="branch-band"
                          style={{ background: n > 0 ? `linear-gradient(90deg, #${b.color}, #${b.secondary})` : 'var(--border)' }}
                        />
                        <div className="row between">
                          <span className="title">{b.name}</span>
                          {n === b.ids.length ? (
                            <span className="stamp">Complète</span>
                          ) : (
                            <span className="badge">
                              {n} / {b.ids.length}
                            </span>
                          )}
                        </div>
                        <div className="bar">
                          <div style={{ width: `${(100 * n) / b.ids.length}%` }} />
                        </div>
                        <div className="branch-bees">
                          {b.ids.map((id) => {
                            const s = content.species[id];
                            return (
                              <button key={id} className={`branch-bee${known.has(id) ? '' : ' unknown'}`} title={name(id)} onClick={() => open(id)}>
                                <BeeIcon species={id} color={s.color} secondary={s.secondary} type="queen" size={44} unknown={!known.has(id)} />
                                <span>{name(id)}</span>
                              </button>
                            );
                          })}
                        </div>
                        {b.parents.length > 0 && (
                          <div className="muted branch-from">
                            Issue de :
                            {b.parents.map((p) => (
                              <span key={p} className="trait">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </>
      )}

      {view === 'tree' && (
        <>
          <div className="row" style={{ marginBottom: 8 }}>
            <button className={partial ? '' : 'primary compact'} onClick={() => setPartial(false)}>
              Arbre complet
            </button>
            <button className={partial ? 'primary compact' : ''} disabled={!selected} onClick={() => setPartial(true)}>
              Lignée de l'abeille choisie
            </button>
            <span className="legend muted">
              <i style={{ background: 'var(--info)' }} /> parents
            </span>
            <span className="legend muted">
              <i style={{ background: 'var(--accent)' }} /> mutations futures
            </span>
          </div>
          <div className="tree-scroll">
            <svg width={tree.width} height={tree.height} style={{ display: 'block', margin: '0 auto' }}>
              {tree.edges.map((edge, i) => {
                const a = tree.pos[edge.from];
                const b = tree.pos[edge.to];
                const kind = edge.to === selected ? 'parent' : edge.from === selected ? 'child' : selected ? 'dim' : '';
                const y1 = a.y + ICON + 16;
                const y2 = b.y - 2;
                const mid = (y1 + y2) / 2;
                return <path key={i} className={`tree-edge ${kind}`} d={`M${a.x},${y1} C${a.x},${mid} ${b.x},${mid} ${b.x},${y2}`} />;
              })}
              {visible.map((id) => {
                const { x, y } = tree.pos[id];
                const s = content.species[id];
                const mark = id === selected ? 'selected' : linked.has(id) ? 'linked' : selected ? 'dim' : '';
                const label = name(id);
                return (
                  <g key={id} className={`tree-node ${mark}`} onClick={() => (id === selected ? setSelected(null) : open(id))}>
                    <title>{label}</title>
                    <rect className="halo" x={x - NODE_W / 2 + 2} y={y - 2} width={NODE_W - 4} height={ICON + 18} rx={6} />
                    <BeeIcon species={id} color={s.color} secondary={s.secondary} type="queen" size={ICON} x={x - ICON / 2} y={y} unknown={!known.has(id)} />
                    <text x={x} y={y + ICON + 10}>
                      {label.length > 11 ? `${label.slice(0, 10)}…` : label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </>
      )}

      {sheet && selected && species && (
        <div className="overlay" onClick={() => setSheet(false)}>
          <div className="sheet wide" role="dialog" aria-label={name(selected)} onClick={(e) => e.stopPropagation()}>
            <div className="row between">
              <div className="bee-head">
                <BeeIcon species={selected} color={species.color} secondary={species.secondary} type="queen" size={72} unknown={!known.has(selected)} />
                <div>
                  <div style={{ font: '600 24px/1.2 var(--display)' }}>{name(selected)}</div>
                  <div className="muted">
                    {known.has(selected) ? `${species.branch} · climat ${content.temp_labels[species.temp]}` : 'Espèce encore inconnue'}
                  </div>
                </div>
              </div>
              <button className="help-btn" aria-label="Fermer" onClick={() => setSheet(false)}>
                ×
              </button>
            </div>
            {known.has(selected) && (
              <div className="row">
                <Traits genome={Object.fromEntries(Object.entries(species.template).map(([c, a]) => [c, [a, a]]))} />
                {species.products.map(([item, chance]) => (
                  <span key={item} className="row muted" style={{ gap: 4 }}>
                    <ItemQty id={item} /> {percent(chance)}
                  </span>
                ))}
              </div>
            )}

            <div className="title">Comment l'obtenir</div>
            {parentsOf(selected).length === 0 && <div className="muted">Espèce de base : elle s'achète en boutique.</div>}
            {parentsOf(selected).map((m, i) => (
              <Family key={i} m={m} />
            ))}

            <div className="title">Ce qu'elle peut donner</div>
            {childrenOf(selected).length === 0 && <div className="muted">Rien : cette espèce est au bout de sa lignée.</div>}
            {childrenOf(selected).map((m, i) => (
              <Family key={i} m={m} />
            ))}

            <div>
              <button
                className="small"
                onClick={() => {
                  setView('tree');
                  setPartial(true);
                  setSheet(false);
                }}
              >
                Voir sa lignée dans l'arbre
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
