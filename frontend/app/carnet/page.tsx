'use client';

import { useState } from 'react';
import { METAL_LABELS, Medal } from '@/components/Badges';
import { Honey, ItemQty, PageHead, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import { claimableTrophies, reachedTiers } from '@/lib/trophies';
import type { Cost, Trophy } from '@/lib/types';

/** Somme des récompenses de plusieurs paliers. */
function sumRewards(tiers: Trophy['tiers']): Cost {
  const items: Record<string, number> = {};
  let honey = 0;
  for (const t of tiers) {
    honey += t.reward.honey;
    for (const [item, n] of Object.entries(t.reward.items)) items[item] = (items[item] ?? 0) + n;
  }
  return { honey, items };
}

function Reward({ cost }: { cost: Cost }) {
  return (
    <span className="row" style={{ gap: 4 }}>
      {cost.honey > 0 && <Honey amount={cost.honey} />}
      {Object.entries(cost.items).map(([item, n]) => (
        <ItemQty key={item} id={item} qty={n} />
      ))}
    </span>
  );
}

export default function CarnetPage() {
  const { content, state, act } = useGame();
  const [filter, setFilter] = useState<string>('all');
  const list = content.trophies.list;
  const progress = (t: Trophy) => state.trophies?.[t.id] ?? { progress: 0, claimed: 0 };
  const ready = claimableTrophies(content, state);
  const tiersTotal = list.reduce((n, t) => n + t.tiers.length, 0);
  const tiersClaimed = list.reduce((n, t) => n + Math.min(progress(t).claimed, t.tiers.length), 0);
  const byMetal = (metal: string) =>
    list.reduce((n, t) => n + t.tiers.slice(0, progress(t).claimed).filter((tier) => tier.metal === metal).length, 0);
  const pedigree = Object.values(state.pedigree ?? {});

  const Card = ({ t }: { t: Trophy }) => {
    const p = progress(t);
    const reached = reachedTiers(t, p.progress);
    const hidden = t.secret && reached === 0;
    const next = t.tiers[Math.min(p.claimed, t.tiers.length - 1)];
    const best = p.claimed > 0 ? t.tiers[p.claimed - 1] : null;
    const complete = p.claimed >= t.tiers.length;
    const pending = reached > p.claimed;
    // Barre : progression vers le prochain palier non réclamé
    const target = t.tiers[Math.min(reached, t.tiers.length - 1)];
    return (
      <div className={`card trophy-card${complete ? ' complete' : ''}${pending ? ' pending' : ''}`}>
        <div className="trophy-head">
          {best ? (
            <Medal badge={{ id: `${t.id}-${best.metal}`, kind: 'achievement', label: t.label, icon: t.icon, metal: best.metal, desc: t.desc }} size={42} />
          ) : (
            <span className="trophy-empty">{hidden ? '❔' : t.icon}</span>
          )}
          <div className="grow">
            <div className="title">{hidden ? 'Trophée secret' : t.label}</div>
            <div className="muted">{hidden ? 'À vous de le trouver…' : t.desc}</div>
          </div>
        </div>
        {!hidden && (
          <>
            <div className="tier-pips" aria-label={`${p.claimed} palier(s) sur ${t.tiers.length}`}>
              {t.tiers.map((tier, i) => (
                <span
                  key={i}
                  className={`tier-pip ${tier.metal}${i < p.claimed ? ' got' : i < reached ? ' ready' : ''}`}
                  title={`${METAL_LABELS[tier.metal]} : ${fmt(tier.need)}`}
                />
              ))}
              {best && <span className="muted tier-label">{METAL_LABELS[best.metal]}</span>}
            </div>
            {!complete && !pending && (
              <>
                <div className="bar">
                  <div style={{ width: `${Math.min(100, (100 * p.progress) / target.need)}%` }} />
                </div>
                <div className="row between">
                  <span className="muted">
                    {fmt(Math.min(p.progress, target.need))} / {fmt(target.need)}
                  </span>
                  <Reward cost={next.reward} />
                </div>
              </>
            )}
          </>
        )}
        {pending && (
          <div className="row between">
            <Reward cost={sumRewards(t.tiers.slice(p.claimed, reached))} />
            <button className="primary compact" onClick={() => act('/trophies/claim', { trophy_id: t.id })}>
              Recevoir
            </button>
          </div>
        )}
        {complete && <span className="stamp">Complet</span>}
      </div>
    );
  };

  const categories = Object.entries(content.trophies.categories);
  const shown = filter === 'all' ? categories : categories.filter(([id]) => id === filter);

  return (
    <>
      <PageHead
        guide="trophees"
        title="Carnet de l'apiculteur"
        extra={
          <span className="row">
            <span className="badge ok">
              {tiersClaimed} / {tiersTotal} paliers
            </span>
          </span>
        }
      >
        Chaque trophée a jusqu'à quatre paliers : bronze, argent, or et diamant. Chaque palier atteint se réclame ici et rapporte du miel,
        parfois du matériel. Vos meilleurs trophées s'affichent sur vos vitrines.
      </PageHead>

      <div className="carnet-top">
        <div className="card stack">
          <span className="rank-chip big">👑 {state.badges.rank?.label ?? 'Pas encore de rang'}</span>
          {state.badges.next_rank && (
            <>
              <span className="muted">
                Prochain rang : <b>{state.badges.next_rank.label}</b> à {state.badges.next_rank.need} espèces ({state.badges.species} /{' '}
                {state.badges.next_rank.need})
              </span>
              <div className="bar">
                <div style={{ width: `${(100 * state.badges.species) / state.badges.next_rank.need}%` }} />
              </div>
            </>
          )}
          <div className="row">
            {(['diamond', 'gold', 'silver', 'bronze'] as const).map((m) => (
              <span key={m} className="metal-count">
                <span className={`tier-pip ${m} got`} /> {byMetal(m)} {METAL_LABELS[m]}
              </span>
            ))}
          </div>
        </div>
        <div className="card stack">
          <div className="title">Pedigree</div>
          <div className="row">
            {Object.entries(content.trophies.pedigree).map(([level, p]) => (
              <span key={level} className="chip" title={p.desc}>
                {p.icon} {p.label} · {pedigree.filter((l) => l >= Number(level)).length}
              </span>
            ))}
          </div>
          <span className="muted">
            Faites certifier vos abeilles depuis la réserve du Rucher : le meilleur niveau obtenu reste acquis pour l'espèce. Survolez un
            niveau pour voir ce qu'il exige.
          </span>
        </div>
      </div>

      {ready.length > 0 && (
        <>
          <h2>À réclamer · {ready.length}</h2>
          <div className="trophy-grid">
            {ready.map((t) => (
              <Card key={t.id} t={t} />
            ))}
          </div>
        </>
      )}

      <div className="row tabs" role="radiogroup" aria-label="Catégorie">
        <button className={`chip pick${filter === 'all' ? ' selected' : ''}`} onClick={() => setFilter('all')}>
          Toutes
        </button>
        {categories.map(([id, label]) => (
          <button key={id} className={`chip pick${filter === id ? ' selected' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>

      {shown.map(([id, label]) => {
        const members = list.filter((t) => t.category === id && !ready.includes(t));
        if (!members.length) return null;
        const found = members.filter((t) => !t.secret || progress(t).progress > 0).length;
        return (
          <section key={id}>
            <h2>
              {label}
              {id === 'secret' && (
                <span className="muted" style={{ fontSize: 15 }}>
                  {' '}
                  · {found} / {members.length} trouvés
                </span>
              )}
            </h2>
            <div className="trophy-grid">
              {members.map((t) => (
                <Card key={t.id} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
}
