'use client';

import { memo } from 'react';
import { useContent } from '@/lib/game';
import type { BeeType } from '@/lib/types';

import { W, draw, lookOf, paints, runs, season } from './BeeArt';

export const BeeIcon = memo(function BeeIcon({
  color,
  secondary,
  type = 'drone',
  size = 48,
  unknown = false,
  species,
  x,
  y,
  className,
}: {
  color: string;
  secondary: string;
  type?: BeeType;
  size?: number;
  unknown?: boolean;
  /** Identifiant de l'espèce : donne la taille, le motif et les particularités de l'abeille */
  species?: string;
  /** Position, pour un sprite imbriqué dans un autre SVG */
  x?: number;
  y?: number;
  /** Classe en plus de « bee-icon » (variante rare) */
  className?: string;
}) {
  const content = useContent();
  const spec = species ? content.species[species] : undefined;
  const { look, size: sizeIndex, seed } = lookOf(spec, species ?? 'default', type, (allele) => content.alleles.lifespan?.[allele]?.value ?? 30);
  const when = season();
  const list = runs(`${species ?? ''}|${type}|${sizeIndex}|${when}`, () => draw(look, sizeIndex, type, seed, when));
  const palette = paints(color, secondary);
  return (
    <svg className={className ? `bee-icon ${className}` : 'bee-icon'} x={x} y={y} width={size} height={size} viewBox={`0 0 ${W} ${W}`} shapeRendering="crispEdges" aria-hidden>
      {list.map((r) => {
        if (unknown && (r.k === 'g' || r.k === 'k' || r.k === 'x')) return null;
        const [fill, opacity] = palette[r.k] ?? ['#ff00ff'];
        return (
          <rect
            key={`${r.x},${r.y}`}
            x={r.x}
            y={r.y}
            width={r.w + 0.02}
            height={1.02}
            fill={fill}
            fillOpacity={unknown ? 1 : opacity}
            style={unknown ? { fill: 'var(--unknown)' } : undefined}
          />
        );
      })}
    </svg>
  );
});
