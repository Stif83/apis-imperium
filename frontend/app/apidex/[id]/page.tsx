'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { BeePortrait } from '@/components/BeePortrait';
import { Family, MiniBee, Outputs } from '@/components/apidex';
import { BRANCH_LORE, computeTiers } from '@/lib/apidex';
import { fmt, percent } from '@/lib/format';
import { ItemQty } from '@/components/ui';
import { alleleLabel, notableTraits } from '@/lib/bees';
import { useGame } from '@/lib/game';
import { LORE } from '@/lib/lore';
import type { BeeType, Species } from '@/lib/types';

const TYPES: [BeeType, string][] = [
  ['queen', 'Reine'],
  ['princess', 'Princesse'],
  ['drone', 'Faux-bourdon'],
];

/** Chips de l'en-tête : climat, palier, pedigree et traits remarquables. */
function HeroChips({ id, species }: { id: string; species: Species }) {
  const { content, state } = useGame();
  const tiers = useMemo(() => computeTiers(content), [content]);
  const genome = Object.fromEntries(Object.entries(species.template).map(([c, a]) => [c, [a, a] as [string, string]]));
  // Traits remarquables, écrits en clair dans l'en-tête (l'activité est déjà dans le tableau)
  const traits = notableTraits(content, genome).filter((t) => !t.label.startsWith(content.chromosomes.activity));
  const certified = state.pedigree?.[id] ?? 0;
  const origin = species.wild ? '🧭 Espèce sauvage' : tiers[id] === 0 ? '🛒 Espèce de base' : `🧬 Palier ${tiers[id]}`;
  return (
    <div className="row">
      <span className="chip">🌡️ Climat {content.temp_labels[species.temp].toLowerCase()}</span>
      <span className="chip">{origin}</span>
      {certified > 0 && (
        <span className="chip" title="Meilleur pedigree certifié pour cette espèce">
          {content.trophies.pedigree[String(certified)].icon} Pedigree {content.trophies.pedigree[String(certified)].label}
        </span>
      )}
      {traits.map((t) => (
        <span key={t.label} className="chip">
          {t.icon} {t.label}
        </span>
      ))}
    </div>
  );
}

function BeeHero({ id, species, known }: { id: string; species: Species; known: boolean }) {
  return (
    <div
      className="card bee-hero"
      style={known ? { background: `linear-gradient(110deg, #${species.color}40, var(--panel) 55%, #${species.secondary}30)` } : undefined}
    >
      <BeeIcon species={id} color={species.color} secondary={species.secondary} type="queen" size={72} unknown={!known} />
      <div className="grow stack" style={{ gap: 6 }}>
        <div>
          <h1>{known ? species.label : '???'}</h1>
          <div className="muted">{known ? `Branche des ${species.branch.toLowerCase()}` : 'Espèce encore inconnue'}</div>
        </div>
        {known && <HeroChips id={id} species={species} />}
      </div>
      <span className={`badge${known ? ' ok' : ''} bee-hero-status`}>{known ? '✓ Découverte' : 'Inconnue'}</span>
    </div>
  );
}

