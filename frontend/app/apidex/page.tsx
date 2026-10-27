'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { Outputs, computeTiers } from '@/components/apidex';
import { ItemIcon, PageHead } from '@/components/ui';
import { TreeView } from '@/components/TreeView';
import { useGame } from '@/lib/game';
import type { Content } from '@/lib/types';

type Branch = { name: string; ids: string[]; tier: number; color: string; secondary: string; parents: string[] };

/** Branches dans l'ordre de progression : palier médian de leurs espèces, puis ordre du contenu. */
function computeBranches(content: Content, tiers: Record<string, number>): Branch[] {
  const map = new Map<string, Branch>();
  for (const [id, s] of Object.entries(content.species)) {
    let b = map.get(s.branch);
    if (!b) {
      b = { name: s.branch, ids: [], tier: 0, color: s.color, secondary: s.secondary, parents: [] };
      map.set(s.branch, b);
    }
    b.ids.push(id);
  }
  for (const b of map.values()) {
    // La médiane évite qu'une seule espèce vendue en boutique tire toute la branche vers le début
    const sorted = b.ids.map((id) => tiers[id]).sort((x, y) => x - y);
    b.tier = sorted[Math.floor((sorted.length - 1) / 2)];
    const parents = new Set<string>();
    for (const m of content.mutations) {
      if (!b.ids.includes(m.result)) continue;
      for (const p of [m.a, m.b]) {
        const pb = content.species[p].branch;
        if (pb !== b.name) parents.add(pb);
      }
    }
    b.parents = [...parents];
  }
  return [...map.values()].sort((a, b) => a.tier - b.tier);
}

const TIER_NAMES = ['Premiers pas', 'Premières mutations', 'Élevage confirmé', 'Lignées avancées', 'Raretés', 'Légendes'];
// Paliers regroupés en six étapes pour ne pas multiplier les sections
const band = (t: number) => (t <= 1 ? 0 : t <= 3 ? 1 : t <= 4 ? 2 : t <= 6 ? 3 : t <= 8 ? 4 : 5);

const FILTERS = [
  ['all', 'Toutes'],
  ['progress', 'À compléter'],
  ['done', 'Complètes'],
] as const;

type ViewName = 'branches' | 'combs' | 'tree';

