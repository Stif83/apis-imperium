'use client';

import { useEffect, useState } from 'react';
import { CostView, GenomeIcon, Honey, ItemIcon, PageHead, TYPE_LABELS, alleleLabel, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Bee, Content, Cost } from '@/lib/types';

const OPS: Record<string, string> = { extract: 'Extraction', imprint: 'Impression', replicate: 'Réplication' };
const LEVEL_ICONS = ['🔒', '🧪', '🔬', '🧬'];
type Tab = 'extract' | 'imprint' | 'bank' | 'lab';

/** Même calcul que le serveur (lab.imprint_cost), pour afficher le prix avant de lancer. */
function imprintCost(content: Content, genes: Record<string, string>): Cost {
  const items: Record<string, number> = { labware: 1 };
  const add = (item: string, n: number) => (items[item] = (items[item] ?? 0) + n);
  for (const [c, a] of Object.entries(genes)) {
    if (c === 'species') {
      add('royal_jelly', 3);
      const comb = content.species[a]?.products.map(([item]) => item).find((item) => content.items[item]?.category === 'comb');
      if (comb) add(comb, 5);
    } else if (content.lab.rarity[c]?.[a] === 'rare') add('royal_jelly', 2);
    else if (content.lab.rarity[c]?.[a] === 'medium') add('propolis', 2);
  }
  return { honey: 50 * Object.keys(genes).length, items };
}

