'use client';

import { useEffect, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { GenomeIcon, Honey, ItemQty, PageHead, TYPE_LABELS, alleleLabel, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Bee, Order } from '@/lib/types';

function useNow(serverTime: number) {
  // Horloge locale recalée sur celle du serveur, pour les comptes à rebours
  const [offset] = useState(() => serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}

const duration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s >= 86400) return `${Math.floor(s / 86400)} j ${Math.floor((s % 86400) / 3600)} h`;
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  if (s >= 60) return `${Math.floor(s / 60)} min`;
  return `${s} s`;
};

export default function ComptoirPage() {
  const { content, state, act } = useGame();
  const now = useNow(state.server_time);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const board = state.orders;
  const levels = content.orders.levels;
  const level = board.level;
  const next = levels[level + 1];
  const reserve = state.bees.filter((b) => b.hive_id === null);

  const fits = (bee: Bee, want: NonNullable<Order['bee']>) =>
    bee.type === want.type && bee.genome.species[0] === want.species && Object.entries(want.alleles).every(([c, a]) => bee.genome[c]?.[0] === a);

  const Card = ({ order }: { order: Order }) => {
    const guild = content.orders.guilds[order.guild];
    const items = Object.entries(order.items ?? {});
    const candidates = order.bee ? reserve.filter((b) => fits(b, order.bee!)) : [];
    const chosen = candidates.find((b) => b.id === picked[order.id]) ?? candidates[0];
    const pedigreeOk = order.pedigree ? (state.pedigree?.[order.pedigree.species] ?? 0) >= order.pedigree.level : true;
    const ready = items.every(([item, n]) => (state.inventory[item] ?? 0) >= n) && (!order.bee || !!chosen) && pedigreeOk;
    return (
      <div className={`card order-card${order.prestige ? ' prestige' : ''}${ready ? ' ready' : ''}`}>
        <div className="row between">
          <span className="order-guild" title={guild.desc}>
            <span className="order-guild-icon">{guild.icon}</span>
            <b>{guild.label}</b>
          </span>
          <span className="muted" title="Temps avant que le client reparte">
            ⏳ {duration(order.expires_ms - now)}
          </span>
        </div>

        {items.length > 0 && (
          <div className="order-needs">
            {items.map(([item, n]) => {
              const have = state.inventory[item] ?? 0;
              return (
                <div key={item} className="order-need">
                  <ItemQty id={item} />
                  <span className={have >= n ? 'ok-text' : 'lacking'}>
                    {fmt(Math.min(have, n))} / {fmt(n)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {order.bee && (
          <div className="order-bee">
            <div className="row">
              <BeeIcon
                species={order.bee.species}
                color={content.species[order.bee.species].color}
                secondary={content.species[order.bee.species].secondary}
                type={order.bee.type}
                size={36}
              />
              <span>
                <b>
                  {TYPE_LABELS[order.bee.type]} {content.species[order.bee.species].label}
                </b>
                <span className="row" style={{ gap: 4, marginTop: 2 }}>
                  {Object.entries(order.bee.alleles).map(([c, a]) => (
                    <span key={c} className="chip" title="Copie active exigée">
                      {content.chromosomes[c]} : {alleleLabel(content, c, a)}
                    </span>
                  ))}
                </span>
              </span>
            </div>
            {candidates.length === 0 ? (
              <span className="lacking">Aucune abeille de votre réserve ne correspond.</span>
            ) : (
              <div className="row" style={{ gap: 4 }}>
                {candidates.map((b) => (
                  <button
                    key={b.id}
                    className={`chip pick${chosen?.id === b.id ? ' selected' : ''}`}
                    title="Abeille livrée (elle quitte votre réserve)"
                    onClick={() => setPicked({ ...picked, [order.id]: b.id })}
                  >
                    <GenomeIcon genome={b.genome} type={b.type} size={18} /> ×{b.count}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {order.pedigree && (
          <div className="order-need">
            <span>
              📜 Certificat : <b>{content.species[order.pedigree.species].label}</b> au moins{' '}
              {content.trophies.pedigree[String(order.pedigree.level)].icon} {content.trophies.pedigree[String(order.pedigree.level)].label}
            </span>
            <span className={pedigreeOk ? 'ok-text' : 'lacking'}>{pedigreeOk ? 'Certifiée' : 'À certifier'}</span>
          </div>
        )}

        <div className="row between order-foot">
          <span className="row" style={{ gap: 4 }}>
            <Honey amount={order.reward.honey} />
            {Object.entries(order.reward.items).map(([item, n]) => (
              <ItemQty key={item} id={item} qty={n} />
            ))}
            <span className="chip rep-chip">+{order.rep} réputation</span>
          </span>
          <span className="row" style={{ gap: 4 }}>
            {!order.prestige && (
              <button className="small" title="Le client repart ; un autre arrive un peu plus tard" onClick={() => act('/orders/discard', { order_id: order.id })}>
                Refuser
              </button>
            )}
            <button className="primary compact" disabled={!ready} onClick={() => act('/orders/deliver', { order_id: order.id, bee_id: chosen?.id })}>
              Livrer
            </button>
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <PageHead title="Comptoir">
        Les guildes passent commande : des ressources, une abeille aux gènes précis, ou un pedigree certifié. Chaque livraison rapporte du miel
        et de la réputation, qui ouvre de nouvelles places au comptoir et la commande de prestige de la semaine. Un client repart au bout de{' '}
        {content.orders.lifetime_ms / 3600000} h ; une place libérée se remplit {content.orders.refill_ms / 60000} min plus tard.
      </PageHead>

      <div className="card reputation-card">
        <div className="row between">
          <span>
            <span className="muted">Réputation</span>
            <div className="title" style={{ fontSize: 22 }}>
              {levels[level].label}
            </div>
          </span>
          <span className="badge">{fmt(board.reputation)} points</span>
        </div>
        {next ? (
          <>
            <div className="bar">
              <div style={{ width: `${(100 * (board.reputation - levels[level].need)) / (next.need - levels[level].need)}%` }} />
            </div>
            <span className="muted">
              Prochain titre : <b>{next.label}</b> à {fmt(next.need)} points
              {level + 1 === 1 && ' · débloque la commande de prestige'}
              {level + 1 === 2 && ' · une 4e place au comptoir'}
              {level + 1 === 4 && ' · une 5e place au comptoir'}
            </span>
          </>
        ) : (
          <span className="muted">Titre le plus élevé atteint.</span>
        )}
      </div>

      <h2>Commande de prestige</h2>
      {level < 1 ? (
        <div className="notice">Atteignez le titre « {levels[1].label} » ({levels[1].need} points de réputation) pour recevoir une commande de prestige chaque semaine.</div>
      ) : board.prestige?.done ? (
        <div className="notice">Commande de la semaine honorée. La prochaine arrive lundi.</div>
      ) : board.prestige?.order ? (
        <Card order={board.prestige.order} />
      ) : (
        <div className="notice">Aucune commande de prestige cette semaine.</div>
      )}

      <h2>Commandes</h2>
      <div className="order-grid">
        {board.slots.map((slot, i) =>
          slot.order ? (
            <Card key={slot.order.id} order={slot.order} />
          ) : (
            <div key={`empty-${i}`} className="card order-card empty">
              <span className="muted">🚪 Place libre · un client arrive dans {duration(slot.ready_ms - now)}</span>
            </div>
          ),
        )}
      </div>
    </>
  );
}
