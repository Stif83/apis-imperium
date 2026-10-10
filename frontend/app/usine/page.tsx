'use client';

import { HoldButton } from '@/components/HoldButton';
import { CostView, Honey, ItemIcon, ItemQty, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

const HOLD_SECONDS = 3;

export default function FactoryPage() {
  const { content, state, act } = useGame();
  const combs = Object.keys(content.recipes);
  const owned = combs.filter((c) => (state.inventory[c] ?? 0) > 0);
  const resources = Object.entries(state.inventory).filter(([id]) => content.items[id]?.category === 'resource');
  const centrifuges = state.machines.centrifuge ?? 0;
  const offer = state.offers['machine:centrifuge'];

  return (
    <>
      <h1>Usine</h1>
      <p className="muted">
        Centrifugez les rayons récoltés pour en tirer du miel et des ressources. À la main, maintenez le bouton {HOLD_SECONDS} secondes
        par rayon ; les centrifugeuses automatiques font le travail à votre place, même en votre absence.
      </p>

      <h2>Automatisation</h2>
      <div className="card">
        <div className="row between">
          <div>
            <div className="title">
              {content.machines.centrifuge.label} ×{centrifuges}
            </div>
            <div className="muted">
              {centrifuges > 0
                ? `Débit : ${centrifuges} rayon${centrifuges > 1 ? 's' : ''} par cycle (${state.cycle_seconds} s).`
                : content.machines.centrifuge.desc}
            </div>
          </div>
          <div className="row">
            <CostView cost={offer.cost} />
            <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'machine:centrifuge' })}>
              Acheter
            </button>
          </div>
        </div>
      </div>

      <h2>Rayons à traiter</h2>
      {owned.length === 0 && <p className="muted">Aucun rayon en stock. Récoltez vos ruches dans l'onglet Rucher.</p>}
      <div className="grid">
        {owned.map((comb) => (
          <div key={comb} className="card">
            <div className="row between">
              <span className="row title">
                <ItemIcon id={comb} size={26} />
                {content.items[comb].label}
              </span>
              <b>×{fmt(state.inventory[comb])}</b>
            </div>
            <div className="row muted">
              {content.recipes[comb].map(([out, chance, qty]) => (
                <span key={out} className="chip">
                  {out === 'honey' ? <Honey amount={qty} /> : <ItemQty id={out} qty={qty} />}
                  <span>{Math.round(chance * 100)} %</span>
                </span>
              ))}
            </div>
            <div className="actions">
              <HoldButton seconds={HOLD_SECONDS} onDone={() => act('/factory/process', { comb_id: comb, qty: 1 })}>
                Maintenir pour centrifuger
              </HoldButton>
            </div>
          </div>
        ))}
      </div>

      <h2>Ressources</h2>
      {resources.length === 0 && <p className="muted">Aucune ressource pour le moment.</p>}
      <div className="row">
        {resources.map(([id, qty]) => (
          <ItemQty key={id} id={id} qty={qty} />
        ))}
      </div>
    </>
  );
}