/** Fiche d'une espèce découverte : histoire, gènes, pedigree et récolte. */
function KnownSheet({ id, species }: { id: string; species: Species }) {
  const { content, state } = useGame();
  const certified = state.pedigree?.[id] ?? 0;
  return (
    <>
      <div className="card stack">
        <p className="lore">{LORE[id] ?? BRANCH_LORE[species.branch]}</p>
      </div>

      <div className="card stack">
        <div className="title">Caractéristiques</div>
        <table className="genome traits-table">
          <tbody>
            {Object.entries(content.chromosomes)
              .filter(([c]) => c !== 'species')
              .map(([c, label]) => (
                <tr key={c}>
                  <th>{label}</th>
                  <td>{alleleLabel(content, c, species.template[c])}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card stack">
        <div className="title">Pedigree</div>
        <div className="pedigree-ladder">
          {Object.entries(content.trophies.pedigree).map(([level, p]) => (
            <div key={level} className={`pedigree-step${Number(level) <= certified ? ' got' : ''}`} title={p.desc}>
              <span className="pedigree-icon">{p.icon}</span>
              <b>{p.label}</b>
              <span className="muted">{p.desc}</span>
            </div>
          ))}
        </div>
        <span className="muted">Certifiez une abeille de cette espèce depuis la réserve du Rucher.</span>
      </div>

      <div className="card stack">
        <div className="title">Récolte</div>
        {species.products.map(([item, chance]) => (
          <div key={item} className="family">
            <ItemQty id={item} />
            <span className="muted">{percent(chance)} par cycle</span>
            {content.recipes[item] && (
              <>
                <span className="op">→</span>
                <Outputs comb={item} />
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** Où trouver une espèce encore inconnue. */
function originHint(content: ReturnType<typeof useGame>['content'], species: Species, parents: number) {
  if (species.wild) return `C'est une espèce sauvage : une expédition peut la rapporter de la région « ${content.expeditions.regions[species.wild]?.label} ».`;
  if (parents) return `Elle naît d'une mutation : ${parents} croisement${parents > 1 ? 's' : ''} possible${parents > 1 ? 's' : ''}.`;
  return "C'est une espèce de base : elle s'achète en boutique.";
}

function AboutTab({
  id,
  species,
  known,
  parents,
  type,
  onType,
  onMutations,
}: {
  id: string;
  species: Species;
  known: boolean;
  parents: number;
  type: BeeType;
  onType: (type: BeeType) => void;
  onMutations: () => void;
}) {
  const { content } = useGame();
  const siblings = Object.keys(content.species).filter((s) => content.species[s].branch === species.branch);
  return (
    <div className="bee-about">
      <div className="card bee-portrait-card" style={known ? { background: `radial-gradient(circle at 50% 40%, #${species.color}33, var(--panel) 70%)` } : undefined}>
        <BeePortrait species={id} type={type} size={288} unknown={!known} />
        {known && (
          <div className="row" role="radiogroup" aria-label="Caste">
            {TYPES.map(([t, label]) => (
              <button key={t} role="radio" aria-checked={type === t} className={`chip pick${type === t ? ' selected' : ''}`} onClick={() => onType(t)}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="stack">
        {known ? (
          <>
            <KnownSheet id={id} species={species} />
            <RareVariants id={id} />
          </>
        ) : (
          <div className="card stack">
            <p>On ne sait encore rien de cette abeille. Obtenez-la une première fois pour lire sa fiche.</p>
            <p className="muted">{originHint(content, species, parents)}</p>
            {parents > 0 && (
              <div>
                <button className="small" onClick={onMutations}>
                  Voir comment l'obtenir
                </button>
              </div>
            )}
          </div>
        )}

        <div className="card stack">
          <div className="title">{known ? `Même branche : ${species.branch}` : 'Même branche'}</div>
          {known && BRANCH_LORE[species.branch] && <p className="muted">{BRANCH_LORE[species.branch]}</p>}
          <div className="row">
            {siblings.map((s) => (
              <MiniBee key={s} id={s} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Variantes rares de l'espèce : celles déjà vues naître brillent, les autres restent dans l'ombre. */
function RareVariants({ id }: { id: string }) {
  const { content, state } = useGame();
  const variants = Object.entries(content.variants.variants);
  const found = variants.filter(([v]) => state.stats[`variant:${v}:${id}`]);
  return (
    <div className="card stack">
      <div className="row between">
        <span className="title">Variantes rares</span>
        <span className="badge">
          {found.length} / {variants.length}
        </span>
      </div>
      <div className="rare-shelf">
        {variants.map(([v, variant]) => {
          const seen = !!state.stats[`variant:${v}:${id}`];
          return (
            <span key={v} className={`rare-slot${seen ? '' : ' unseen'}`} title={seen ? `${variant.label} : ${variant.desc}` : 'Pas encore vue'}>
              <BeeIcon
                species={id}
                type="princess"
                color={variant.color}
                secondary={variant.secondary}
                size={40}
                unknown={!seen}
                className={seen ? `rare rare-${v}` : undefined}
              />
              <span>{seen ? variant.label : '?'}</span>
            </span>
          );
        })}
      </div>
      {!found.length && (
        <p className="muted">
          De rares princesses naissent avec une robe et un pouvoir hors du commun, et les transmettent à toute leur lignée. La plus rare,
          la Dorée, une fois sur {fmt(Math.round(1 / content.variants.variants.golden.chance))}.
        </p>
      )}
    </div>
  );
}

function MutationsTab({ id, species }: { id: string; species: Species }) {
  const { content } = useGame();
  const parents = content.mutations.filter((m) => m.result === id);
  const children = content.mutations.filter((m) => m.a === id || m.b === id);
  return (
    <div className="stack">
      <div className="card stack">
        <div className="title">Comment l'obtenir</div>
        {parents.length === 0 && (
          <div className="muted">
            {species.wild
              ? `Espèce sauvage : on la trouve en expédition, dans la région « ${content.expeditions.regions[species.wild]?.label} ».`
              : "Espèce de base : elle s'achète en boutique."}
          </div>
        )}
        {parents.map((m) => (
          <Family key={`${m.a}+${m.b}`} m={m} wide />
        ))}
      </div>
      <div className="card stack">
        <div className="title">Ce qu'elle peut donner</div>
        <span className="muted">Croisée avec l'espèce indiquée, sa descendance peut muter. La condition éventuelle doit être réunie à la mort de la reine.</span>
        {children.length === 0 && <div className="muted">Rien : cette espèce est au bout de sa lignée.</div>}
        {children.map((m) => (
          <Family key={`${m.a}+${m.b}>${m.result}`} m={m} wide />
        ))}
      </div>
      <div>
        <Link className="link-button" href={`/apidex?vue=arbre&abeille=${id}`}>
          Voir sa lignée dans l'arbre
        </Link>
      </div>
    </div>
  );
}

export default function BeePage() {
  const { id } = useParams<{ id: string }>();
  const { content, state } = useGame();
  const [tab, setTab] = useState<'about' | 'mutations'>('about');
  const [type, setType] = useState<BeeType>('queen');
  const species = content.species[id];

  if (!species)
    return (
      <div className="stack">
        <Link className="back-link" href="/apidex">
          ← Apidex
        </Link>
        <p className="muted">Cette espèce n'existe pas.</p>
      </div>
    );

  const known = state.discovered.includes(id);
  const parents = content.mutations.filter((m) => m.result === id).length;
  const children = content.mutations.filter((m) => m.a === id || m.b === id).length;

  return (
    <div className="stack">
      <div>
        <Link className="back-link" href="/apidex">
          ← Apidex
        </Link>
      </div>

      <BeeHero id={id} species={species} known={known} />

      <div className="row tabs">
        <button className={`tab${tab === 'about' ? ' active' : ''}`} onClick={() => setTab('about')}>
          Présentation
        </button>
        <button className={`tab${tab === 'mutations' ? ' active' : ''}`} onClick={() => setTab('mutations')}>
          Mutations · {parents + children}
        </button>
      </div>

      {tab === 'about' && (
        <AboutTab id={id} species={species} known={known} parents={parents} type={type} onType={setType} onMutations={() => setTab('mutations')} />
      )}
      {tab === 'mutations' && <MutationsTab id={id} species={species} />}
    </div>
  );
}
