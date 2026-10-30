'use client';

import { useEffect, useMemo, useState } from 'react';
import { BeeSearch, CostView, GenesTip, GenomeIcon, Honey, ItemIcon, PageHead, Switch } from '@/components/ui';
import { SHORT, canAfford, fmt } from '@/lib/format';
import { TYPE_LABELS, alleleLabel, beeMatches } from '@/lib/bees';
import { useGame } from '@/lib/game';
import { keyed } from '@/lib/keys';
import type { Bee, Content, Cost, GameState } from '@/lib/types';

const OPS: Record<string, string> = { extract: 'Extraction', imprint: 'Impression', replicate: 'Réplication' };
const OP_ICONS: Record<string, string> = { extract: '🧪', imprint: '💉', replicate: '🧫' };
const LEVEL_ICONS = ['🔒', '🧪', '🔬', '🧬'];
type Tab = 'extract' | 'imprint' | 'bank' | 'lab';
type Job = GameState['lab']['jobs'][number];

/** Même calcul que le serveur (lab.imprint_cost), à partir de la table de prix du contenu. */
function imprintCost(content: Content, genes: Record<string, string>): Cost {
  const table = content.lab.imprint;
  const items: Record<string, number> = { labware: table.labware };
  const add = (item: string, n: number) => (items[item] = (items[item] ?? 0) + n);
  let honey = 0;
  for (const [c, a] of Object.entries(genes)) {
    const cost = table.costs[c === 'species' ? 'species' : (content.lab.rarity[c]?.[a] ?? 'common')];
    honey += cost.honey;
    for (const [item, n] of Object.entries(cost.items ?? {})) add(item, n);
    if (c === 'species') {
      const comb = content.species[a]?.products.map(([item]) => item).find((item) => content.items[item]?.category === 'comb');
      if (comb) add(comb, table.species_combs);
    }
  }
  return { honey, items };
}

/** Même calcul que le serveur (lab.replicate_cost). */
const replicateCost = (need: number): Cost => ({ honey: 100 * need, items: { labware: 2, royal_jelly: 1 } });

/** Fragments nécessaires pour compléter un gène. */
const needOf = (content: Content, c: string, a: string) => content.lab.fragments[c]?.[a] ?? 2;
const rarityOf = (content: Content, c: string, a: string) => (c === 'species' ? 'species' : (content.lab.rarity[c]?.[a] ?? 'common'));
const duration = (s: number) => (s >= 60 ? `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}` : `${s} s`);

