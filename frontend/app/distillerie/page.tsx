'use client';

import { ActiveEffects } from '@/components/Effects';
import { CostView, ItemIcon, PageHead, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

export default function DistilleryPage() {
  const { content, state, act } = useGame();
  const owned = (state.machines.distillery ?? 0) > 0;
  const offer = state.offers['machine:distillery'];

  return (
    <>
      <PageHead guide="distillerie" title="Distillerie">
        Distillez les ressources de plusieurs branches en élixirs, puis buvez-les au bon moment : leur effet dure quelques dizaines de
        minutes, même hors ligne. Boire un élixir déjà en cours prolonge son effet.
      </PageHead>

      {!owned && (
        <div className="card machine-offer">
          <span className="world-globe" aria-hidden>
            ⚗️
          </span>
          <div className="grow">
            <div className="title">{content.machines.distillery.label}</div>
            <div className="muted">{offer.lock ?? content.machines.distillery.desc}</div>
          </div>
          <div className="factory-buy">
            <CostView cost={offer.cost} />
            <button className="primary" disabled={!!offer.lock} onClick={() => act('/shop/buy', { offer_id: 'machine:distillery' })}>
              Construire la distillerie
            </button>
          </div>
        </div>
      )}

      <ActiveEffects />

      <div className="elixir-grid">
        {Object.entries(content.late.elixirs).map(([id, elixir]) => {
          const stock = state.inventory[id] ?? 0;
          return (
            <div key={id} className="card elixir-card">
              <div className="row" style={{ gap: 10 }}>
                <ItemIcon id={id} size={36} />
                <span className="grow">
                  <span className="title">{content.items[id].label}</span>
                  <span className="muted elixir-desc">{elixir.desc}</span>
                </span>
                {stock > 0 && <span className="badge ok">×{fmt(stock)}</span>}
              </div>
              <CostView cost={elixir.cost} />
              <div className="row" style={{ gap: 6 }}>
                <button className="primary compact" disabled={!owned} onClick={() => act('/distillery/brew', { elixir_id: id, qty: 1 })}>
                  Distiller
                </button>
                <button className="compact" disabled={stock < 1} onClick={() => act('/distillery/drink', { elixir_id: id })}>
                  Boire
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
