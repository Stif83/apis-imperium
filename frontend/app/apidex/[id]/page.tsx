'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { BeePortrait } from '@/components/BeePortrait';
import { BRANCH_LORE, Family, MiniBee, Outputs, computeTiers, percent } from '@/components/apidex';
import { ItemQty, alleleLabel, notableTraits } from '@/components/ui';
import { useGame } from '@/lib/game';
import { LORE } from '@/lib/lore';
import type { BeeType } from '@/lib/types';

const TYPES: [BeeType, string][] = [
  ['queen', 'Reine'],
  ['princess', 'Princesse'],
  ['drone', 'Faux-bourdon'],
];

export default function BeePage() {
  const { id } = useParams<{ id: string }>();
  const { content, state } = useGame();
  const [tab, setTab] = useState<'about' | 'mutations'>('about');
  const [type, setType] = useState<BeeType>('queen');
  const tiers = useMemo(() => computeTiers(content), [content]);
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
  const parents = content.mutations.filter((m) => m.result === id);
  const children = content.mutations.filter((m) => m.a === id || m.b === id);
  const siblings = Object.keys(content.species).filter((s) => content.species[s].branch === species.branch);
  const genome = Object.fromEntries(Object.entries(species.template).map(([c, a]) => [c, [a, a] as [string, string]]));
  // Traits remarquables, écrits en clair dans l'en-tête (l'activité est déjà dans le tableau)
  const traits = notableTraits(content, genome).filter((t) => !t.label.startsWith(content.chromosomes.activity));

  return (
    <div className="stack">
      <div>
        <Link className="back-link" href="/apidex">
          ← Apidex
        </Link>
      </div>

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
          {known && (
            <div className="row">
              <span className="chip">🌡️ Climat {content.temp_labels[species.temp].toLowerCase()}</span>
              <span className="chip">{tiers[id] === 0 ? '🛒 Espèce de base' : `🧬 Palier ${tiers[id]}`}</span>
              {traits.map((t) => (
                <span key={t.label} className="chip">
                  {t.icon} {t.label}
                </span>
              ))}
            </div>
          )}
        </div>
        <span className={`badge${known ? ' ok' : ''} bee-hero-status`}>{known ? '✓ Découverte' : 'Inconnue'}</span>
      </div>

      <div className="row tabs">
        <button className={`tab${tab === 'about' ? ' active' : ''}`} onClick={() => setTab('about')}>
          Présentation
        </button>
        <button className={`tab${tab === 'mutations' ? ' active' : ''}`} onClick={() => setTab('mutations')}>
          Mutations · {parents.length + children.length}
        </button>
      </div>

      {tab === 'about' && (
        <div className="bee-about">
          <div className="card bee-portrait-card" style={known ? { background: `radial-gradient(circle at 50% 40%, #${species.color}33, var(--panel) 70%)` } : undefined}>
            <BeePortrait species={id} type={type} size={288} unknown={!known} />
            {known && (
              <div className="row" role="radiogroup" aria-label="Caste">
                {TYPES.map(([t, label]) => (
                  <button key={t} role="radio" aria-checked={type === t} className={`chip pick${type === t ? ' selected' : ''}`} onClick={() => setType(t)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="stack">
            {known ? (
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
            ) : (
              <div className="card stack">
                <p>On ne sait encore rien de cette abeille. Obtenez-la une première fois pour lire sa fiche.</p>
                <p className="muted">
                  {parents.length
                    ? `Elle naît d'une mutation : ${parents.length} croisement${parents.length > 1 ? 's' : ''} possible${parents.length > 1 ? 's' : ''}.`
                    : "C'est une espèce de base : elle s'achète en boutique."}
                </p>
                {parents.length > 0 && (
                  <div>
                    <button className="small" onClick={() => setTab('mutations')}>
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
      )}

      {tab === 'mutations' && (
        <div className="stack">
          <div className="card stack">
            <div className="title">Comment l'obtenir</div>
            {parents.length === 0 && <div className="muted">Espèce de base : elle s'achète en boutique.</div>}
            {parents.map((m, i) => (
              <Family key={i} m={m} wide />
            ))}
          </div>
          <div className="card stack">
            <div className="title">Ce qu'elle peut donner</div>
            <span className="muted">Croisée avec l'espèce indiquée, sa descendance peut muter. La condition éventuelle doit être réunie à la mort de la reine.</span>
            {children.length === 0 && <div className="muted">Rien : cette espèce est au bout de sa lignée.</div>}
            {children.map((m, i) => (
              <Family key={i} m={m} wide />
            ))}
          </div>
          <div>
            <Link className="link-button" href={`/apidex?vue=arbre&abeille=${id}`}>
              Voir sa lignée dans l'arbre
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