function useNow(serverTime: number) {
  // Horloge locale recalée sur celle du serveur, pour les barres de progression
  const [offset] = useState(() => serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}

/** Niveau du laboratoire et gènes qu'il permet de manipuler, partagés par la page et ses onglets. */
function useLab() {
  const { content, state } = useGame();
  const lab = state.lab;
  const level = lab.level;
  const levels = content.lab.levels;
  const current = levels[String(level)];
  const extractable = current?.extract ?? [];
  return {
    lab,
    level,
    levels,
    current,
    canExtract: (c: string) => level >= 1 && extractable.includes(c),
    canImprint: (c: string) => level >= 2 && !!current?.imprint && extractable.includes(c),
    levelFor: (c: string) => Number(Object.entries(levels).find(([, l]) => l.extract.includes(c))?.[0] ?? 3),
  };
}

const RARITY_LABELS: Record<string, string> = { common: 'Courant', medium: 'Intermédiaire', rare: 'Rare', species: 'Espèce' };

function Progress({ got, need }: { got: number; need: number }) {
  return (
    <span className="gene-progress" title={`${got} fragment${got > 1 ? 's' : ''} sur ${need}`}>
      <span className="bar">
        <span style={{ width: `${(100 * got) / need}%` }} />
      </span>
      <span className="muted">
        {got} / {need}
      </span>
    </span>
  );
}

/** Une paillasse occupée : l'opération en cours et sa progression. */
function BenchJob({ job, now }: { job: Job; now: number }) {
  const { content, act } = useGame();
  const { lab } = useLab();
  const left = Math.max(0, Math.ceil((job.ready_ms - now) / 1000));
  return (
    <div className="bench">
      <span className="bench-icon">{job.chain ? '🔁' : OP_ICONS[job.op]}</span>
      <span className="grow" style={{ minWidth: 0 }}>
        <b>{OPS[job.op]}</b>
        {job.chromosome && job.allele && (
          <span className="muted bench-gene">
            {content.chromosomes[job.chromosome]} « {alleleLabel(content, job.chromosome, job.allele)} »
          </span>
        )}
        <span className="bar">
          <span style={{ width: `${Math.min(100, (100 * (now - job.start_ms)) / (job.ready_ms - job.start_ms))}%` }} />
        </span>
      </span>
      <span className="bench-time">{duration(left)}</span>
      {lab.chain && job.op === 'extract' && job.bee_hash && (
        <Switch
          on={!!job.chain}
          onChange={(on) => act('/genetics/chain', { job_id: job.id, on })}
          label="🔁"
          title={job.chain ? 'Chaîne active : couper pour s’arrêter après cette extraction' : 'Enchaîner sur les abeilles identiques'}
        />
      )}
    </div>
  );
}

/** Panneau latéral, toujours visible : paillasses, verrerie, journal. */
function LabAside({ jobs, now }: { jobs: Job[]; now: number }) {
  const { state, act } = useGame();
  const { lab, level, current } = useLab();
  const labware = state.inventory.labware ?? 0;
  const labwareCost = state.offers['item:labware'].cost;
  // Paillasses numérotées : chacune garde sa place, occupée ou libre
  const benches = Array.from({ length: lab.benches }, (_, bench) => ({ bench, job: jobs[bench] }));
  return (
    <aside className="lab-aside">
      <div className="card stack">
        <div className="row between">
          <span className="lab-level">
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
          {lab.chain && <span className="badge info" title="Passeur d'échantillons installé">🔁 Chaîne</span>}
        </div>

        <div className="title">Paillasses</div>
        {benches.map(({ bench, job }) =>
          job ? (
            <BenchJob key={bench} job={job} now={now} />
          ) : (
            <div key={bench} className="bench free">
              <span className="bench-icon">🧪</span>
              <span className="muted">Paillasse libre</span>
            </div>
          ),
        )}

        <div className="row between">
          <span className="chip" title="Verrerie de laboratoire : une par opération">
            <ItemIcon id="labware" size={16} /> Verrerie ×{fmt(labware)}
          </span>
          <span className="row" style={{ gap: 4 }}>
            <button
              className="small"
              onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 1 })}
              disabled={level < 1 || !canAfford(state, labwareCost)}
            >
              +1 (<Honey amount={labwareCost.honey} />)
            </button>
            <button
              className="small"
              onClick={() => act('/shop/buy', { offer_id: 'item:labware', qty: 10 })}
              disabled={level < 1 || !canAfford(state, labwareCost, 10)}
            >
              +10
            </button>
          </span>
        </div>
      </div>

      <div className="card stack lab-journal">
        <div className="title">Journal</div>
        {lab.log.length === 0 && <span className="muted">Aucune opération pour l'instant.</span>}
        <ul className="lab-log">
          {keyed(lab.log, (line) => line).map(({ item: line, key }) => (
            <li key={key}>{line}</li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

/** Carte d'une valeur de gène : fragments réunis et abeilles qui la portent, à sacrifier une par une. */
function AlleleCard({ chromosome, allele, list, busy, chain }: { chromosome: string; allele: string; list: Bee[]; busy: boolean; chain: boolean }) {
  const { content, state, act } = useGame();
  const labware = state.inventory.labware ?? 0;
  const got = state.lab.fragments[`${chromosome}:${allele}`] ?? 0;
  const doses = state.gene_bank[chromosome]?.[allele];
  const kind = rarityOf(content, chromosome, allele);
  return (
    <div className={`card allele-card ${kind}`}>
      <div className="row between">
        <span className="title">{alleleLabel(content, chromosome, allele)}</span>
        <span className={`badge rarity ${kind}`}>{RARITY_LABELS[kind]}</span>
      </div>
      <div className="row between">
        <Progress got={got} need={needOf(content, chromosome, allele)} />
        {doses !== undefined && (
          <span className="badge ok" title="Doses déjà en banque">
            En banque ×{doses}
          </span>
        )}
      </div>
      <div className="allele-bees">
        {list.map((bee) => (
          <div key={bee.id} className="allele-bee">
            <GenomeIcon genome={bee.genome} type={bee.type} size={28} />
            <span className="grow" title={`${TYPE_LABELS[bee.type]} ×${bee.count}`}>
              {content.species[bee.genome.species[0]]?.label}
              <span className="muted">
                {' '}
                {bee.type === 'princess' ? '♀' : '♂'} ×{bee.count}
              </span>
            </span>
            <button
              className="small"
              disabled={busy || labware < 1}
              title={busy ? 'Toutes les paillasses sont occupées' : undefined}
              onClick={() => act('/genetics/extract', { bee_id: bee.id, chromosome, chain })}
            >
              {chain ? '🔁 Extraire' : 'Extraire'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const RARITY_ORDER: Record<string, number> = { rare: 0, medium: 1, species: 1, common: 2 };

/** Extraire : une carte par valeur du gène choisi, avec les abeilles qui la portent. */
function ExtractTab({
  busy,
  gene,
  onGene,
  chain,
  onChain,
}: {
  busy: boolean;
  gene: string;
  onGene: (gene: string) => void;
  chain: boolean;
  onChain: (on: boolean) => void;
}) {
  const { content, state } = useGame();
  const { lab, levels, current, canExtract, levelFor } = useLab();
  const labware = state.inventory.labware ?? 0;
  const chosen = canExtract(gene) ? gene : current.extract[0];

  const groups = useMemo(() => {
    const map = new Map<string, Bee[]>();
    for (const b of state.bees) {
      const allele = b.hive_id === null ? b.genome[chosen]?.[0] : undefined;
      if (allele) map.set(allele, [...(map.get(allele) ?? []), b]);
    }
    return [...map.entries()]
      .map(([allele, list]) => ({
        allele,
        // Faux-bourdons d'abord : ce sont eux qu'on sacrifie le plus volontiers
        list: list.sort((x, y) => (x.type === y.type ? y.count - x.count : x.type === 'drone' ? -1 : 1)),
      }))
      .sort(
        (x, y) =>
          RARITY_ORDER[rarityOf(content, chosen, x.allele)] - RARITY_ORDER[rarityOf(content, chosen, y.allele)] ||
          x.allele.localeCompare(y.allele),
      );
  }, [state.bees, chosen, content]);

  return (
    <div className="stack">
      <div className="row" role="radiogroup" aria-label="Gène à extraire">
        {Object.entries(content.chromosomes).map(([c, label]) => (
          <button
            key={c}
            role="radio"
            aria-checked={c === chosen}
            className={`chip pick${c === chosen ? ' selected' : ''}`}
            disabled={!canExtract(c)}
            title={canExtract(c) ? undefined : `Laboratoire niveau ${levelFor(c)} (${levels[String(levelFor(c))].label})`}
            onClick={() => onGene(c)}
          >
            {!canExtract(c) && '🔒 '}
            {label}
          </button>
        ))}
      </div>
      <div className="lab-hint">
        <span>
          Chaque extraction sacrifie une abeille et donne un fragment de son gène actif · {Math.round(content.lab.extract_fail * 100)} %
          d'échec · {content.lab.extract_seconds / 60} min · 1 verrerie
        </span>
        {lab.chain ? (
          <span className="row" style={{ gap: 6 }}>
            <Switch on={chain} onChange={onChain} label={<b>🔁 En chaîne</b>} />
            <span className="muted">jusqu'au gène complet</span>
          </span>
        ) : (
          <span className="muted">🔁 L'extraction en chaîne s'obtient avec le passeur d'échantillons (onglet Améliorer).</span>
        )}
      </div>
      {groups.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
      {labware < 1 && <div className="notice">Il faut une verrerie de laboratoire pour extraire (panneau de droite).</div>}
      <div className="allele-grid">
        {groups.map(({ allele, list }) => (
          <AlleleCard key={allele} chromosome={chosen} allele={allele} list={list} busy={busy} chain={lab.chain && chain} />
        ))}
      </div>
    </div>
  );
}

/** Une ligne d'impression : la copie active du gène, et les doses de la banque qui peuvent la remplacer. */
function ImprintRow({ bee, chromosome, label, pick, onPick }: { bee: Bee; chromosome: string; label: string; pick?: string; onPick: (allele: string) => void }) {
  const { content, state } = useGame();
  const active = bee.genome[chromosome][0];
  return (
    <div className="imprint-row">
      <span className="imprint-label">{label}</span>
      <span className="imprint-current">
        {alleleLabel(content, chromosome, active)}
        {pick && (
          <>
            {' '}
            → <b>{alleleLabel(content, chromosome, pick)}</b>
          </>
        )}
      </span>
      <span className="row" style={{ gap: 4 }}>
        {Object.entries(state.gene_bank[chromosome] ?? {})
          .filter(([, d]) => d > 0)
          .map(([allele, d]) => (
            <button
              key={allele}
              className={`chip pick${pick === allele ? ' selected' : ''}`}
              disabled={allele === active}
              title={allele === active ? 'Déjà sa copie active' : `${d} dose${d > 1 ? 's' : ''}`}
              onClick={() => onPick(pick === allele ? '' : allele)}
            >
              {alleleLabel(content, chromosome, allele)} ×{d}
            </button>
          ))}
      </span>
    </div>
  );
}

/** Imprimer : l'abeille en vignette, puis les gènes de la banque en pastilles. */
function ImprintTab({
  busy,
  target,
  onTarget,
  genes,
  onGenes,
  query,
  onQuery,
}: {
  busy: boolean;
  target: string;
  onTarget: (id: string) => void;
  genes: Record<string, string>;
  onGenes: (genes: Record<string, string>) => void;
  query: string;
  onQuery: (query: string) => void;
}) {
  const { content, state, act } = useGame();
  const { canImprint } = useLab();
  const bees = state.bees.filter((b) => b.hive_id === null);
  const bee = bees.find((b) => b.id === target);
  const chosen = Object.fromEntries(Object.entries(genes).filter(([c, a]) => a && canImprint(c)));
  const cost = imprintCost(content, chosen);
  const picked = Object.keys(chosen).length > 0;
  const usable = Object.entries(content.chromosomes).filter(([c]) => canImprint(c) && Object.values(state.gene_bank[c] ?? {}).some((d) => d > 0));
  const shownBees = bees.filter((b) => beeMatches(content, b, query));
  return (
    <div className="imprint-layout">
      <div className="stack">
        <div className="title">1 · L'abeille à modifier</div>
        {bees.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
        {bees.length > 0 && <BeeSearch value={query} onChange={onQuery} shown={shownBees.length} total={bees.length} />}
        <div className="bee-tiles">
          {shownBees.map((b) => (
            <span key={b.id} className="tile-wrap">
              <button
                className={`bee-tile-pick${b.id === target ? ' selected' : ''}`}
                onClick={() => {
                  onTarget(b.id);
                  onGenes({});
                }}
              >
                <GenomeIcon genome={b.genome} type={b.type} size={36} />
                <span>{content.species[b.genome.species[0]]?.label}</span>
                <span className="muted">
                  {TYPE_LABELS[b.type]} ×{b.count}
                </span>
              </button>
              <GenesTip genome={b.genome} />
            </span>
          ))}
          {shownBees.length === 0 && bees.length > 0 && <p className="muted">Aucune abeille ne correspond.</p>}
        </div>
      </div>

      <div className="stack">
        <div className="title">2 · Les gènes à imprimer</div>
        <span className="muted">Seule la copie active change : croisez ensuite l'abeille pour fixer le caractère.</span>
        {usable.length === 0 && <div className="notice">Votre banque n'a aucune dose disponible. Complétez un gène dans l'onglet Extraire.</div>}
        {!bee && usable.length > 0 && <div className="notice">Choisissez d'abord une abeille.</div>}
        {bee && usable.length > 0 && (
          <div className="card stack">
            <div className="row">
              <GenomeIcon genome={bee.genome} type={bee.type} size={40} />
              <b>
                {content.species[bee.genome.species[0]]?.label} · {TYPE_LABELS[bee.type]}
              </b>
            </div>
            {usable.map(([c, label]) => (
              <ImprintRow key={c} bee={bee} chromosome={c} label={label} pick={genes[c]} onPick={(allele) => onGenes({ ...genes, [c]: allele })} />
            ))}
            <div className="row between">
              <CostView cost={cost} />
              <button
                className="primary"
                disabled={!picked || busy || !canAfford(state, cost)}
                title={picked && !canAfford(state, cost) ? SHORT : undefined}
                onClick={async () => {
                  if (await act('/genetics/imprint', { bee_id: bee.id, genes: chosen })) {
                    onTarget('');
                    onGenes({});
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
}

/** Banque d'un chromosome : les gènes complets (avec leurs doses) et les fragments en cours. */
function BankCard({ chromosome, label, busy }: { chromosome: string; label: string; busy: boolean }) {
  const { content, state, act } = useGame();
  const { lab, level, canExtract, levelFor } = useLab();
  const c = chromosome;
  const done = Object.entries(state.gene_bank[c] ?? {});
  const started = Object.entries(lab.fragments)
    .filter(([key]) => key.startsWith(`${c}:`))
    .map(([key, n]) => [key.slice(c.length + 1), n] as const);
  return (
    <div className={`card bank-card${done.length || started.length ? '' : ' empty'}`}>
      <div className="row between">
        <span className="title">{label}</span>
        {!canExtract(c) && <span className="muted">🔒 Niveau {levelFor(c)}</span>}
      </div>
      {done.length === 0 && started.length === 0 && <span className="muted">Aucun gène.</span>}
      {done.map(([allele, doses]) => {
        const cost = replicateCost(needOf(content, c, allele));
        return (
          <div key={allele} className="bank-row">
            <span className="grow">{alleleLabel(content, c, allele)}</span>
            <span className={`badge${doses ? ' ok' : ''}`}>×{doses}</span>
            {level >= 2 && (
              <button
                className="small"
                disabled={busy || !canAfford(state, cost)}
                title={`Répliquer : +${content.lab.doses} doses · ${cost.honey} miel, 2 verreries, 1 gelée royale`}
                onClick={() => act('/genetics/replicate', { chromosome: c, allele })}
              >
                +{content.lab.doses}
              </button>
            )}
          </div>
        );
      })}
      {started.map(([allele, n]) => (
        <div key={allele} className="bank-row pending">
          <span className="grow">{alleleLabel(content, c, allele)}</span>
          <Progress got={n} need={needOf(content, c, allele)} />
        </div>
      ))}
    </div>
  );
}

/** Banque : par chromosome, les gènes complets et les fragments en cours. */
function BankTab({ busy }: { busy: boolean }) {
  const { content } = useGame();
  const { level } = useLab();
  return (
    <div className="stack">
      <span className="muted">
        ×N = doses restantes, une par impression.{' '}
        {level >= 2 ? 'La réplication ajoute 3 doses à un gène déjà en banque.' : 'La réplication arrive au niveau 2.'}
      </span>
      <div className="bank-grid">
        {Object.entries(content.chromosomes).map(([c, label]) => (
          <BankCard key={c} chromosome={c} label={label} busy={busy} />
        ))}
      </div>
    </div>
  );
}

/** Un niveau du laboratoire : construit, prochain à construire, ou encore hors de portée. */
function LevelStep({ n }: { n: number }) {
  const { state, act } = useGame();
  const { level, levels } = useLab();
  const l = levels[String(n)];
  const done = n <= level;
  const nextUp = n === level + 1;
  const enough = state.discovered.length >= l.min_species;
  return (
    <div className={`card lab-step${done ? ' done' : ''}${nextUp ? ' next' : ''}`}>
      <div className="row between">
        <span className="title">
          {LEVEL_ICONS[n]} Niveau {n} · {l.label}
        </span>
        {done && <span className="stamp">Construit</span>}
      </div>
      <span className="muted">{l.desc}</span>
      {!done && (
        <>
          <span className={enough ? 'muted' : 'lacking'}>
            {state.discovered.length} / {l.min_species} espèces découvertes
          </span>
          <CostView cost={l.cost} />
          {nextUp && (
            <button
              className="primary"
              disabled={!enough || !canAfford(state, l.cost)}
              title={canAfford(state, l.cost) ? undefined : SHORT}
              onClick={() => act('/genetics/upgrade')}
            >
              {level ? 'Améliorer' : 'Construire'}
            </button>
          )}
        </>
      )}
    </div>
  );
}

/** Équipement du laboratoire : paillasse supplémentaire ou passeur d'échantillons. */
function Equipment({ id }: { id: 'lab_bench' | 'lab_chain' }) {
  const { content, state, act } = useGame();
  const offer = state.offers[`machine:${id}`];
  const owned = state.machines[id] ?? 0;
  return (
    <div className="card lab-step">
      <div className="row between">
        <span className="title">
          {id === 'lab_bench' ? '🧪' : '🔁'} {content.machines[id].label}
        </span>
        {owned > 0 && <span className="badge ok">{id === 'lab_bench' ? `×${owned}` : 'Installé'}</span>}
      </div>
      <span className="muted">{content.machines[id].desc}</span>
      {offer.lock ? (
        <span className="muted">{offer.lock}</span>
      ) : (
        <>
          <CostView cost={offer.cost} />
          <button
            className="primary"
            disabled={!canAfford(state, offer.cost)}
            title={canAfford(state, offer.cost) ? undefined : SHORT}
            onClick={() => act('/shop/buy', { offer_id: `machine:${id}` })}
          >
            Acheter
          </button>
        </>
      )}
    </div>
  );
}

/** Améliorer : les trois niveaux et l'équipement. */
function LabTab() {
  const { level } = useLab();
  return (
    <div className="stack">
      <div className="lab-ladder">
        {[1, 2, 3].map((n) => (
          <LevelStep key={n} n={n} />
        ))}
      </div>
      {level >= 1 && (
        <>
          <h2>Équipement</h2>
          <div className="lab-ladder">
            <Equipment id="lab_bench" />
            <Equipment id="lab_chain" />
          </div>
        </>
      )}
    </div>
  );
}

export default function GeneticsPage() {
  const { content, state } = useGame();
  const now = useNow(state.server_time);
  const { lab, level } = useLab();
  const [tab, setTab] = useState<Tab>(level ? 'extract' : 'lab');
  // Choix gardés d'un onglet à l'autre
  const [gene, setGene] = useState('speed');
  const [chain, setChain] = useState(true);
  const [target, setTarget] = useState('');
  const [beeQuery, setBeeQuery] = useState('');
  const [genes, setGenes] = useState<Record<string, string>>({});

  // Une opération terminée reste listée jusqu'au prochain rafraîchissement : on ne garde que celles en cours
  const jobs = lab.jobs.filter((j) => j.ready_ms > now);
  const busy = jobs.length >= lab.benches;
  const freeIn = busy ? Math.max(0, Math.ceil((Math.min(...jobs.map((j) => j.ready_ms)) - now) / 1000)) : 0;
  const banked = Object.values(state.gene_bank).reduce((n, list) => n + Object.keys(list).length, 0);
  const pending = Object.keys(lab.fragments).length;

  const tabs: { id: Tab; label: string; lock?: string }[] = [
    { id: 'extract', label: 'Extraire', lock: level < 1 ? 'Niveau 1' : undefined },
    { id: 'imprint', label: 'Imprimer', lock: level < 2 ? 'Niveau 2' : undefined },
    { id: 'bank', label: `Banque · ${banked}${pending ? ` (+${pending})` : ''}`, lock: level < 1 ? 'Niveau 1' : undefined },
    { id: 'lab', label: 'Améliorer' },
  ];
  const active = tabs.find((t) => t.id === tab)?.lock ? 'lab' : tab;

  return (
    <>
      <PageHead guide="laboratoire" title="Laboratoire">
        <b>Extraire</b> sacrifie une abeille pour un fragment de son gène actif ; il faut 2 à 8 fragments selon la rareté pour compléter un
        gène, qui offre alors {content.lab.doses} doses. <b>Imprimer</b> (niveau 2) remplace la copie active d'un gène d'une abeille et
        consomme une dose. Chaque paillasse mène une opération à la fois.
      </PageHead>
      <div className="lab-layout">
        <div className="stack" style={{ minWidth: 0 }}>
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
          {busy && active !== 'lab' && (
            <div className="notice">
              Toutes les paillasses sont occupées : la prochaine se libère dans {duration(freeIn)}.
              {lab.benches < 5 && ' Une paillasse de plus s’achète dans l’onglet Améliorer.'}
            </div>
          )}
          {active === 'extract' && <ExtractTab busy={busy} gene={gene} onGene={setGene} chain={chain} onChain={setChain} />}
          {active === 'imprint' && (
            <ImprintTab busy={busy} target={target} onTarget={setTarget} genes={genes} onGenes={setGenes} query={beeQuery} onQuery={setBeeQuery} />
          )}
          {active === 'bank' && <BankTab busy={busy} />}
          {active === 'lab' && <LabTab />}
        </div>
        <LabAside jobs={jobs} now={now} />
      </div>
    </>
  );
}
