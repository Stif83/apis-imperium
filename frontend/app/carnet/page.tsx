'use client';

import { METAL_LABELS, Medal } from '@/components/Badges';
import { Honey, ItemQty, PageHead, fmt } from '@/components/ui';
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
          {p.claimed && <span className="stamp">Accompli</span>}
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
      <PageHead title="Carnet de l'apiculteur" extra={<span className="badge ok">{claimed} / {content.objectives.length} accomplis</span>}>
        Chaque palier de découverte et chaque branche complétée rapporte du miel et du matériel. Une pastille rouge sur l'onglet
        signale une récompense à réclamer.
      </PageHead>
      <h2>Mes badges</h2>
      <div className="card badges-card">
        <div className="row between">
          <span className="rank-chip big">👑 {state.badges.rank?.label ?? 'Pas encore de rang'}</span>
          {state.badges.next_rank && (
            <span className="muted">
              Prochain rang : <b>{state.badges.next_rank.label}</b> à {state.badges.next_rank.need} espèces ({state.badges.species} /{' '}
              {state.badges.next_rank.need})
            </span>
          )}
        </div>
        {state.badges.next_rank && (
          <div className="bar">
            <div style={{ width: `${(100 * state.badges.species) / state.badges.next_rank.need}%` }} />
          </div>
        )}
        {state.badges.badges.length === 0 ? (
          <span className="muted">
            Réclamez des objectifs et complétez des branches de l'Apidex pour gagner des médailles. Elles s'affichent sur vos vitrines.
          </span>
        ) : (
          <div className="medals">
            {state.badges.badges.map((b) => (
              <div key={b.id} className="medal">
                <Medal badge={b} size={40} />
                <span>{b.label}</span>
                {b.metal && <small className="muted">{METAL_LABELS[b.metal]}</small>}
              </div>
            ))}
          </div>
        )}
      </div>

      <h2>
        Succès · {Object.keys(state.achievements).length} / {content.achievements.length}
      </h2>
      <div className="grid achievements">
        {content.achievements.map((a) => {
          const got = state.achievements[a.id];
          const hidden = a.secret && !got;
          return (
            <div key={a.id} className={`card achievement${got ? ' got' : ''}`} title={hidden ? 'Succès secret : à vous de le trouver' : a.desc}>
              <span className="achievement-icon">{hidden ? '❔' : a.icon}</span>
              <div className="grow">
                <div className="title">{hidden ? 'Succès secret' : a.label}</div>
                <div className="muted">{hidden ? '???' : a.desc}</div>
              </div>
              {got ? <span className="stamp">Obtenu</span> : <span className="muted small-honey">{hidden ? '?' : `+${a.honey}`}</span>}
            </div>
          );
        })}
      </div>

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
