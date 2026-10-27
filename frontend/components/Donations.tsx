'use client';

import { Honey, ItemIcon, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

/**
 * Liste de ce qu'un chantier demande (miel ou objets), avec ce qui est déjà donné et un bouton par ligne.
 * Sert aux grands projets, au Musée et à la Ruche-monde.
 */
export function Donations({
  needs,
  given,
  onGive,
}: {
  needs: [string, number][];
  given: (item: string) => number;
  onGive: (item: string, qty: number) => Promise<unknown>;
}) {
  const { content, state } = useGame();
  const have = (item: string) => (item === 'honey' ? state.player.honey : state.inventory[item] ?? 0);
  const canGive = needs.some(([item, need]) => need > given(item) && have(item) > 0);
  // « Tout donner » : chaque part reçoit ce qu'on peut lui donner
  const giveAll = async () => {
    for (const [item, need] of needs) {
      const qty = Math.min(need - given(item), have(item));
      if (qty > 0 && !(await onGive(item, qty))) return;
    }
  };
  return (
    <>
      <div className="project-needs">
        {needs.map(([item, need]) => {
          const g = given(item);
          const left = need - g;
          const can = Math.min(left, have(item));
          return (
            <div key={item} className={`project-need${left <= 0 ? ' done' : ''}`}>
              <span className="project-item">
                {item === 'honey' ? <Honey amount={need} /> : <ItemIcon id={item} size={20} />}
                <span>{item === 'honey' ? 'Miel' : content.items[item]?.label}</span>
              </span>
              <span className="bar">
                <span style={{ width: `${Math.min(100, (100 * g) / need)}%` }} />
              </span>
              <span className="muted project-count">
                {fmt(g)} / {fmt(need)}
              </span>
              {left > 0 ? (
                <button
                  className="small"
                  disabled={can <= 0}
                  title={can <= 0 ? 'Rien en stock' : `Donner ${fmt(can)} (stock : ${fmt(have(item))})`}
                  onClick={() => onGive(item, can)}
                >
                  Donner {can > 0 ? fmt(can) : ''}
                </button>
              ) : (
                <span className="ok-text">✓</span>
              )}
            </div>
          );
        })}
      </div>
      {needs.some(([item, need]) => need > given(item)) && (
        <div>
          <button
            className="primary compact"
            disabled={!canGive}
            title={canGive ? undefined : 'Rien en stock de ce qui manque'}
            onClick={giveAll}
          >
            Tout donner
          </button>
        </div>
      )}
    </>
  );
}

/** Part déjà réunie, en pourcentage. */
export function donePercent(needs: [string, number][], given: (item: string) => number) {
  const total = needs.reduce((n, [, need]) => n + need, 0);
  const got = needs.reduce((n, [item, need]) => n + Math.min(need, given(item)), 0);
  return total ? Math.floor((100 * got) / total) : 100;
}
