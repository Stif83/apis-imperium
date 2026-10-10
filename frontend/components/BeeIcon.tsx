import type { BeeType } from '@/lib/types';

// Sprite 16×16 dessiné pour le jeu, teinté par les deux couleurs de l'espèce comme dans
// Forestry. Pour utiliser d'autres images, il suffit de remplacer ce composant.
// o = contour, b = corps, s = rayures, w = ailes, e = œil, c = couronne, t = diadème
const SPRITE = [
  '................',
  '..c.c.c.........',
  '..ccccc.ww..ww..',
  '...ttt.wwww.www.',
  '.......wwwwwwww.',
  '........wwwwww..',
  '...oooooooooo...',
  '..obbssbbssbbo..',
  '.oebbssbbssbbbo.',
  '.obbbssbbssbbbbo',
  '.oebbssbbssbbbo.',
  '..obbssbbssbbo..',
  '...oooooooooo...',
  '....o...o...o...',
  '................',
  '................',
];

export function BeeIcon({
  color,
  secondary,
  type = 'drone',
  size = 48,
  unknown = false,
  x,
  y,
}: {
  color: string;
  secondary: string;
  type?: BeeType;
  size?: number;
  unknown?: boolean;
  /** Position, pour un sprite imbriqué dans un autre SVG */
  x?: number;
  y?: number;
}) {
  const palette: Record<string, string | null> = {
    o: '#2b1d0e',
    b: `#${color}`,
    s: `#${secondary}`,
    w: 'rgba(235,245,255,0.8)',
    e: '#111111',
    c: type === 'queen' ? '#ffd23f' : null,
    t: type === 'princess' ? '#ff8fc7' : null,
  };
  const pixels = [];
  for (let y = 0; y < SPRITE.length; y++) {
    for (let x = 0; x < SPRITE[y].length; x++) {
      const fill = palette[SPRITE[y][x]];
      if (fill) pixels.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={unknown ? '#3a3226' : fill} />);
    }
  }
  return (
    <svg className="bee-icon" x={x} y={y} width={size} height={size} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      {pixels}
    </svg>
  );
}
