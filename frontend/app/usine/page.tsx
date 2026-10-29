'use client';

import { Outputs } from '@/components/apidex';
import { HoldButton } from '@/components/HoldButton';
import { CostView, ItemIcon, ItemQty, PageHead, SHORT, Switch, canAfford, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import { type Ctx, pixelUrl, rect, shaded } from '@/lib/pixel';

const HOLD_SECONDS = 3;

const PX = 28;

/** Une image de la centrifugeuse : tambour aux rayons droits (0) ou en croix (1). */
function drawCentrifuge(ctx: Ctx, frame: number) {
  shaded(ctx, PX, PX, (x, y) => y >= 23 && y <= 26 && x >= 2 && x <= 25, '#8a5a2b');
  shaded(ctx, PX, PX, (x, y) => y >= 3 && y <= 23 && x >= 4 && x <= 23 && !((x < 6 || x > 21) && (y < 5 || y > 21)), '#cfd8dc');
  shaded(ctx, PX, PX, (x, y) => (x - 13.5) ** 2 + (y - 13) ** 2 <= 42, '#ffd75a', { outline: '#d48f00' });
  for (let k = -5; k <= 5; k++) {
    if (frame === 0) {
      rect(ctx, 13 + k, 13, 1, 1, '#d48f00');
      rect(ctx, 13, 13 + k, 1, 1, '#d48f00');
    } else if (Math.abs(k) <= 4) {
      rect(ctx, 13 + k, 13 + k, 1, 1, '#d48f00');
      rect(ctx, 13 + k, 13 - k, 1, 1, '#d48f00');
    }
  }
  rect(ctx, 12, 12, 3, 3, '#8a5a2b');
}

/** Centrifugeuse en pixel art ; le tambour tourne quand elle a du travail. */
function Centrifuge({ spinning }: { spinning: boolean }) {
  const sheet = pixelUrl('centrifuge', PX * 2, PX, (ctx) => {
    drawCentrifuge(ctx, 0);
    ctx.translate(PX, 0);
    drawCentrifuge(ctx, 1);
  });
  return <span className={`pixel centrifuge-art${spinning ? ' spinning' : ''}`} style={{ backgroundImage: `url(${sheet})` }} aria-hidden />;
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
  const batch = state.manual_batch;
  const press = state.offers['machine:manual_press'];
  const nextBatch = content.manual_batches[(state.machines.manual_press ?? 0) + 1];

  let status: string;
  if (!hasAuto) status = 'Aucune centrifugeuse automatique : les rayons se traitent à la main.';
  else if (!running) status = 'À l’arrêt : les rayons restent en stock.';
  else if (!queued) status = owned.length ? 'En attente : tous les rayons en stock sont mis de côté.' : 'En attente : plus de rayons à traiter.';
  else status = `En marche : ${centrifuges} rayon${centrifuges > 1 ? 's' : ''} toutes les ${state.cycle_seconds} s.`;

  return (
    <>
      <PageHead guide="centrifugeuse" title="Centrifugeuse">
        Centrifugez les rayons récoltés pour en tirer du miel et des ressources. À la main, maintenez le bouton {HOLD_SECONDS} secondes :
        {batch > 1 ? ` ${batch} rayons par geste grâce à la manivelle renforcée.` : ' un rayon par geste, davantage avec la manivelle renforcée.'} Chaque centrifugeuse automatique traite un rayon par cycle ({state.cycle_seconds} s), même en votre absence. Coupez-les
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
          <button
            className="primary"
            disabled={!!offer.lock || !canAfford(state, offer.cost)}
            title={offer.lock ?? (canAfford(state, offer.cost) ? undefined : SHORT)}
            onClick={() => act('/shop/buy', { offer_id: 'machine:centrifuge' })}
          >
            {hasAuto ? 'Ajouter une centrifugeuse' : 'Acheter une centrifugeuse'}
          </button>
          {nextBatch && (
            <>
              <CostView cost={press.cost} />
              <button
                disabled={!!press.lock || !canAfford(state, press.cost)}
                title={press.lock ?? (canAfford(state, press.cost) ? content.machines.manual_press.desc : SHORT)}
                onClick={() => act('/shop/buy', { offer_id: 'machine:manual_press' })}
              >
                Manivelle : {nextBatch} rayons par geste
              </button>
            </>
          )}
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
                <HoldButton seconds={HOLD_SECONDS} onDone={() => act('/factory/process', { comb_id: comb, qty: batch })}>
                  {batch > 1 ? `Maintenir ×${fmt(Math.min(batch, state.inventory[comb]))}` : 'Maintenir'}
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
