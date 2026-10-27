'use client';

import { useState, type ReactNode } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { HiveArt } from '@/components/HiveArt';
import { BIOME_ICONS, CostView, Honey, ItemIcon, PageHead, Traits, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Offer } from '@/lib/types';

const TABS = [
  { id: 'bees', label: 'Abeilles' },
  { id: 'hives', label: 'Ruches' },
  { id: 'modules', label: 'Cadres et modules' },
  { id: 'lab', label: 'Machines et labo' },
  { id: 'sell', label: 'Vendre' },
] as const;
type Tab = (typeof TABS)[number]['id'];

const QUANTITIES = [1, 5, 10];

function Buy({ offer, qty = 1, biome, compact, children }: { offer: Offer; qty?: number; biome?: string; compact?: boolean; children: ReactNode }) {
  const { act, state } = useGame();
  const { cost, lock } = state.offers[offer.id];
  const short = state.player.honey < cost.honey * qty || Object.entries(cost.items).some(([i, n]) => (state.inventory[i] ?? 0) < n * qty);
  return (
    <button className={`primary${compact ? ' compact' : ''}`} disabled={!!lock || short} title={lock ?? undefined} onClick={() => act('/shop/buy', { offer_id: offer.id, qty, biome })}>
      {children}
    </button>
  );
}

/** Une espèce en vente : une tuile, deux boutons (princesse, faux-bourdon). */
function BeeOffer({ species, offers, qty }: { species: string; offers: Offer[]; qty: number }) {
  const { content, state } = useGame();
  const s = content.species[species];
  const lock = state.offers[offers[0].id].lock;
  const genome = Object.fromEntries(Object.entries(s.template).map(([c, a]) => [c, [a, a]])) as Record<string, [string, string]>;
  return (
    <div className={`card shop-tile${lock ? ' locked' : ''}`}>
      <BeeIcon species={species} color={s.color} secondary={s.secondary} type="princess" size={60} unknown={!!lock} />
      <div className="title">{lock ? '???' : s.label}</div>
      {!lock && <Traits genome={genome} />}
      {lock ? (
        <span className="muted">🔒 {lock}</span>
      ) : (
        <div className="row" style={{ justifyContent: 'center', gap: 6 }}>
          {offers.map((offer) => (
            <Buy key={offer.id} offer={offer} qty={qty} compact>
              {offer.type === 'princess' ? '♀' : '♂'} <Honey amount={state.offers[offer.id].cost.honey * qty} />
            </Buy>
          ))}
        </div>
      )}
    </div>
  );
}

function HiveOffer({ offer }: { offer: Offer }) {
  const { content, state } = useGame();
  const [biome, setBiome] = useState('plains');
  const type = content.hive_types[offer.hive_type!];
  const { cost } = state.offers[offer.id];
  return (
    <div className="card offer">
      <div className="bee-head">
        <HiveArt className="" alveary={offer.hive_type === 'alveary'} size={64} />
        <div>
          <div className="title">{type.label}</div>
          <div className="muted">
            {type.frames_only
              ? `${type.slots} emplacements pour cadres.`
              : `${type.slots} à ${type.max_slots} emplacements, tous les modules, production ×${type.production}.`}
          </div>
        </div>
      </div>
      <div className="row" role="radiogroup" aria-label="Biome">
        {Object.entries(content.biomes).map(([id, b]) => (
          <button
            key={id}
            role="radio"
            aria-checked={biome === id}
            className={`chip pick${biome === id ? ' selected' : ''}`}
            title={`${b.label} · climat ${content.temp_labels[b.temp]}`}
            onClick={() => setBiome(id)}
          >
            {BIOME_ICONS[id]} {b.label}
          </button>
        ))}
      </div>
      <div className="row between">
        <CostView cost={cost} />
        <Buy offer={offer} biome={biome}>
          Acheter
        </Buy>
      </div>
    </div>
  );
}

