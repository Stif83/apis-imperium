'use client';

import { useState } from 'react';
import { CostView, GenomeIcon, GenomeTable, Honey, ItemIcon, PageHead, TYPE_LABELS, Traits, alleleLabel, fmt } from '@/components/ui';
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
        <PageHead title="Génétique" />
        <div className="card lab-locked">
          <span style={{ fontSize: 56 }}>🧪</span>
          <div className="title">Laboratoire de génétique</div>
          <p className="muted">
            Extrayez les gènes de vos abeilles pour les garder dans une banque, puis imprimez-les sur d'autres abeilles. Il se débloque une
            fois votre élevage bien lancé.
          </p>
          <CostView cost={offer.cost} />
          {offer.lock ? (
            <span className="badge">🔒 {offer.lock}</span>
          ) : (
            <button className="primary" onClick={() => act('/shop/buy', { offer_id: 'unlock:genetics' })}>
              Construire le laboratoire
            </button>
          )}
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
  const banked = Object.values(state.genes).reduce((n, list) => n + list.length, 0);

  return (
    <>
      <PageHead
        title="Génétique"
        extra={
          <span className="row" style={{ marginLeft: 'auto' }}>
            <span className="chip" title="Verrerie de laboratoire">
              <ItemIcon id="labware" size={16} /> ×{fmt(labware)}
            </span>
            <button className="small" onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 1 })}>
              +1 (<Honey amount={state.offers['item:labware'].cost.honey} />)
            </button>
            <button className="small" onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 10 })}>
              +10
            </button>
          </span>
        }
      >
        Chaque opération consomme une verrerie. L'extraction sacrifie l'abeille, mais le gène reste dans votre banque et sert autant de
        fois que vous voulez. L'impression remplace les gènes choisis sur une abeille (les deux copies).
      </PageHead>

      <h2>Banque de gènes · {banked}</h2>
      <div className="gene-bank">
        {Object.entries(content.chromosomes).map(([c, label]) => (
          <div key={c} className="gene-row">
            <span className="muted">{label}</span>
            <span className="row" style={{ gap: 4 }}>
              {(state.genes[c] ?? []).length === 0 && <span className="muted">—</span>}
              {(state.genes[c] ?? []).map((allele) => (
                <span key={allele} className="chip">
                  {alleleLabel(content, c, allele)}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>

      <h2>Choisir une abeille</h2>
      {bees.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
      <div className="grid tiles">
        {bees.map((b) => (
          <button key={b.id} className={`bee-tile${b.id === beeId ? ' selected' : ''}`} onClick={() => setBeeId(b.id === beeId ? '' : b.id)}>
            <GenomeIcon genome={b.genome} type={b.type} size={48} />
            <span className="name">{content.species[b.genome.species[0]]?.label}</span>
            <Traits genome={b.genome} />
            <span className="count">
              {TYPE_LABELS[b.type]} ×{b.count}
            </span>
          </button>
        ))}
      </div>

      {bee && (
        <div className="lab-bench">
          <div className="card">
            <div className="title">Génome</div>
            <GenomeTable genome={bee.genome} />
          </div>
          <div className="card">
            <div className="title">Extraire un gène</div>
            <span className="muted">Sacrifie une abeille de la pile.</span>
            <select value={chromosome} aria-label="Gène à extraire" onChange={(e) => setChromosome(e.target.value)}>
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
          <div className="card">
            <div className="title">Imprimer des gènes</div>
            {Object.entries(content.chromosomes)
              .filter(([c]) => (state.genes[c] ?? []).length > 0)
              .map(([c, label]) => (
                <label key={c} className="row between">
                  <span className="muted">{label}</span>
                  <select value={genes[c] ?? ''} onChange={(e) => setGenes({ ...genes, [c]: e.target.value })}>
                    <option value="">inchangé</option>
                    {(state.genes[c] ?? []).map((allele) => (
                      <option key={allele} value={allele}>
                        {alleleLabel(content, c, allele)}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            {banked === 0 && <span className="muted">Votre banque est vide : extrayez d'abord un gène.</span>}
            <CostView cost={{ honey: content.imprint_honey_per_gene * Math.max(1, chosenCount), items: { labware: 1 } }} />
            <button
              className="primary"
              disabled={chosenCount === 0}
              onClick={async () => {
                if (await act('/genetics/imprint', { bee_id: bee.id, genes: chosen })) setBeeId('');
              }}
            >
              Imprimer
            </button>
          </div>
        </div>
      )}
    </>
  );
}