export default function ApidexPage() {
  const { content, state } = useGame();
  const [view, setView] = useState<ViewName>('branches');
  const [filter, setFilter] = useState<(typeof FILTERS)[number][0]>('all');
  // ?vue=arbre&abeille=<id> : ouvert depuis la fiche d'une abeille, sur sa lignée
  const [focus, setFocus] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('vue') === 'arbre') setView('tree');
    const id = params.get('abeille');
    if (id && content.species[id]) setFocus(id);
  }, [content]);

  const known = useMemo(() => new Set(state.discovered), [state.discovered]);
  const tiers = useMemo(() => computeTiers(content), [content]);
  const branches = useMemo(() => computeBranches(content, tiers), [content, tiers]);
  const allIds = Object.keys(content.species);
  // Une espèce inconnue reste anonyme partout : ni nom, ni couleurs
  const name = (id: string) => (known.has(id) ? content.species[id].label : '???');

  // Rayon -> espèces qui le produisent ; un rayon reste inconnu tant qu'aucune de ses abeilles ne l'est
  const producers = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const [id, s] of Object.entries(content.species)) for (const [item] of s.products) (map[item] ??= []).push(id);
    return map;
  }, [content]);
  const combKnown = (comb: string) => (producers[comb] ?? []).some((id) => known.has(id));
  const combs = useMemo(() => {
    const rank = (comb: string) => Math.min(99, ...(producers[comb] ?? []).map((id) => tiers[id]));
    return Object.keys(content.recipes).sort((a, b) => rank(a) - rank(b));
  }, [content, producers, tiers]);

  // Une fonction et non un composant : défini ici, un composant serait recréé (et redessiné) à chaque sondage
  const branchBee = (id: string) => {
    const s = content.species[id];
    return (
      <Link key={id} className={`branch-bee${known.has(id) ? '' : ' unknown'}`} title={name(id)} href={`/apidex/${id}`}>
        <BeeIcon species={id} color={s.color} secondary={s.secondary} type="queen" size={44} unknown={!known.has(id)} />
        <span>{name(id)}</span>
      </Link>
    );
  };

  const shown = branches.filter((b) => {
    const n = b.ids.filter((id) => known.has(id)).length;
    if (filter === 'done') return n === b.ids.length;
    if (filter === 'progress') return n < b.ids.length;
    return true;
  });
  const bands = [...new Set(shown.map((b) => band(b.tier)))].sort((a, b) => a - b);
  const complete = branches.filter((b) => b.ids.every((id) => known.has(id))).length;

  return (
    <>
      <PageHead
        guide="apidex"
        title="Apidex"
        extra={
          <span className="row">
            <span className="badge ok">
              {known.size} / {allIds.length} espèces
            </span>
            <span className="badge">
              {complete} / {branches.length} branches
            </span>
            <span className="badge">
              {combs.filter(combKnown).length} / {combs.length} rayons
            </span>
          </span>
        }
      >
        Toutes les espèces, rangées par branche, de la plus accessible à la plus rare. Les espèces encore inconnues restent anonymes.
        Cliquez sur une abeille pour ouvrir sa fiche : présentation, récolte et mutations. L'onglet Rayons détaille ce que chaque rayon
        donne à la centrifugeuse ; l'arbre des mutations se parcourt en zoomant.
      </PageHead>

      <div className="row tabs">
        <button className={`tab${view === 'branches' ? ' active' : ''}`} onClick={() => setView('branches')}>
          Branches
        </button>
        <button className={`tab${view === 'combs' ? ' active' : ''}`} onClick={() => setView('combs')}>
          Rayons
        </button>
        <button className={`tab${view === 'tree' ? ' active' : ''}`} onClick={() => setView('tree')}>
          Arbre des mutations
        </button>
        {view === 'branches' && (
          <span className="row" style={{ marginLeft: 'auto' }} role="radiogroup" aria-label="Filtre">
            {FILTERS.map(([id, label]) => (
              <button
                key={id}
                role="radio"
                aria-checked={filter === id}
                className={`chip pick${filter === id ? ' selected' : ''}`}
                onClick={() => setFilter(id)}
              >
                {label}
              </button>
            ))}
          </span>
        )}
      </div>

      {view === 'branches' && (
        <>
          {shown.length === 0 && <p className="muted">Aucune branche ici pour l'instant.</p>}
          {bands.map((t) => (
            <section key={t}>
              <h2 className="tier-head">{TIER_NAMES[t]}</h2>
              <div className="branch-grid">
                {shown
                  .filter((b) => band(b.tier) === t)
                  .map((b) => {
                    const n = b.ids.filter((id) => known.has(id)).length;
                    return (
                      <div key={b.name} className={`branch-card${n === b.ids.length ? ' complete' : ''}`}>
                        <div
                          className="branch-band"
                          style={{ background: n > 0 ? `linear-gradient(90deg, #${b.color}, #${b.secondary})` : 'var(--border)' }}
                        />
                        <div className="row between">
                          <span className="title">{b.name}</span>
                          {n === b.ids.length ? (
                            <span className="stamp">Complète</span>
                          ) : (
                            <span className="badge">
                              {n} / {b.ids.length}
                            </span>
                          )}
                        </div>
                        <div className="bar">
                          <div style={{ width: `${(100 * n) / b.ids.length}%` }} />
                        </div>
                        <div className="branch-bees">
                          {b.ids.map(branchBee)}
                        </div>
                        {b.parents.length > 0 && (
                          <div className="muted branch-from">
                            Issue de :
                            {b.parents.map((p) => (
                              <span key={p} className="trait">
                                {p}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </section>
          ))}
        </>
      )}

      {view === 'combs' && (
        <div className="branch-grid">
          {combs.map((comb) => {
            const seen = combKnown(comb);
            const item = content.items[comb];
            return (
              <div key={comb} className="branch-card">
                <div className="branch-band" style={{ background: seen ? `#${item.color}` : 'var(--border)' }} />
                <div className="row">
                  {seen ? (
                    <ItemIcon id={comb} size={36} />
                  ) : (
                    <svg className="item-icon" width={36} height={36} viewBox="0 0 16 16" aria-hidden>
                      <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill="var(--border)" />
                    </svg>
                  )}
                  <span className="title">{seen ? item.label : 'Rayon inconnu'}</span>
                </div>
                {seen ? <Outputs comb={comb} /> : <div className="muted">Découvrez une abeille qui le produit pour connaître son contenu.</div>}
                <div className="muted">Produit par :</div>
                <div className="branch-bees">
                  {(producers[comb] ?? []).map(branchBee)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'tree' && <TreeView key={focus ?? 'all'} tiers={tiers} initial={focus} />}
    </>
  );
}