function ItemOffer({ offer, qty }: { offer: Offer; qty: number }) {
  const { content, state } = useGame();
  const { cost, lock } = state.offers[offer.id];
  let icon: ReactNode = null;
  let title = '';
  let desc = '';
  let tag = '';
  if (offer.kind === 'item' && offer.item) {
    icon = <ItemIcon id={offer.item} size={40} />;
    title = content.items[offer.item].label;
    const module = content.modules[offer.item];
    desc = module?.desc ?? 'Consommée à chaque opération du laboratoire.';
    if (module?.uses) desc += ` · s'use en ${module.uses} générations`;
    if (module) tag = module.frame ? 'Rucher et alvéaire' : 'Alvéaire';
  } else if (offer.kind === 'machine' && offer.machine) {
    icon = <span style={{ fontSize: 34 }}>⚙️</span>;
    title = content.machines[offer.machine].label;
    desc = content.machines[offer.machine].desc;
  } else if (offer.kind === 'unlock') {
    icon = <span style={{ fontSize: 34 }}>🧪</span>;
    title = 'Laboratoire de génétique';
    desc = "Extraction et impression de gènes (Atelier › Laboratoire).";
  }
  const stackable = offer.kind === 'item';
  return (
    <div className={`card offer${lock ? ' locked' : ''}`}>
      <div className="bee-head">
        {icon}
        <div>
          <div className="title">{title}</div>
          {tag && <span className="badge info">{tag}</span>}
        </div>
      </div>
      <div className="muted">{desc}</div>
      {lock ? (
        <span className="muted">🔒 {lock}</span>
      ) : (
        <div className="row between">
          <CostView cost={cost} times={stackable ? qty : 1} />
          <Buy offer={offer} qty={stackable ? qty : 1}>
            Acheter{stackable && qty > 1 ? ` ×${qty}` : ''}
          </Buy>
        </div>
      )}
    </div>
  );
}

export default function ShopPage() {
  const { content, state, act } = useGame();
  const [tab, setTab] = useState<Tab>('bees');
  const [qty, setQty] = useState(1);
  const offers = content.offers;
  const sellable = Object.entries(state.inventory).filter(([id]) => (content.items[id]?.sell ?? 0) > 0);

  const beeSpecies = [...new Set(offers.filter((o) => o.kind === 'bee').map((o) => o.species!))];

  return (
    <>
      <PageHead guide="boutique" title="Boutique">
        Tout se paie en miel, parfois complété par des ressources tirées de vos rayons. Les espèces rares se débloquent au fil de vos
        découvertes.
      </PageHead>
      <div className="row tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
        {(tab === 'bees' || tab === 'modules') && (
          <span className="row" style={{ marginLeft: 'auto' }} role="radiogroup" aria-label="Quantité">
            <span className="muted">Quantité</span>
            {QUANTITIES.map((n) => (
              <button key={n} role="radio" aria-checked={qty === n} className={`chip pick${qty === n ? ' selected' : ''}`} onClick={() => setQty(n)}>
                ×{n}
              </button>
            ))}
          </span>
        )}
      </div>

      {tab === 'bees' && (
        <div className="grid tiles">
          {beeSpecies.map((s) => (
            <BeeOffer key={s} species={s} offers={offers.filter((o) => o.kind === 'bee' && o.species === s)} qty={qty} />
          ))}
        </div>
      )}
      {tab === 'hives' && (
        <div className="grid">
          {offers.filter((o) => o.kind === 'hive').map((o) => (
            <HiveOffer key={o.id} offer={o} />
          ))}
        </div>
      )}
      {tab === 'modules' && (
        <div className="grid">
          {offers.filter((o) => o.kind === 'item' && o.item !== 'labware').map((o) => (
            <ItemOffer key={o.id} offer={o} qty={qty} />
          ))}
        </div>
      )}
      {tab === 'lab' && (
        <div className="grid">
          {offers.filter((o) => o.kind === 'machine' || o.kind === 'unlock' || o.item === 'labware').map((o) => (
            <ItemOffer key={o.id} offer={o} qty={1} />
          ))}
        </div>
      )}
      {tab === 'sell' && (
        <>
          {sellable.length === 0 && <p className="muted">Rien à vendre pour le moment. Centrifugez vos rayons à l'usine.</p>}
          <div className="grid tiles">
            {sellable.map(([id, n]) => (
              <div key={id} className="card shop-tile">
                <ItemIcon id={id} size={40} />
                <div className="title">{content.items[id].label}</div>
                <span className="muted">
                  ×{fmt(n)} · <Honey amount={content.items[id].sell} /> pièce
                </span>
                <div className="stack" style={{ width: '100%' }}>
                  <button onClick={() => act('/shop/sell', { item_id: id, qty: 1 })}>Vendre 1</button>
                  <button className="primary" onClick={() => act('/shop/sell', { item_id: id, qty: n })}>
                    Tout · <Honey amount={content.items[id].sell * n} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
