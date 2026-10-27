'use client';

import { ItemIcon } from '@/components/ui';
import { useGame } from '@/lib/game';

/** Élixir d'éclaireur en cours : points de chance ajoutés aux expéditions lancées maintenant. */
export function useScoutBonus(): number {
  const { content, state } = useGame();
  return Object.entries(state.effects ?? {}).reduce(
    (best, [id, until]) => (until > state.server_time ? Math.max(best, content.late.elixirs[id]?.effects.expedition ?? 0) : best),
    0,
  );
}

/** Bandeau des élixirs en cours, avec le temps restant. */
export function ActiveEffects() {
  const { content, state } = useGame();
  const active = Object.entries(state.effects ?? {}).filter(([, until]) => until > state.server_time);
  if (!active.length) return null;
  return (
    <div className="notice row effects-bar">
      ⚗️
      {active.map(([id, until]) => (
        <span key={id} className="chip" title={content.late.elixirs[id]?.desc}>
          <ItemIcon id={id} size={16} />
          {content.items[id]?.label} · {Math.ceil((until - state.server_time) / 60000)} min
        </span>
      ))}
    </div>
  );
}
