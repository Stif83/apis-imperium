'use client';

import { useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { ItemQty, alleleLabel } from '@/components/ui';
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

export default function ApidexPage() {
  const { content, state } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);

  const known = useMemo(() => new Set(state.discovered), [state.discovered]);
  const tiers = useMemo(() => computeTiers(content), [content]);
  const allIds = Object.keys(content.species);
  // Une espèce inconnue reste anonyme partout : ni nom, ni branche, ni couleurs
  const name = (id: string) => (known.has(id) ? content.species[id].label : '???');

  const parentsOf = (id: string) => content.mutations.filter((m) => m.result === id);
  const childrenOf = (id: string) => content.mutations.filter((m) => m.a === id || m.b === id);

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
      <button className="mini" onClick={() => setSelected(id)}>
        <BeeIcon color={species.color} secondary={species.secondary} type="queen" size={28} unknown={!known.has(id)} />
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
      <span className="muted">
        {percent(m.chance)}
        {m.cond_text && ` · ${m.cond_text}`}
      </span>
    </div>
  );

  const species = selected ? content.species[selected] : null;

  return (
    <>
      <h1>Apidex</h1>
      <p className="muted">
        {known.size} espèces découvertes sur {allIds.length}. Les espèces encore inconnues restent anonymes.
      </p>

      <h2>Arbre des mutations</h2>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className={partial ? '' : 'primary'} onClick={() => setPartial(false)}>
          Arbre complet
        </button>
        <button className={partial ? 'primary' : ''} disabled={!selected} onClick={() => setPartial(true)}>
          Lignée de l'abeille choisie
        </button>
        <span className="legend muted">
          <i style={{ background: '#5bb8e8' }} /> parents
        </span>
        <span className="legend muted">
          <i style={{ background: 'var(--accent)' }} /> mutations futures
        </span>
        {!selected && <span className="muted">Cliquez sur une abeille pour voir ses parents et ses mutations.</span>}
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
              <g key={id} className={`tree-node ${mark}`} onClick={() => setSelected(id === selected ? null : id)}>
                <title>{label}</title>
                <rect className="halo" x={x - NODE_W / 2 + 2} y={y - 2} width={NODE_W - 4} height={ICON + 18} rx={6} />
                <BeeIcon color={s.color} secondary={s.secondary} type="queen" size={ICON} x={x - ICON / 2} y={y} unknown={!known.has(id)} />
                <text x={x} y={y + ICON + 10}>
                  {label.length > 11 ? `${label.slice(0, 10)}…` : label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {selected && species && (
        <>
          <h2>{name(selected)}</h2>
          <div className="card">
            {known.has(selected) ? (
              <>
                <div className="bee-head">
                  <BeeIcon color={species.color} secondary={species.secondary} type="queen" />
                  <div>
                    <div className="title">{species.label}</div>
                    <div className="muted">
                      {species.branch} · climat {content.temp_labels[species.temp]}
                    </div>
                  </div>
                </div>
                <div className="row">
                  {species.products.map(([item, chance]) => (
                    <span key={item} className="row muted">
                      <ItemQty id={item} /> {percent(chance)}
                    </span>
                  ))}
                </div>
                <div className="muted">
                  {['speed', 'lifespan', 'fertility', 'tolerance', 'activity', 'weatherproof', 'stability']
                    .map((c) => `${content.chromosomes[c]} : ${alleleLabel(content, c, species.template[c])}`)
                    .join(' · ')}
                </div>
              </>
            ) : (
              <div className="muted">Espèce encore inconnue. Découvrez-la pour connaître ses caractéristiques.</div>
            )}

            <div className="title">Parents</div>
            {parentsOf(selected).length === 0 && (
              <div className="muted">Espèce de base : elle ne s'obtient pas par mutation, mais en boutique.</div>
            )}
            {parentsOf(selected).map((m, i) => (
              <Family key={i} m={m} />
            ))}

            <div className="title">Mutations futures</div>
            {childrenOf(selected).length === 0 && <div className="muted">Aucune : cette espèce est au bout de sa lignée.</div>}
            {childrenOf(selected).map((m, i) => (
              <Family key={i} m={m} />
            ))}
          </div>
        </>
      )}

      <h2>Espèces</h2>
      <div className="row">
        {allIds.map((id) => (
          <Mini key={id} id={id} />
        ))}
      </div>
    </>
  );
}
