'use client';

import { Outputs } from '@/components/apidex';
import { HoldButton } from '@/components/HoldButton';
import { CostView, ItemIcon, ItemQty, PageHead, Switch, fmt } from '@/components/ui';
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

/** Durée lisible pour un nombre de secondes. */
function duration(s: number) {
  if (s < 60) return `${s} s`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')}`;
}

export default function FactoryPage() {
  const { content, state, act } = useGame();
  const owned = Object.keys(content.recipes).filter((c) => (state.inventory[c] ?? 0) > 0);
  const resources = Object.entries(state.inventory)
    .filter(([id, qty]) => content.items[id]?.category === 'resource' && qty > 0)
    .sort((a, b) => b[1] - a[1]);
  const centrifuges = state.machines.centrifuge ?? 0;
  const hasAuto = centrifuges > 0;
  const offer = state.offers['machine:centrifuge'];
  const running = state.factory.on;
  const skip = new Set(state.factory.skip);
  const todo = owned.filter((c) => !skip.has(c));
  const queued = todo.reduce((n, c) => n + state.inventory[c], 0);
  const kept = owned.length - todo.length;
  const working = hasAuto && running && queued > 0;

  let status: string;
  if (!hasAuto) status = 'Aucune centrifugeuse automatique : les rayons se traitent à la main.';
  else if (!running) status = 'À l’arrêt : les rayons restent en stock.';
  else if (!queued) status = owned.length ? 'En attente : tous les rayons en stock sont mis de côté.' : 'En attente : plus de rayons à traiter.';
  else status = `En marche : ${centrifuges} rayon${centrifuges > 1 ? 's' : ''} toutes les ${state.cycle_seconds} s.`;

  return (
    <>
      <PageHead title="Centrifugeuse">
        Centrifugez les rayons récoltés pour en tirer du miel et des ressources. À la main, maintenez le bouton {HOLD_SECONDS} secondes
        par rayon. Chaque centrifugeuse automatique traite un rayon par cycle ({state.cycle_seconds} s), même en votre absence. Coupez-les
        ou décochez « Auto » sur un rayon pour le garder en stock, pour une commande du Comptoir par exemple.
      </PageHead>

      <div className="card factory-head">
        <Centrifuge spinning={working} />
        <div style={{ minWidth: 0 }}>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
            <span className="title">
              {content.machines.centrifuge.label} {hasAuto && <span className="badge ok">×{centrifuges}</span>}
            </span>
            {hasAuto && (
              <Switch
                on={running}
                onChange={(on) => act('/factory/settings', { on })}
                label={running ? 'Automatique' : 'À l’arrêt'}
                title={running ? 'Arrêter les centrifugeuses automatiques' : 'Remettre les centrifugeuses en marche'}
              />
            )}
          </div>
          <div className="muted">{status}</div>
          {hasAuto && (
            <div className="factory-stats">
              <span className="chip">{fmt(queued)} rayons en file</span>
              {working && <span className="chip">≈ {duration(Math.ceil(queued / centrifuges) * state.cycle_seconds)} pour tout traiter</span>}
              {kept > 0 && <span className="chip">{kept} sorte{kept > 1 ? 's' : ''} mise{kept > 1 ? 's' : ''} de côté</span>}
            </div>
          )}
        </div>
        <div className="factory-buy">
          <CostView cost={offer.cost} />
          <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'machine:centrifuge' })}>
            {hasAuto ? 'Ajouter une centrifugeuse' : 'Acheter une centrifugeuse'}
          </button>
        </div>
      </div>

      <h2>Rayons en stock</h2>
      {owned.length === 0 && <p className="muted">Aucun rayon en stock. Récoltez vos ruches dans l'onglet Rucher.</p>}
      <div className="comb-list">
        {owned.map((comb) => {
          const auto = !skip.has(comb);
          return (
            <div key={comb} className={`comb-row${hasAuto && (!auto || !running) ? ' paused' : ''}`}>
              <ItemIcon id={comb} size={44} />
              <span>
                <div className="title">{content.items[comb].label}</div>
                <b>×{fmt(state.inventory[comb])}</b>
              </span>
              <Outputs comb={comb} />
              {hasAuto ? (
                <Switch
                  on={auto}
                  onChange={(on) => act('/factory/combs', { comb_id: comb, auto: on })}
                  label="Auto"
                  title={auto ? 'Traité par les centrifugeuses automatiques' : 'Mis de côté : les centrifugeuses n’y touchent pas'}
                />
              ) : (
                <span />
              )}
              <span className="hold-col">
                <HoldButton seconds={HOLD_SECONDS} onDone={() => act('/factory/process', { comb_id: comb, qty: 1 })}>
                  Maintenir
                </HoldButton>
              </span>
            </div>
          );
        })}
      </div>

      <h2>Ressources</h2>
      {resources.length === 0 && <p className="muted">Aucune ressource pour le moment.</p>}
      <div className="resource-grid">
        {resources.map(([id, qty]) => (
          <ItemQty key={id} id={id} qty={qty} />
        ))}
      </div>
    </>
  );
}
