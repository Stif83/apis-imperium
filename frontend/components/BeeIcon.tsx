'use client';

import { useGame } from '@/lib/game';
import type { BeeType, Species } from '@/lib/types';

// Abeilles en pixel art générées à partir de l'espèce : taille (longévité, branche, reine),
// motif du corps, forme des ailes et particularités de la branche. Couleurs : celles de l'espèce.
// Pour utiliser d'autres images, il suffit de remplacer ce composant.

const W = 24;
const SIZES: [number, number][] = [
  [3.2, 2.3], // minuscule
  [4.4, 2.9], // petite
  [5.8, 3.6], // moyenne
  [7.1, 4.3], // grosse
  [8.8, 5.2], // énorme
];

type Pattern = 'stripes' | 'thin' | 'bands' | 'spots' | 'split' | 'plain';
type Wings = 'normal' | 'big' | 'small' | 'tattered' | 'crystal' | 'leaf' | 'aqua' | 'butterfly';
type Feature =
  | 'horns' | 'flame' | 'fluff' | 'glow' | 'mask' | 'speckle' | 'rock' | 'crystal' | 'shine' | 'bones'
  | 'rivets' | 'drip' | 'bubbles' | 'sparkle' | 'halo' | 'flower' | 'stinger' | 'antennae' | 'crest';
type Look = { pattern: Pattern; wings: Wings; features: Feature[]; size?: number };

const BRANCH_LOOKS: Record<string, Look> = {
  Mellifères: { pattern: 'stripes', wings: 'normal', features: [] },
  Nobles: { pattern: 'stripes', wings: 'normal', features: ['crest', 'shine'] },
  Industrieuses: { pattern: 'thin', wings: 'small', features: ['antennae'] },
  Héroïques: { pattern: 'bands', wings: 'big', features: ['crest'], size: 1 },
  Frugales: { pattern: 'plain', wings: 'normal', features: ['speckle'] },
  Infernales: { pattern: 'stripes', wings: 'tattered', features: ['horns', 'flame'] },
  Tropicales: { pattern: 'spots', wings: 'big', features: ['antennae'] },
  Glaciales: { pattern: 'stripes', wings: 'crystal', features: ['fluff'] },
  Marécageuses: { pattern: 'plain', wings: 'normal', features: ['speckle', 'drip'] },
  Agricoles: { pattern: 'stripes', wings: 'normal', features: ['fluff'] },
  Monastiques: { pattern: 'plain', wings: 'small', features: ['crest'] },
  Néant: { pattern: 'split', wings: 'tattered', features: ['glow', 'mask'] },
  Festives: { pattern: 'spots', wings: 'butterfly', features: ['sparkle'] },
  Vengeresses: { pattern: 'stripes', wings: 'tattered', features: ['mask', 'horns'] },
  Stériles: { pattern: 'thin', wings: 'small', features: ['speckle'] },
  Macabres: { pattern: 'thin', wings: 'tattered', features: ['bones'] },
  Minérales: { pattern: 'plain', wings: 'small', features: ['rock'], size: 1 },
  Métalliques: { pattern: 'bands', wings: 'normal', features: ['rivets', 'shine'] },
  Précieuses: { pattern: 'stripes', wings: 'normal', features: ['shine', 'crest'] },
  Gemmes: { pattern: 'plain', wings: 'crystal', features: ['crystal', 'shine'] },
  Nucléaires: { pattern: 'spots', wings: 'normal', features: ['glow'] },
  Aquatiques: { pattern: 'thin', wings: 'aqua', features: ['bubbles'] },
  Gourmandes: { pattern: 'spots', wings: 'normal', features: ['fluff'] },
  Fermières: { pattern: 'stripes', wings: 'normal', features: ['fluff'] },
  Volcaniques: { pattern: 'split', wings: 'tattered', features: ['horns', 'flame', 'rock'], size: 1 },
  Venimeuses: { pattern: 'thin', wings: 'normal', features: ['stinger'] },
  Gluantes: { pattern: 'plain', wings: 'small', features: ['drip', 'shine'] },
  Caustiques: { pattern: 'spots', wings: 'tattered', features: ['drip', 'glow'] },
  Énergiques: { pattern: 'thin', wings: 'big', features: ['sparkle', 'antennae'], size: -1 },
  Ténébreuses: { pattern: 'split', wings: 'tattered', features: ['mask'] },
  Fossiles: { pattern: 'bands', wings: 'normal', features: ['rock'] },
  Pétrolières: { pattern: 'plain', wings: 'normal', features: ['drip', 'shine'] },
  Arcaniques: { pattern: 'stripes', wings: 'butterfly', features: ['sparkle'] },
  Enchantées: { pattern: 'spots', wings: 'leaf', features: ['sparkle'] },
  Nocturnes: { pattern: 'thin', wings: 'big', features: ['glow', 'antennae'] },
  Solaires: { pattern: 'stripes', wings: 'big', features: ['glow', 'shine'] },
  Célestes: { pattern: 'split', wings: 'butterfly', features: ['halo', 'sparkle', 'glow'], size: 1 },
  Aurorales: { pattern: 'split', wings: 'butterfly', features: ['sparkle'] },
  Pluviales: { pattern: 'thin', wings: 'aqua', features: ['bubbles'] },
  Orageuses: { pattern: 'stripes', wings: 'big', features: ['sparkle', 'antennae'] },
  Neigeuses: { pattern: 'plain', wings: 'crystal', features: ['fluff'] },
  Terroirs: { pattern: 'stripes', wings: 'normal', features: ['speckle'] },
  Florales: { pattern: 'spots', wings: 'leaf', features: ['flower'] },
  Sociales: { pattern: 'stripes', wings: 'small', features: [], size: -1 },
  Serricoles: { pattern: 'spots', wings: 'leaf', features: ['flower', 'shine'] },
  Recluses: { pattern: 'plain', wings: 'small', features: ['crest'] },
  Mécaniques: { pattern: 'bands', wings: 'normal', features: ['rivets', 'shine', 'antennae'] },
  Chaotiques: { pattern: 'spots', wings: 'tattered', features: ['glow', 'sparkle'] },
  Harmonieuses: { pattern: 'plain', wings: 'big', features: ['shine', 'halo'] },
  Temporelles: { pattern: 'split', wings: 'normal', features: ['sparkle'] },
  Légendaires: { pattern: 'stripes', wings: 'butterfly', features: ['halo', 'glow', 'shine', 'crest'], size: 2 },
  Sauvages: { pattern: 'spots', wings: 'tattered', features: ['speckle', 'antennae'], size: 1 },
  Mythiques: { pattern: 'split', wings: 'butterfly', features: ['halo', 'sparkle', 'glow', 'shine'], size: 2 },
};
const DEFAULT_LOOK: Look = { pattern: 'stripes', wings: 'normal', features: [] };

