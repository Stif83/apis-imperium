'use client';

import { DistilleryArt } from '@/components/DistilleryArt';
import { ActiveEffects } from '@/components/Effects';
import { CostView, ItemIcon, PageHead } from '@/components/ui';
import { SHORT, canAfford, fmt } from '@/lib/format';
import { useGame } from '@/lib/game';
import type { Elixir } from '@/lib/types';

/** Durée affichée sur la carte d'un élixir. */
function duration(elixir: Elixir) {
  if (elixir.instant) return 'Immédiat';
  return elixir.minutes % 60 ? `${elixir.minutes} min` : `${elixir.minutes / 60} h`;
}

export default function DistilleryPage() {
  const { content, state, act } = useGame();
  const owned = (state.machines.distillery ?? 0) > 0;
  const offer = state.offers['machine:distillery'];
  const elixirs = Object.entries(content.late.elixirs);
  const left = (id: string) => Math.max(0, (state.effects?.[id] ?? 0) - state.server_time);
  // L'alambic prend la couleur de l'élixir en cours ; l'étagère montre une fiole par sorte en réserve
  const running = elixirs.find(([id]) => left(id) > 0)?.[0];
  const liquid = running ? content.items[running].color : 'ffb300';
  const shelf = elixirs.filter(([id]) => (state.inventory[id] ?? 0) > 0).map(([id]) => content.items[id].color);

  return (
    <>
      <PageHead guide="distillerie" title="Distillerie">
        Distillez les ressources de plusieurs branches en élixirs, puis buvez-les au bon moment : leur effet dure de une à deux heures,
        même hors ligne, et boire un élixir déjà en cours le prolonge. Le Sablier liquide, lui, agit tout de suite.
      </PageHead>

      <div className="card distillery-hero">
        <DistilleryArt built={owned} liquid={liquid} shelf={shelf} />
        {!owned && (
          <div className="machine-offer">
            <div className="grow">
              <div className="title">{content.machines.distillery.label}</div>
              <div className="muted">{offer.lock ?? content.machines.distillery.desc}</div>
            </div>
            <div className="factory-buy">
              <CostView cost={offer.cost} />
              <button
                className="primary"
                disabled={!!offer.lock || !canAfford(state, offer.cost)}
                title={offer.lock ?? (canAfford(state, offer.cost) ? undefined : SHORT)}
                onClick={() => act('/shop/buy', { offer_id: 'machine:distillery' })}
              >
                Construire la distillerie
              </button>
            </div>
          </div>
        )}
      </div>

      <ActiveEffects />

      <div className="elixir-grid">
        {elixirs.map(([id, elixir]) => {
          const stock = state.inventory[id] ?? 0;
          const remaining = left(id);
          const brew = (qty: number) => (
            <button
              className={qty === 1 ? 'primary compact' : 'compact'}
              disabled={!owned || !canAfford(state, elixir.cost, qty)}
              title={!owned ? 'Construisez d’abord la distillerie' : canAfford(state, elixir.cost, qty) ? undefined : SHORT}
              onClick={() => act('/distillery/brew', { elixir_id: id, qty })}
            >
              Distiller{qty > 1 ? ` ×${qty}` : ''}
            </button>
          );
          return (
            <div key={id} className={`card elixir-card${remaining ? ' brewing' : ''}`}>
              <div className="row" style={{ gap: 10 }}>
                <ItemIcon id={id} size={40} />
                <span className="grow">
                  <span className="title">{content.items[id].label}</span>
                  <span className="muted elixir-desc">{elixir.desc}</span>
                </span>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <span className="chip">{elixir.instant ? '⚡' : '⏱️'} {duration(elixir)}</span>
                {remaining > 0 && <span className="chip ok">En cours · {Math.ceil(remaining / 60000)} min</span>}
                {stock > 0 && <span className="badge ok">×{fmt(stock)} en réserve</span>}
              </div>
              <CostView cost={elixir.cost} />
              <div className="row" style={{ gap: 6 }}>
                {brew(1)}
                {brew(5)}
                <button className="compact" disabled={stock < 1} onClick={() => act('/distillery/drink', { elixir_id: id })}>
                  {elixir.instant ? 'Retourner' : remaining ? 'Prolonger' : 'Boire'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