function useNow(serverTime: number) {
  // Horloge locale recalée sur celle du serveur, pour la barre de progression
  const [offset] = useState(() => serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}

const RARITY_LABELS: Record<string, string> = { common: 'courant', medium: 'intermédiaire', rare: 'rare', species: 'espèce' };

export default function GeneticsPage() {
  const { content, state, act } = useGame();
  const now = useNow(state.server_time);
  const lab = state.lab;
  const level = lab.level;
  const levels = content.lab.levels;
  const current = levels[String(level)];
  const [tab, setTab] = useState<Tab>(level ? 'extract' : 'lab');
  const [gene, setGene] = useState('speed');
  const [target, setTarget] = useState('');
  const [genes, setGenes] = useState<Record<string, string>>({});

  const labware = state.inventory.labware ?? 0;
  const job = lab.job;
  const busy = !!job && job.ready_ms > now;
  const bees = state.bees.filter((b) => b.hive_id === null);
  const canExtract = (c: string) => level >= 1 && (current?.extract ?? []).includes(c);
  const canImprint = (c: string) => level >= 2 && !!current?.imprint && (current?.extract ?? []).includes(c);
  const levelFor = (c: string) => Number(Object.entries(levels).find(([, l]) => l.extract.includes(c))?.[0] ?? 3);
  const geneName = (c: string, a: string) => `${content.chromosomes[c]} « ${alleleLabel(content, c, a)} »`;
  const banked = Object.values(state.gene_bank).reduce((n, list) => n + Object.keys(list).length, 0);

  const status = (
    <div className="lab-status">
      <span className="lab-level" title={level ? current.desc : 'Pas encore de laboratoire'}>
        <span style={{ fontSize: 26 }}>{LEVEL_ICONS[level]}</span>
        <span>
          <b>{level ? current.label : 'Aucun laboratoire'}</b>
          <span className="row" style={{ gap: 3 }}>
            {[1, 2, 3].map((n) => (
              <span key={n} className={`lab-pip${n <= level ? ' on' : ''}`} />
            ))}
          </span>
        </span>
      </span>
      <span className="lab-job">
        {job && busy ? (
          <>
            <span>
              <b>{OPS[job.op]}</b>
              {job.chromosome && job.allele && <span className="muted"> · {geneName(job.chromosome, job.allele)}</span>}
              <span className="muted"> · encore {Math.max(0, Math.ceil((job.ready_ms - now) / 1000))} s</span>
            </span>
            <span className="bar">
              <span style={{ display: 'block', height: '100%', background: 'var(--accent)', width: `${Math.min(100, (100 * (now - job.start_ms)) / (job.ready_ms - job.start_ms))}%` }} />
            </span>
          </>
        ) : (
          <span className="muted">{lab.log[0] ?? 'Paillasse libre.'}</span>
        )}
      </span>
      <span className="row">
        <span className="chip" title="Verrerie de laboratoire : une par opération">
          <ItemIcon id="labware" size={16} /> ×{fmt(labware)}
        </span>
        <button className="small" onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 1 })}>
          +1 (<Honey amount={state.offers['item:labware'].cost.honey} />)
        </button>
        <button className="small" onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 10 })}>
          +10
        </button>
      </span>
    </div>
  );

  const tabs: { id: Tab; label: string; lock?: string }[] = [
    { id: 'extract', label: 'Extraire', lock: level < 1 ? 'Niveau 1' : undefined },
    { id: 'imprint', label: 'Imprimer', lock: level < 2 ? 'Niveau 2' : undefined },
    { id: 'bank', label: `Banque · ${banked}`, lock: level < 1 ? 'Niveau 1' : undefined },
    { id: 'lab', label: 'Laboratoire' },
  ];
  const active = tabs.find((t) => t.id === tab)?.lock ? 'lab' : tab;

  // ---- Extraire : on choisit le gène, puis l'abeille qui le porte
  const extractTab = () => {
    const chosen = canExtract(gene) ? gene : current.extract[0];
    const rows = bees
      .map((b) => {
        const allele = b.genome[chosen]?.[0] ?? '';
        const need = content.lab.fragments[chosen]?.[allele] ?? 2;
        return { bee: b, allele, need, got: lab.fragments[`${chosen}:${allele}`] ?? 0, doses: state.gene_bank[chosen]?.[allele] };
      })
      .sort((x, y) => x.allele.localeCompare(y.allele));
    return (
      <div className="stack">
        <div className="step">
          <span className="step-n">1</span>
          <b>Quel gène voulez-vous récupérer ?</b>
        </div>
        <div className="row">
          {Object.entries(content.chromosomes).map(([c, label]) => (
            <button
              key={c}
              className={`chip pick${c === chosen ? ' selected' : ''}`}
              disabled={!canExtract(c)}
              title={canExtract(c) ? undefined : `Laboratoire niveau ${levelFor(c)} (${levels[String(levelFor(c))].label})`}
              onClick={() => setGene(c)}
            >
              {!canExtract(c) && '🔒 '}
              {label}
            </button>
          ))}
        </div>
        <div className="step">
          <span className="step-n">2</span>
          <b>Quelle abeille sacrifier ?</b>
          <span className="muted">
            Chacune donne un fragment de son gène actif · {Math.round(content.lab.extract_fail * 100)} % d'échec ·{' '}
            {content.lab.extract_seconds / 60} min · 1 verrerie
          </span>
        </div>
        {rows.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
        <div className="bee-rows">
          {rows.map(({ bee, allele, need, got, doses }) => (
            <div key={bee.id} className="bee-row">
              <GenomeIcon genome={bee.genome} type={bee.type} size={36} />
              <span className="grow">
                <b>{content.species[bee.genome.species[0]]?.label}</b>
                <span className="muted">
                  {' '}
                  · {TYPE_LABELS[bee.type]} ×{bee.count}
                </span>
              </span>
              <span className="chip" title={`Gène ${RARITY_LABELS[content.lab.rarity[chosen]?.[allele] ?? 'species']}`}>
                {alleleLabel(content, chosen, allele)}
              </span>
              <span className="frag" title={`${got} fragment${got > 1 ? 's' : ''} sur ${need}`}>
                {Array.from({ length: need }, (_, i) => (
                  <i key={i} className={i < got ? 'on' : ''} />
                ))}
              </span>
              {doses !== undefined && <span className="badge ok" title="Déjà dans la banque">×{doses}</span>}
              <button
                className="primary compact"
                disabled={busy || labware < 1}
                onClick={() => act('/genetics/extract', { bee_id: bee.id, chromosome: chosen })}
              >
                Extraire
              </button>
            </div>
          ))}
        </div>
        {labware < 1 && <span className="lacking">Il faut une verrerie de laboratoire.</span>}
      </div>
    );
  };

  // ---- Imprimer : on choisit l'abeille, puis les gènes de la banque
  const imprintTab = () => {
    const bee: Bee | undefined = bees.find((b) => b.id === target);
    const chosen = Object.fromEntries(Object.entries(genes).filter(([c, a]) => a && canImprint(c)));
    const usable = Object.entries(content.chromosomes).filter(
      ([c]) => canImprint(c) && Object.values(state.gene_bank[c] ?? {}).some((d) => d > 0),
    );
    return (
      <div className="imprint-layout">
        <div className="stack">
          <div className="step">
            <span className="step-n">1</span>
            <b>L'abeille à modifier</b>
          </div>
          <div className="bee-rows">
            {bees.map((b) => (
              <button key={b.id} className={`bee-row pickable${b.id === target ? ' selected' : ''}`} onClick={() => setTarget(b.id)}>
                <GenomeIcon genome={b.genome} type={b.type} size={32} />
                <span className="grow">
                  <b>{content.species[b.genome.species[0]]?.label}</b>
                  <span className="muted">
                    {' '}
                    · {TYPE_LABELS[b.type]} ×{b.count}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
        <div className="stack">
          <div className="step">
            <span className="step-n">2</span>
            <b>Les gènes à imprimer</b>
            <span className="muted">Seule la copie active change : croisez ensuite l'abeille pour fixer le caractère.</span>
          </div>
          {usable.length === 0 && <div className="notice">Votre banque n'a aucune dose disponible. Complétez un gène dans l'onglet Extraire.</div>}
          {!bee && usable.length > 0 && <div className="notice">Choisissez d'abord une abeille à gauche.</div>}
          {bee && usable.length > 0 && (
            <div className="card">
              <table className="genome">
                <thead>
                  <tr>
                    <th />
                    <th>Actuel</th>
                    <th>Nouveau</th>
                  </tr>
                </thead>
                <tbody>
                  {usable.map(([c, label]) => (
                    <tr key={c}>
                      <th>{label}</th>
                      <td>{alleleLabel(content, c, bee.genome[c][0])}</td>
                      <td>
                        <select value={genes[c] ?? ''} aria-label={label} onChange={(e) => setGenes({ ...genes, [c]: e.target.value })}>
                          <option value="">inchangé</option>
                          {Object.entries(state.gene_bank[c] ?? {})
                            .filter(([, d]) => d > 0)
                            .map(([allele, d]) => (
                              <option key={allele} value={allele}>
                                {alleleLabel(content, c, allele)} (×{d})
                              </option>
                            ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="row between">
                <CostView cost={imprintCost(content, chosen)} />
                <button
                  className="primary"
                  disabled={Object.keys(chosen).length === 0 || busy}
                  onClick={async () => {
                    if (await act('/genetics/imprint', { bee_id: bee.id, genes: chosen })) {
                      setTarget('');
                      setGenes({});
                    }
                  }}
                >
                  Imprimer ({content.lab.imprint_seconds / 60} min)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ---- Banque : gènes complets, doses, réplication, fragments en cours
  const bankTab = () => {
    const pending = Object.entries(lab.fragments);
    return (
      <div className="stack">
        <div className="gene-bank">
          {Object.entries(content.chromosomes).map(([c, label]) => (
            <div key={c} className="gene-row">
              <span className="muted">{label}</span>
              <span className="row" style={{ gap: 4 }}>
                {Object.keys(state.gene_bank[c] ?? {}).length === 0 && <span className="muted">—</span>}
                {Object.entries(state.gene_bank[c] ?? {}).map(([allele, doses]) => (
                  <span key={allele} className={`chip${doses ? '' : ' empty'}`}>
                    {alleleLabel(content, c, allele)} <b>×{doses}</b>
                    {level >= 2 && (
                      <button className="small" title="Répliquer : +3 doses" disabled={busy} onClick={() => act('/genetics/replicate', { chromosome: c, allele })}>
                        +
                      </button>
                    )}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
        <span className="muted">
          ×N = doses restantes, une par impression. {level >= 2 ? 'Le bouton + réplique un gène (+3 doses).' : 'La réplication arrive au niveau 2.'}
        </span>
        <h2>Fragments en cours</h2>
        {pending.length === 0 && <p className="muted">Aucun gène commencé.</p>}
        <div className="bee-rows">
          {pending.map(([key, n]) => {
            const [c, a] = key.split(':');
            const need = content.lab.fragments[c]?.[a] ?? 2;
            return (
              <div key={key} className="bee-row">
                <span className="grow">{geneName(c, a)}</span>
                <span className="frag">
                  {Array.from({ length: need }, (_, i) => (
                    <i key={i} className={i < n ? 'on' : ''} />
                  ))}
                </span>
                <span className="muted">
                  {n} / {need}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ---- Laboratoire : les trois niveaux et le journal
  const labTab = () => (
    <div className="stack">
      <div className="lab-ladder">
        {[1, 2, 3].map((n) => {
          const l = levels[String(n)];
          const done = n <= level;
          const nextUp = n === level + 1;
          return (
            <div key={n} className={`card lab-step${done ? ' done' : ''}${nextUp ? ' next' : ''}`}>
              <div className="row between">
                <span className="title">
                  {LEVEL_ICONS[n]} Niveau {n} · {l.label}
                </span>
                {done && <span className="stamp">Construit</span>}
              </div>
              <span className="muted">{l.desc}</span>
              {!done && (
                <>
                  <span className={state.discovered.length < l.min_species ? 'lacking' : 'muted'}>
                    {state.discovered.length} / {l.min_species} espèces découvertes
                  </span>
                  <CostView cost={l.cost} />
                  {nextUp && (
                    <button className="primary" disabled={state.discovered.length < l.min_species} onClick={() => act('/genetics/upgrade')}>
                      {level ? 'Améliorer' : 'Construire'}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      <h2>Journal</h2>
      {lab.log.length === 0 && <p className="muted">Aucune opération pour l'instant.</p>}
      <div className="bee-rows">
        {lab.log.map((line, i) => (
          <div key={i} className="bee-row">
            {line}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <PageHead title="Génétique">
        Le laboratoire se construit en trois niveaux. <b>Extraire</b> sacrifie une abeille et donne un fragment de son gène actif ;
        il faut réunir 2 à 8 fragments selon la rareté, et une extraction sur trois échoue. Un gène complet offre {content.lab.doses}{' '}
        doses. <b>Imprimer</b> (niveau 2) remplace la copie active d'un gène et consomme une dose. Une seule opération à la fois.
      </PageHead>
      {status}
      <div className="row tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            className={`tab${active === t.id ? ' active' : ''}`}
            disabled={!!t.lock}
            title={t.lock ? `Disponible au ${t.lock.toLowerCase()}` : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.lock && '🔒 '}
            {t.label}
          </button>
        ))}
      </div>
      {active === 'extract' && extractTab()}
      {active === 'imprint' && imprintTab()}
      {active === 'bank' && bankTab()}
      {active === 'lab' && labTab()}
    </>
  );
}
