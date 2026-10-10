'use client';

import { useGame } from '@/lib/game';
import type { Content, Genome } from '@/lib/types';
import { GenomeIcon, TYPE_LABELS, speciesName } from './ui';

// Sprites dessinés pour le jeu, teintés par les deux couleurs de l'espèce (comme les abeilles).
const TREE = [
  '................',
  '.....llllll.....',
  '...llllllllll...',
  '..llllllllllll..',
  '..lllldlllllll..',
  '.llllllllldllll.',
  '.llldlllllllll..',
  '..llllllllllll..',
  '...llllllllll...',
  '.....llttll.....',
  '.......tt.......',
  '.......tt.......',
  '.......tt.......',
  '......tttt......',
];

const BUTTERFLY = [
  '................',
  '.ww....o.o...ww.',
  '.wwww...o..wwww.',
  '.wwsww.bb.wwsww.',
  '.wwssw.bb.wssww.',
  '..wwwwwbbwwwww..',
  '...wwwwbbwwww...',
  '..wwwwwbbwwwww..',
  '.wwsww.bb.wwsww.',
  '.wwww..bb..wwww.',
  '..ww...bb...ww..',
  '................',
];

function Sprite({ rows, palette, size, unknown }: { rows: string[]; palette: Record<string, string>; size: number; unknown?: boolean }) {
  const pixels = [];
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      const fill = palette[rows[y][x]];
      if (fill) pixels.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={unknown ? '#3a3226' : fill} />);
    }
  }
  return (
    <svg className="bee-icon" width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {pixels}
    </svg>
  );
}

export function TreeIcon({ color, secondary, size = 48, unknown }: { color: string; secondary: string; size?: number; unknown?: boolean }) {
  return <Sprite rows={TREE} size={size} unknown={unknown} palette={{ l: `#${color}`, d: 'rgba(0,0,0,0.18)', t: `#${secondary}` }} />;
}

export function ButterflyIcon({ color, secondary, size = 48, unknown }: { color: string; secondary: string; size?: number; unknown?: boolean }) {
  return <Sprite rows={BUTTERFLY} size={size} unknown={unknown} palette={{ w: `#${color}`, s: `#${secondary}`, b: '#2b1d0e', o: '#6b5a3a' }} />;
}

export function treeName(content: Content, genome: Genome) {
  const [active, inactive] = genome.species;
  const name = content.garden.trees[active]?.label ?? active;
  return active === inactive ? name : `${name} (hybride ${content.garden.trees[inactive]?.label ?? inactive})`;
}

/** Icône d'un spécimen quel que soit son règne : abeille, pousse d'arbre ou papillon. */
export function SpecimenIcon({ kind, type, genome, size }: { kind: string; type: string; genome: Genome; size?: number }) {
  const { content } = useGame();
  const id = genome.species[0];
  if (kind === 'tree') {
    const tree = content.garden.trees[id];
    return <TreeIcon color={tree?.color ?? '888888'} secondary={tree?.secondary ?? '555555'} size={size} />;
  }
  if (kind === 'butterfly') {
    const butterfly = content.garden.butterflies[id];
    return <ButterflyIcon color={butterfly?.color ?? '888888'} secondary={butterfly?.secondary ?? '555555'} size={size} />;
  }
  return <GenomeIcon genome={genome} type={type as 'drone'} size={size} />;
}

export function specimenLabel(content: Content, kind: string, type: string, genome: Genome) {
  if (kind === 'tree') return `Pousse de ${treeName(content, genome)}`;
  if (kind === 'butterfly') return content.garden.butterflies[genome.species[0]]?.label ?? genome.species[0];
  return `${TYPE_LABELS[type as 'drone'] ?? type} ${speciesName(content, genome)}`;
}
