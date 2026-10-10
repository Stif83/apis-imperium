'use client';

import { useState } from 'react';
import { BeeCard, CostView, Honey, ItemQty, alleleLabel } from '@/components/ui';
import { useGame } from '@/lib/game';

export default function GeneticsPage() {
  const { content, state, act } = useGame();
  const [beeId, setBeeId] = useState('');
  const [chromosome, setChromosome] = useState('species');
  const [genes, setGenes] = useState<Record<string, string>>({});

  if (!state.player.genetics_unlocked) {
    const offer = state.offers['unlock:genetics'];
    return (
      <>
        <h1>Génétique</h1>
        <div className="card">
          <div className="title">🔒 Laboratoire de génétique</div>
          <p className="muted">
            Le laboratoire permet d'extraire les gènes de vos abeilles pour les conserver dans une banque, puis de les imprimer sur
            d'autres abeilles. Il se débloque une fois votre élevage bien lancé.
          </p>
          <div className="row">
            <CostView cost={offer.cost} />
            {offer.lock ? (
              <span className="muted">{offer.lock}</span>
            ) : (
              <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'unlock:genetics' })}>
                Construire le laboratoire
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const bees = state.bees.filter((b) => b.hive_id === null);
  const bee = bees.find((b) => b.id === beeId);
  const labware = state.inventory.labware ?? 0;
  const chosen = Object.fromEntries(Object.entries(genes).filter(([, allele]) => allele));
  const chosenCount = Object.keys(chosen).length;
  const targetAllele = bee?.genome[chromosome]?.[0];
  const alreadyKnown = targetAllele !== undefined && (state.genes[chromosome] ?? []).includes(targetAllele);

  return (
    <>
      <h1>Génétique</h1>
      <p className="muted">
        Chaque opération consomme une verrerie de laboratoire. L'extraction sacrifie l'abeille ; le gène obtenu reste dans votre
        banque et sert autant de fois que vous voulez.
      </p>
      <div className="row">
        <ItemQty id="labware" qty={labware} />
        <button onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 1 })}>
          Acheter 1 (<Honey amount={state.offers['item:labware'].cost.honey} />)
        </button>
        <button onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 10 })}>Acheter 10</button>
      </div>

      <h2>Banque de gènes</h2>
      <div className="grid">
        {Object.entries(content.chromosomes).map(([c, label]) => (
          <div key={c} className="card">
            <div className="title">{label}</div>
            <div className="row">
              {(state.genes[c] ?? []).length === 0 && <span className="muted">Aucun gène.</span>}
              {(state.genes[c] ?? []).map((allele) => (
                <span key={allele} className="chip">
                  {alleleLabel(content, c, allele)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2>1. Choisir une abeille</h2>
      {bees.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
      <div className="grid">
        {bees.map((b) => (
          <BeeCard key={b.id} genome={b.genome} type={b.type} count={b.count} selected={b.id === beeId} onClick={() => setBeeId(b.id)} />
        ))}
      </div>

      {bee && (
        <>
          <h2>2a. Extraire un gène (sacrifie l'abeille)</h2>
          <div className="card">
            <div className="row">
              <select value={chromosome} onChange={(e) => setChromosome(e.target.value)}>
                {Object.entries(content.chromosomes).map(([c, label]) => (
                  <option key={c} value={c}>
                    {label} : {alleleLabel(content, c, bee.genome[c][0])}
                  </option>
                ))}
              </select>
              <button className="primary" disabled={alreadyKnown || labware < 1} onClick={() => act('/genetics/extract', { bee_id: bee.id, chromosome })}>
                Extraire
              </button>
              {alreadyKnown && <span className="muted">Déjà dans la banque.</span>}
              {!alreadyKnown && labware < 1 && <span className="lacking">Il faut une verrerie.</span>}
            </div>
          </div>

          <h2>2b. Imprimer des gènes de la banque</h2>
          <div className="card">
            {Object.entries(content.chromosomes).map(([c, label]) => (
              <div key={c} className="row">
                <span style={{ width: 170 }}>{label}</span>
                <select value={genes[c] ?? ''} onChange={(e) => setGenes({ ...genes, [c]: e.target.value })}>
                  <option value="">— inchangé —</option>
                  {(state.genes[c] ?? []).map((allele) => (
                    <option key={allele} value={allele}>
                      {alleleLabel(content, c, allele)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
            <div className="row">
              <CostView cost={{ honey: content.imprint_honey_per_gene * Math.max(1, chosenCount), items: { labware: 1 } }} />
              <button
                className="primary"
                disabled={chosenCount === 0}
                onClick={async () => {
                  if (await act('/genetics/imprint', { bee_id: bee.id, genes: chosen })) setBeeId('');
                }}
              >
                Imprimer sur une abeille
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
