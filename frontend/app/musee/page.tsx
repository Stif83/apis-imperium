'use client';

import { useMemo, useState } from 'react';
import { BRANCH_LORE } from '@/components/apidex';
import { Donations, donePercent } from '@/components/Donations';
import { type Exhibit, Vitrine } from '@/components/MuseumArt';
import { PageHead, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

export default function MuseumPage() {
  const { content, state, act } = useGame();
  const { collections, bonus } = content.late.museum;
  const branches = Object.keys(collections);
  const [open, setOpen] = useState<string | null>(null);
  const done = new Set(state.museum.complete);
  const given = (branch: string) => (item: string) => state.museum.given[branch]?.[item] ?? 0;
  const needs = (branch: string): [string, number][] => Object.entries(collections[branch]);
  // Couleur d'une branche : celle de sa première espèce
  const colors = useMemo(() => {
    const out: Record<string, string> = {};
    for (const s of Object.values(content.species)) out[s.branch] ??= s.color;
    return out;
  }, [content.species]);
  const exhibits = (branch: string): Exhibit[] =>
    needs(branch).map(([item, need]) => ({
      color: content.items[item]?.color ?? 'cccccc',
      comb: content.items[item]?.category === 'comb',
      frac: Math.min(1, given(branch)(item) / need),
    }));
  // Les collections entamées d'abord, puis les autres, les complètes à la fin
  const order = [...branches].sort((a, b) => {
    const rank = (x: string) => (done.has(x) ? 2 : donePercent(needs(x), given(x)) > 0 ? 0 : 1);
    return rank(a) - rank(b) || a.localeCompare(b, 'fr');
  });

  return (
    <>
      <PageHead
        guide="musee"
        title="Musée du miel"
        extra={
          <span className="badge ok">
            {done.size} / {branches.length} collections
          </span>
        }
      >
        Une vitrine par branche : tout ce que ses abeilles produisent, {fmt(content.late.museum.comb_need)} rayons de chaque sorte et des
        ressources selon leur rareté. Chaque bocal se remplit au fil des dons. Une collection complète fait produire les abeilles de sa
        branche ×{String(bonus).replace('.', ',')}, pour toujours, et sa vitrine se dore. Les dons sont définitifs.
      </PageHead>

      <div className="museum-grid">
        {order.map((branch) => {
          const pctDone = donePercent(needs(branch), given(branch));
          const isOpen = open === branch;
          const complete = done.has(branch);
          return (
            <div key={branch} className={`card museum-card${complete ? ' complete' : ''}${isOpen ? ' open' : ''}`}>
              <button className="museum-case" onClick={() => setOpen(isOpen ? null : branch)} aria-expanded={isOpen}>
                <Vitrine exhibits={exhibits(branch)} color={colors[branch] ?? 'ffd54f'} complete={complete} />
                <span className="museum-caption">
                  <b>{branch}</b>
                  {complete ? <span className="stamp">Complète</span> : <span className="badge">{pctDone} %</span>}
                </span>
              </button>
              {isOpen && (
                <div className="museum-detail">
                  <span className="muted museum-lore">{BRANCH_LORE[branch]}</span>
                  {complete ? (
                    <p className="muted">
                      Collection complète : les abeilles {branch.toLowerCase()} produisent ×{String(bonus).replace('.', ',')}.
                    </p>
                  ) : (
                    <Donations
                      needs={needs(branch)}
                      given={given(branch)}
                      onGive={(item, qty) => act('/museum/donate', { branch, item, qty })}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
