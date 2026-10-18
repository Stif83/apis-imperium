'use client';

import { HoldButton } from '@/components/HoldButton';
import { CostView, Honey, ItemIcon, PageHead, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

const HOLD_SECONDS = 3;

/** Centrifugeuse dessinée ; le tambour tourne quand elle a du travail. */
function Centrifuge({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 80 80" width={84} height={84} aria-hidden>
      <rect x="10" y="62" width="60" height="12" rx="4" fill="#8a5a2b" />
      <rect x="14" y="14" width="52" height="50" rx="14" fill="#cfd8dc" stroke="#0002" strokeWidth="2" />
      <g className={spinning ? 'spin' : ''} style={{ transformOrigin: '40px 39px' }}>
        <circle cx="40" cy="39" r="17" fill="#ffd75a" stroke="#d48f00" strokeWidth="3" />
        <path d="M40 22v34M23 39h34M28 27l24 24M52 27L28 51" stroke="#d48f00" strokeWidth="3" />
      </g>
      <circle cx="40" cy="39" r="4" fill="#8a5a2b" />
    </svg>
  );
}

export default function FactoryPage() {
  const { content, state, act } = useGame();
  const combs = Object.keys(content.recipes);
  const owned = combs.filter((c) => (state.inventory[c] ?? 0) > 0);
  const resources = Object.entries(state.inventory).filter(([id]) => content.items[id]?.category === 'resource');
  const centrifuges = state.machines.centrifuge ?? 0;
  const offer = state.offers['machine:centrifuge'];

  return (
    <>
      <PageHead title="Usine">
        Centrifugez les rayons récoltés pour en tirer du miel et des ressources. À la main, maintenez le bouton {HOLD_SECONDS} secondes
        par rayon. Les centrifugeuses automatiques traitent un rayon chacune par cycle ({state.cycle_seconds} s), même en votre absence.
      </PageHead>

      <div className="card machine">
        <Centrifuge spinning={centrifuges > 0 && owned.length > 0} />
        <div className="grow">
          <div className="title">
            {content.machines.centrifuge.label} {centrifuges > 0 && <span className="badge ok">×{centrifuges}</span>}
          </div>
          <div className="muted">
            {centrifuges === 0
              ? "Aucune pour l'instant : tout se fait à la main."
              : owned.length
                ? `En marche : ${centrifuges} rayon${centrifuges > 1 ? 's' : ''} toutes les ${state.cycle_seconds} s.`
                : 'À l’arrêt : plus de rayons à traiter.'}
          </div>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end' }}>
          <CostView cost={offer.cost} />
          <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'machine:centrifuge' })}>
            {centrifuges ? 'En ajouter une' : 'Acheter'}
          </button>
        </div>
      </div>

      <h2>Rayons à traiter</h2>
      {owned.length === 0 && <p className="muted">Aucun rayon en stock. Récoltez vos ruches dans l'onglet Rucher.</p>}
      <div className="grid tiles wide-tiles">
        {owned.map((comb) => (
          <div key={comb} className="card shop-tile">
            <ItemIcon id={comb} size={44} />
            <div className="title">{content.items[comb].label}</div>
            <span className="badge">×{fmt(state.inventory[comb])}</span>
            <div className="row" style={{ justifyContent: 'center', gap: 4 }}>
              {content.recipes[comb].map(([out, chance, qty]) => (
                <span key={out} className="trait" title={`${out === 'honey' ? 'Miel' : content.items[out]?.label} ×${qty} · ${Math.round(chance * 100)} % de chance`}>
                  {out === 'honey' ? <Honey amount={qty} /> : <ItemIcon id={out} size={14} />}
                </span>
              ))}
            </div>
            <HoldButton seconds={HOLD_SECONDS} onDone={() => act('/factory/process', { comb_id: comb, qty: 1 })}>
              Maintenir
            </HoldButton>
          </div>
        ))}
      </div>

      <h2>Ressources</h2>
      {resources.length === 0 && <p className="muted">Aucune ressource pour le moment.</p>}
      <div className="inventory">
        {resources.map(([id, qty]) => (
          <div key={id} className="inv-slot" title={content.items[id].label}>
            <ItemIcon id={id} size={30} />
            <small>{fmt(qty)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