// Taille de base selon la longévité de l'espèce (en cycles)
function lifeSize(lifespan: number): number {
  if (lifespan <= 10) return 0;
  if (lifespan <= 20) return 1;
  if (lifespan <= 40) return 2;
  return 3;
}

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function seedOf(text: string) {
  let h = 0;
  for (const ch of text) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

type Paint = [string, number?];
type Pixels = Map<number, string>;

/** Calcule la grille de pixels (clé = code de couleur) d'une abeille. */
function draw(look: Look, sizeIndex: number, type: BeeType, seed: number, season = ''): Pixels {
  const px: Pixels = new Map();
  const set = (x: number, y: number, k: string) => {
    if (x >= 0 && x < W && y >= 0 && y < W) px.set(y * W + x, k);
  };
  const has = (x: number, y: number) => px.has(y * W + x);
  const level = Math.max(0, Math.min(SIZES.length - 1, sizeIndex));
  const [a, b] = SIZES[level];
  // Tête ronde à droite de l'abdomen ; l'ensemble est centré dans la case
  const hr = Math.max(1.7, b * 0.62);
  const cx = 11.5 - hr * 0.55;
  const cy = 14 + b / 2;
  const hcx = cx + a + hr * 0.15;
  const hcy = cy - b * 0.15;
  const f = new Set(look.features);

  const inAbdomen = (x: number, y: number) => {
    const dx = (x + 0.5 - cx) / a;
    const dy = (y + 0.5 - cy) / b;
    return dx * dx + dy * dy <= 1;
  };
  const inHead = (x: number, y: number) => (x + 0.5 - hcx) ** 2 + (y + 0.5 - hcy) ** 2 <= hr * hr;
  const inside = (x: number, y: number) => inAbdomen(x, y) || inHead(x, y);
  const body: [number, number][] = [];
  for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (inside(x, y)) body.push([x, y]);
  const isBody = new Set(body.map(([x, y]) => y * W + x));
  const inBody = (x: number, y: number) => isBody.has(y * W + x);
  const edge = (x: number, y: number) => !inBody(x - 1, y) || !inBody(x + 1, y) || !inBody(x, y - 1) || !inBody(x, y + 1);
  const top = (x: number) => body.filter(([bx]) => bx === x).reduce((m, [, by]) => Math.min(m, by), W);
  const bottom = (x: number) => body.filter(([bx]) => bx === x).reduce((m, [, by]) => Math.max(m, by), -1);
  const left = Math.min(...body.map(([x]) => x));
  const right = Math.max(...body.map(([x]) => x));
  const hx = Math.round(hcx - 0.5); // milieu de la tête
  const ty = top(hx); // haut de la tête

  // Aura, derrière tout le reste
  if (f.has('glow')) {
    for (const [x, y] of body)
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2 && !inBody(x + dx, y + dy)) set(x + dx, y + dy, 'g');
  }

  // Ailes, derrière le corps
  const wingSize: Record<Wings, [number, number]> = {
    normal: [2.3, 2.2],
    big: [3.2, 3],
    small: [1.6, 1.5],
    tattered: [2.6, 2.4],
    crystal: [2.4, 2.6],
    leaf: [2.4, 2.8],
    aqua: [2.4, 2.2],
    butterfly: [3.4, 3.4],
  };
  // Les ailes suivent la taille du corps
  const scale = 0.62 + level * 0.12;
  const rx = wingSize[look.wings][0] * scale;
  const ry = wingSize[look.wings][1] * scale;
  const wingFill = { crystal: 'x2', leaf: 'l', aqua: 'a', butterfly: 'S' }[look.wings as string] ?? 'w';
  const topY = cy - b;
  const centers: [number, number][] = [
    [cx + a * 0.15 - rx * 0.5, topY - ry * 0.7],
    [cx + a * 0.15 + rx * 0.7, topY - ry * 0.5],
  ];
  for (const [wx, wy] of centers) {
    const inWing = (x: number, y: number) => {
      const dx = (x + 0.5 - wx) / rx;
      const dy = (y + 0.5 - wy) / ry;
      return look.wings === 'crystal' ? Math.abs(dx) + Math.abs(dy) <= 1 : dx * dx + dy * dy <= 1;
    };
    for (let y = 0; y < W; y++)
      for (let x = 0; x < W; x++) {
        if (!inWing(x, y)) continue;
        if (look.wings === 'tattered' && hash(x, y, seed) % 4 === 0 && !inWing(x, y + 1)) continue;
        const rim = !inWing(x - 1, y) || !inWing(x + 1, y) || !inWing(x, y - 1) || !inWing(x, y + 1);
        set(x, y, rim ? 'W' : wingFill);
      }
    if (look.wings === 'butterfly') set(Math.round(wx - 0.5), Math.round(wy - 0.5), 'x');
  }

  // Corps : contour, motif, tête
  const rel0 = Math.floor(cx - a);
  const stripe = Math.max(1, Math.round(a / 3.2));
  for (const [x, y] of body) {
    if (edge(x, y)) {
      set(x, y, 'o');
      continue;
    }
    const rel = x - rel0;
    const dy = (y + 0.5 - cy) / b;
    let k = 'b';
    if (inHead(x, y) && !inAbdomen(x, y)) {
      set(x, y, f.has('mask') ? 'm' : 'h');
      continue;
    }
    {
      if (look.pattern === 'stripes') k = Math.floor(rel / stripe) % 2 === 1 ? 's' : 'b';
      else if (look.pattern === 'thin') k = rel % 3 === 1 ? 's' : 'b';
      else if (look.pattern === 'bands') k = (rel > a * 0.45 && rel < a * 0.8) || (rel > a * 1.05 && rel < a * 1.35) ? 's' : 'b';
      else if (look.pattern === 'spots') k = hash(x, y, seed) % 4 === 0 ? 's' : 'b';
      else if (look.pattern === 'split') k = dy > 0 ? 's' : 'b';
      else if (look.pattern === 'plain') k = dy > 0.45 ? 's' : 'b';
    }
    if (f.has('bones') && k === 's') k = 'B';
    set(x, y, k);
  }

  // Texture du corps
  for (const [x, y] of body) {
    if (edge(x, y) || (inHead(x, y) && !inAbdomen(x, y))) continue;
    if ((f.has('speckle') || f.has('rock')) && hash(x, y, seed + 7) % (f.has('rock') ? 3 : 5) === 0) set(x, y, 'k');
    if (f.has('crystal') && (x + y) % 4 === 0) set(x, y, 'x');
  }
  if (f.has('shine')) {
    const sy = Math.floor(cy - b * 0.45);
    for (let x = Math.round(cx - a * 0.4); x <= Math.round(cx + a * 0.15); x++) if (inBody(x, sy) && !edge(x, sy)) set(x, sy, 'x');
  }
  if (f.has('rivets')) for (const [x, y] of body) if (edge(x, y) && y > cy && x % 3 === 0) set(x, y, 'r');
  if (f.has('fluff'))
    for (const [x, y] of body) {
      if (!edge(x, y) || y > cy) continue;
      set(x, y, 'f');
      if (hash(x, y, seed) % 3 === 0 && !has(x, y - 1)) set(x, y - 1, 'f');
    }

  // Œil, sur l'avant de la tête
  const ey = Math.floor(hcy - hr * 0.25);
  let ex = Math.floor(hcx + hr * 0.35);
  while (ex > hx && (!inBody(ex, ey) || edge(ex, ey))) ex--;
  set(ex, ey, f.has('mask') ? 'E' : 'e');

  // Dard
  const sy = Math.round(cy - 0.5);
  set(left - 1, sy, 'o');
  if (f.has('stinger')) {
    set(left - 2, sy, 'o');
    set(left - 2, sy + 1, 'V');
  }

  // Pattes
  for (const lx of [Math.round(cx - a * 0.2), Math.round(cx + a * 0.25), Math.round(cx + a * 0.65)]) {
    const by = bottom(lx);
    if (by >= 0) set(lx, by + 1, 'o');
  }

  // Coulures, bulles, flammes, étincelles
  if (f.has('drip'))
    for (let x = left + 1; x < cx + a * 0.6; x += 3) {
      const by = bottom(x);
      set(x, by + 1, 'd');
      if (hash(x, by, seed) % 2 === 0) set(x, by + 2, 'd');
    }
  if (f.has('bubbles')) {
    set(left - 2, Math.round(cy - b) - 1, 'u');
    set(left - 1, Math.round(cy - b) - 3, 'u');
  }
  if (f.has('flame'))
    for (let x = left + 1; x < Math.round(cx - a * 0.2); x += 2) {
      const t = top(x);
      set(x, t - 1, 'F');
      if (hash(x, t, seed) % 2 === 0) set(x, t - 2, 'F');
    }
  if (f.has('sparkle'))
    for (const [x, y] of [
      [left - 1, Math.round(cy - b) - 2],
      [right + 1, Math.round(cy + b * 0.6)],
      [hx - 3, Math.round(cy - b) - 4],
    ])
      if (!has(x, y)) set(x, y, 'p');

  // Tête : antennes ou cornes, couronne, fleur, auréole
  if (f.has('horns')) {
    set(hx + 1, ty - 1, 'H');
    set(hx + 1, ty - 2, 'H');
    set(hx + 2, ty - 3, 'H');
  } else {
    const long = f.has('antennae');
    set(hx + 1, ty - 1, 'o');
    set(hx + 2, ty - 2, 'o');
    if (long) set(hx + 3, ty - 3, 'o');
  }
  if (type === 'queen') {
    set(hx - 2, ty - 1, 'c');
    set(hx - 1, ty - 1, 'C');
    set(hx, ty - 1, 'c');
    set(hx - 2, ty - 2, 'c');
    set(hx, ty - 2, 'c');
  } else if (type === 'princess') {
    set(hx - 2, ty - 1, 't');
    set(hx - 1, ty - 1, 't');
    set(hx, ty - 1, 't');
    set(hx - 1, ty - 2, 't');
  } else if (f.has('crest')) {
    set(hx - 1, ty - 1, 'c');
  }
  if (f.has('flower')) {
    const fx = hx - 4;
    const fy = top(fx) - 2;
    set(fx, fy, 'Y');
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(fx + dx, fy + dy, 'P');
  }
  if (f.has('halo')) for (let x = hx - 3; x <= hx + 1; x++) set(x, ty - (type === 'drone' ? 3 : 4), 'G');

  // Chapeaux de saison (les reines gardent leur couronne)
  if (season && type !== 'queen') {
    if (season === 'halloween') {
      for (let x = hx - 2; x <= hx; x++) {
        set(x, ty - 1, 'Q');
        set(x, ty - 2, 'Q');
      }
      set(hx - 1, ty - 3, 'q');
    } else if (season === 'noel') {
      for (let x = hx - 2; x <= hx; x++) set(x, ty - 1, 'f');
      set(hx - 2, ty - 2, 'R');
      set(hx - 1, ty - 2, 'R');
      set(hx - 1, ty - 3, 'R');
      set(hx, ty - 4, 'f');
    }
  }

  return px;
}

