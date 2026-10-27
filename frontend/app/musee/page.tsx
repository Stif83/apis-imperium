'use client';

import { useState } from 'react';
import { BRANCH_LORE } from '@/components/apidex';
import { Donations, donePercent } from '@/components/Donations';
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
        Une collection par branche : tout ce que ses abeilles produisent, {fmt(content.late.museum.comb_need)} rayons de chaque sorte et
        des ressources selon leur rareté. Une collection complète fait produire
        les abeilles de sa branche ×{String(bonus).replace('.', ',')}, pour toujours. Les dons sont définitifs.
      </PageHead>

      <div className="museum-grid">
        {order.map((branch) => {
          const pctDone = donePercent(needs(branch), given(branch));
          const isOpen = open === branch;
          return (
            <div key={branch} className={`card museum-card${done.has(branch) ? ' complete' : ''}`}>
              <button className="museum-head" onClick={() => setOpen(isOpen ? null : branch)} aria-expanded={isOpen}>
                <span>
                  <b>{branch}</b>
                  <span className="muted museum-lore">{BRANCH_LORE[branch]}</span>
                </span>
                {done.has(branch) ? <span className="stamp">Complète</span> : <span className="badge">{pctDone} %</span>}
              </button>
              <span className="bar">
                <span style={{ width: `${pctDone}%` }} />
              </span>
              {isOpen && !done.has(branch) && (
                <Donations
                  needs={needs(branch)}
                  given={given(branch)}
                  onGive={(item, qty) => act('/museum/donate', { branch, item, qty })}
                />
              )}
              {isOpen && done.has(branch) && (
                <p className="muted">Collection complète : les abeilles {branch.toLowerCase()} produisent ×{String(bonus).replace('.', ',')}.</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
