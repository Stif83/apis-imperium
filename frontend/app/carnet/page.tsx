'use client';

import { Honey, ItemQty, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Objective } from '@/lib/types';

const SECTIONS: { kind: Objective['kind']; title: string }[] = [
  { kind: 'species', title: 'Collection d\'abeilles' },
  { kind: 'branch', title: 'Branches complètes' },
  { kind: 'hives', title: 'Rucher' },
  { kind: 'genes', title: 'Génétique' },
  { kind: 'trees', title: 'Jardin' },
  { kind: 'butterflies', title: 'Papillons' },
];

export default function CarnetPage() {
  const { content, state, act } = useGame();
  const progress = (o: Objective) => state.objectives[o.id] ?? { progress: 0, claimed: false };
  const ready = content.objectives.filter((o) => !progress(o).claimed && progress(o).progress >= o.target);
  const claimed = content.objectives.filter((o) => progress(o).claimed).length;

  const Card = ({ o }: { o: Objective }) => {
    const p = progress(o);
    const done = p.progress >= o.target;
    return (
      <div className="card">
        <div className="row between">
          <span className="title">{o.label}</span>
          {p.claimed && <span className="badge ok">Reçu</span>}
        </div>
        <div className="bar" title={`${fmt(Math.min(p.progress, o.target))} / ${fmt(o.target)}`}>
          <div style={{ width: `${(100 * Math.min(p.progress, o.target)) / o.target}%` }} />
        </div>
        <div className="row between">
          <span className="muted">
            {fmt(Math.min(p.progress, o.target))} / {fmt(o.target)}
          </span>
          <span className="row">
            <Honey amount={o.reward.honey} />
            {Object.entries(o.reward.items).map(([item, n]) => (
              <ItemQty key={item} id={item} qty={n} />
            ))}
          </span>
        </div>
        {done && !p.claimed && (
          <button className="primary" onClick={() => act('/objectives/claim', { objective_id: o.id })}>
            Recevoir la récompense
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <h1>Carnet de l'apiculteur</h1>
      <p className="muted">
        {claimed} objectifs accomplis sur {content.objectives.length}. Chaque palier de découverte et chaque branche complétée
        rapporte du miel et du matériel.
      </p>
      {ready.length > 0 && (
        <>
          <h2>À réclamer</h2>
          <div className="grid">
            {ready.map((o) => (
              <Card key={o.id} o={o} />
            ))}
          </div>
        </>
      )}
      {SECTIONS.map(({ kind, title }) => {
        // Les objectifs réclamés passent en fin de liste, les plus proches d'être atteints en tête
        const list = content.objectives
          .filter((o) => o.kind === kind && !ready.includes(o))
          .sort((a, b) => Number(progress(a).claimed) - Number(progress(b).claimed) || progress(b).progress / b.target - progress(a).progress / a.target);
        if (!list.length) return null;
        return (
          <section key={kind}>
            <h2>{title}</h2>
            <div className="grid">
              {list.map((o) => (
                <Card key={o.id} o={o} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