function paints(color: string, secondary: string): Record<string, Paint> {
  return {
    o: ['#2b1d0e'],
    b: [`#${color}`],
    s: [`#${secondary}`],
    e: ['#ffffff'],
    h: ['#3b2f1c'],
    w: ['#e6f3ff', 0.85],
    W: ['#9fb4c8', 0.9],
    x: ['#ffffff', 0.7],
    x2: ['#bdf4ff', 0.85],
    l: ['#9ccc65', 0.85],
    a: ['#8fd3f4', 0.8],
    S: [`#${secondary}`, 0.9],
    c: ['#ffd23f'],
    C: ['#e74c3c'],
    t: ['#ff8fc7'],
    H: ['#5a1a1a'],
    f: ['#fffaf0'],
    g: [`#${secondary}`, 0.3],
    G: ['#ffe066'],
    k: ['#000000', 0.22],
    B: ['#f4f1e6'],
    r: ['#9aa3ab'],
    d: [`#${secondary}`],
    m: ['#1b1b2a'],
    E: ['#ffef5a'],
    V: ['#9b2fae'],
    p: ['#fff6a0'],
    P: ['#ff8fc7'],
    Y: ['#ffd23f'],
    u: ['#d6f0ff', 0.85],
    F: ['#ff7a1a'],
    Q: ['#ff8c1a'],
    q: ['#3f8f2a'],
    R: ['#d62828'],
  };
}

