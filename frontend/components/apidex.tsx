'use client';

import Link from 'next/link';
import { BeeIcon } from '@/components/BeeIcon';
import { Honey, ItemQty } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Mutation } from '@/lib/apidex';
import { percent } from '@/lib/format';

/** Ce que donne un rayon à la centrifugeuse. */
export function Outputs({ comb }: { comb: string }) {
  const { content } = useGame();
  return (
    <div className="comb-out">
      {content.recipes[comb].map(([out, chance, qty]) => (
        <span key={out} className="row" style={{ gap: 4 }}>
          {out === 'honey' ? (
            <span className="chip">
              <Honey amount={qty} /> miel
            </span>
          ) : (
            <ItemQty id={out} qty={qty} />
          )}
          <span className="muted">{percent(chance)}</span>
        </span>
      ))}
    </div>
  );
}

/** Vignette d'espèce qui ouvre sa fiche ; anonyme tant qu'elle est inconnue. */
export function MiniBee({ id, size = 28 }: { id: string; size?: number }) {
  const { content, state } = useGame();
  const species = content.species[id];
  const known = state.discovered.includes(id);
  return (
    <Link className="mini" href={`/apidex/${id}`}>
      <BeeIcon species={id} color={species.color} secondary={species.secondary} type="queen" size={size} unknown={!known} />
      {known ? species.label : '???'}
    </Link>
  );
}

/** Une mutation : parent + parent → résultat, avec sa chance et sa condition ; « wide » occupe toute la largeur. */
export function Family({ m, wide = false }: { m: Mutation; wide?: boolean }) {
  const size = wide ? 44 : 28;
  return (
    <div className={`family${wide ? ' wide' : ''}`}>
      <MiniBee id={m.a} size={size} />
      <span className="op">+</span>
      <MiniBee id={m.b} size={size} />
      <span className="op">→</span>
      <MiniBee id={m.result} size={size} />
      <span className="family-odds">
        <span className="chance">{percent(m.chance)}</span>
        {m.cond_text ? <span className="cond">{m.cond_text}</span> : wide && <span className="muted">sans condition</span>}
      </span>
    </div>
  );
}
