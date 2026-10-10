'use client';

import { useState, type ReactNode } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { TreeIcon } from '@/components/garden';
import { CostView, Honey, ItemIcon, TYPE_LABELS, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Offer } from '@/lib/types';

function OfferCard({ offer }: { offer: Offer }) {
  const { content, state, act } = useGame();
  const [qty, setQty] = useState(1);
  const [biome, setBiome] = useState('plains');
  const { cost, lock } = state.offers[offer.id];
  const multiple = offer.kind === 'bee' || offer.kind === 'item' || offer.kind === 'sapling';

  let icon: ReactNode = null;
  let title = offer.id;
  let desc = '';
  if (offer.kind === 'bee' && offer.species && offer.type) {
    const species = content.species[offer.species];
    icon = <BeeIcon color={species.color} secondary={species.secondary} type={offer.type} size={40} />;
    title = `${TYPE_LABELS[offer.type]} ${species.label}`;
    desc = `Climat : ${content.temp_labels[species.temp]}`;
  } else if (offer.kind === 'item' && offer.item) {
    icon = <ItemIcon id={offer.item} size={32} />;
    title = content.items[offer.item].label;
    desc = content.modules[offer.item]?.desc ?? 'Consommée par le laboratoire de génétique.';
    if (content.modules[offer.item]) desc += content.modules[offer.item].frame ? ' · Rucher et alvéaire' : ' · Alvéaire uniquement';
  } else if (offer.kind === 'hive' && offer.hive_type) {
    const type = content.hive_types[offer.hive_type];
    icon = <span className="swatch" style={{ background: `#${content.biomes[biome]?.color ?? '888888'}` }} />;
    title = type.label;
    desc = type.frames_only
      ? `${type.slots} emplacements pour cadres.`
      : `${type.slots} emplacements (extensible à ${type.max_slots}), accepte tous les modules, production ×${type.production}.`;
  } else if (offer.kind === 'machine' && offer.machine) {
    title = content.machines[offer.machine].label;
    desc = content.machines[offer.machine].desc;
  } else if (offer.kind === 'sapling' && offer.species) {
    const tree = content.garden.trees[offer.species];
    icon = <TreeIcon color={tree.color} secondary={tree.secondary} size={40} />;
    title = `Pousse de ${tree.label}`;
    desc = `${tree.branch} · ${tree.products.map(([item]) => content.items[item]?.label).join(', ')}`;
  } else if (offer.kind === 'plot') {
    title = 'Parcelle de jardin';
    desc = "Un emplacement de plus pour faire pousser un arbre.";
  } else if (offer.kind === 'unlock') {
    title = 'Laboratoire de génétique';
    desc = "Extraction de gènes et modification d'abeilles (onglet Génétique).";
  }

  return (
    <div className={`card${lock ? ' locked' : ''}`}>
      <div className="bee-head">
        {icon}
        <div>
          <div className="title">{title}</div>
          <div className="muted">{desc}</div>
        </div>
      </div>
      <CostView cost={cost} times={multiple ? qty : 1} />
      {lock ? (
        <div className="muted">🔒 {lock}</div>
      ) : (
        <div className="actions">
          {multiple && (
            <input type="number" min={1} max={100} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} />
          )}
          {offer.kind === 'hive' && (
            <select value={biome} onChange={(e) => setBiome(e.target.value)}>
              {Object.entries(content.biomes).map(([id, b]) => (
                <option key={id} value={id}>
                  {b.label} ({content.temp_labels[b.temp]})
                </option>
              ))}
            </select>
          )}
          <button className="primary" onClick={() => act('/shop/buy', { offer_id: offer.id, qty, biome })}>
            Acheter
          </button>
        </div>
      )}
    </div>
  );
}

const SECTIONS: { title: string; match: (o: Offer) => boolean }[] = [
  { title: 'Abeilles', match: (o) => o.kind === 'bee' },
  { title: 'Ruches', match: (o) => o.kind === 'hive' },
  { title: 'Cadres et modules', match: (o) => o.kind === 'item' && o.item !== 'labware' },
  { title: 'Jardin', match: (o) => o.kind === 'sapling' || o.kind === 'plot' },
  { title: 'Machines et laboratoire', match: (o) => o.kind === 'machine' || o.kind === 'unlock' || o.item === 'labware' },
];

export default function ShopPage() {
  const { content, state, act } = useGame();
  const sellable = Object.entries(state.inventory).filter(([id]) => (content.items[id]?.sell ?? 0) > 0);

  return (
    <>
      <h1>Boutique</h1>
      <p className="muted">Tout se paie en miel, parfois complété par des ressources tirées de vos rayons.</p>

      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <div className="grid">
            {content.offers.filter(section.match).map((offer) => (
              <OfferCard key={offer.id} offer={offer} />
            ))}
          </div>
        </section>
      ))}

      <h2>Vendre des ressources</h2>
      {sellable.length === 0 && <p className="muted">Rien à vendre pour le moment.</p>}
      <div className="grid">
        {sellable.map(([id, qty]) => (
          <div key={id} className="card">
            <div className="row between">
              <span className="row title">
                <ItemIcon id={id} />
                {content.items[id].label}
              </span>
              <b>×{fmt(qty)}</b>
            </div>
            <div className="muted row">
              <Honey amount={content.items[id].sell} /> l'unité
            </div>
            <div className="actions">
              <button onClick={() => act('/shop/sell', { item_id: id, qty: 1 })}>Vendre 1</button>
              <button onClick={() => act('/shop/sell', { item_id: id, qty })}>
                Tout vendre (<Honey amount={content.items[id].sell * qty} />)
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