type Run = { x: number; y: number; w: number; k: string };
const cache = new Map<string, Run[]>();

/** Regroupe les pixels voisins de même couleur en bandes horizontales (bien moins d'éléments SVG). */
function runs(key: string, build: () => Pixels): Run[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const px = build();
  const out: Run[] = [];
  for (let y = 0; y < W; y++) {
    let x = 0;
    while (x < W) {
      const k = px.get(y * W + x);
      if (!k) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < W && px.get(y * W + end) === k) end++;
      out.push({ x, y, w: end - x, k });
      x = end;
    }
  }
  cache.set(key, out);
  return out;
}

/** Petites surprises du calendrier : citrouille le 31 octobre, bonnet autour de Noël. */
function season(): string {
  const d = new Date();
  if (d.getMonth() === 9 && d.getDate() === 31) return 'halloween';
  if (d.getMonth() === 11 && d.getDate() >= 20 && d.getDate() <= 26) return 'noel';
  return '';
}

export function lookOf(species: Species | undefined, id: string, type: BeeType, lifespanOf: (allele: string) => number) {
  const look = (species && BRANCH_LOOKS[species.branch]) || DEFAULT_LOOK;
  const base = species ? lifeSize(lifespanOf(species.template.lifespan)) : 2;
  const size = base + (look.size ?? 0) + (type === 'queen' ? 1 : 0);
  return { look, size, seed: seedOf(id) };
}

export function BeeIcon({
  color,
  secondary,
  type = 'drone',
  size = 48,
  unknown = false,
  species,
  x,
  y,
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
}) {
  const { content } = useGame();
  const spec = species ? content.species[species] : undefined;
  const { look, size: sizeIndex, seed } = lookOf(spec, species ?? 'default', type, (allele) => content.alleles.lifespan?.[allele]?.value ?? 30);
  const when = season();
  const list = runs(`${species ?? ''}|${type}|${sizeIndex}|${when}`, () => draw(look, sizeIndex, type, seed, when));
  const palette = paints(color, secondary);
  return (
    <svg className="bee-icon" x={x} y={y} width={size} height={size} viewBox={`0 0 ${W} ${W}`} shapeRendering="crispEdges" aria-hidden>
      {list.map((r, i) => {
        if (unknown && (r.k === 'g' || r.k === 'k' || r.k === 'x')) return null;
        const [fill, opacity] = palette[r.k] ?? ['#ff00ff'];
        return (
          <rect
            key={i}
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
}
