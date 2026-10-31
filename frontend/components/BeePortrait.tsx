'use client';

import { lookOf } from '@/components/BeeArt';
import { memo } from 'react';
import { useContent } from '@/lib/game';
import type { BeeType } from '@/lib/types';

// Portrait d'une espèce en pixel art détaillé (grille 48×48) : ombrage en trois tons, contours,
// et une anatomie propre à chaque branche (tête, yeux, antennes, corps, thorax, pattes, dard).
// Les ailes, le motif et les particularités viennent du sprite (BRANCH_LOOKS dans BeeIcon).

const W = 48;

type Head = 'round' | 'big' | 'small' | 'long' | 'helmet' | 'skull' | 'hood';
type Eyes = 'normal' | 'big' | 'glow' | 'tiny' | 'visor' | 'gem';
type Antennae = 'short' | 'long' | 'curly' | 'feather' | 'horns' | 'antlers' | 'bolt' | 'none';
type Body = 'oval' | 'long' | 'round' | 'segmented' | 'armored';
type Thorax = 'fur' | 'plate' | 'mane';
type Legs = 'normal' | 'long' | 'thick';
type Tail = 'stinger' | 'long' | 'drill' | 'none';
type Anatomy = { head: Head; eyes: Eyes; antennae: Antennae; body: Body; thorax: Thorax; legs: Legs; tail: Tail; fangs?: boolean };

const BASE: Anatomy = { head: 'round', eyes: 'normal', antennae: 'long', body: 'oval', thorax: 'fur', legs: 'normal', tail: 'stinger' };
const A = (a: Partial<Anatomy>): Anatomy => ({ ...BASE, ...a });

const ANATOMY: Record<string, Anatomy> = {
  Mellifères: A({}),
  Nobles: A({ eyes: 'big', antennae: 'feather', thorax: 'mane' }),
  Industrieuses: A({ head: 'small', eyes: 'big', body: 'long', legs: 'long' }),
  Héroïques: A({ head: 'helmet', antennae: 'short', body: 'round', thorax: 'plate', legs: 'thick' }),
  Frugales: A({ head: 'small', eyes: 'tiny', antennae: 'short', body: 'long' }),
  Infernales: A({ eyes: 'glow', antennae: 'horns', thorax: 'plate', tail: 'long' }),
  Tropicales: A({ head: 'big', eyes: 'big', antennae: 'curly' }),
  Glaciales: A({ antennae: 'feather', body: 'round', thorax: 'mane' }),
  Marécageuses: A({ head: 'long', eyes: 'big', antennae: 'short', body: 'long', legs: 'long' }),
  Agricoles: A({ body: 'round', thorax: 'mane' }),
  Monastiques: A({ head: 'hood', eyes: 'tiny', antennae: 'short' }),
  Néant: A({ head: 'hood', eyes: 'glow', body: 'long' }),
  Festives: A({ head: 'big', eyes: 'big', antennae: 'curly', body: 'round' }),
  Vengeresses: A({ head: 'hood', eyes: 'glow', antennae: 'horns', tail: 'long' }),
  Stériles: A({ head: 'small', eyes: 'tiny', antennae: 'short', body: 'long' }),
  Macabres: A({ head: 'skull', eyes: 'glow', antennae: 'none', body: 'segmented' }),
  Minérales: A({ head: 'helmet', eyes: 'tiny', antennae: 'short', body: 'armored', legs: 'thick' }),
  Métalliques: A({ head: 'helmet', eyes: 'visor', antennae: 'short', body: 'segmented', thorax: 'plate', legs: 'thick' }),
  Précieuses: A({ eyes: 'gem', antennae: 'feather', thorax: 'mane' }),
  Gemmes: A({ eyes: 'gem', thorax: 'plate' }),
  Nucléaires: A({ head: 'big', eyes: 'glow', antennae: 'bolt', body: 'round' }),
  Aquatiques: A({ head: 'long', eyes: 'big', antennae: 'none', body: 'long', tail: 'none' }),
  Gourmandes: A({ head: 'big', antennae: 'curly', body: 'round' }),
  Fermières: A({ body: 'round', thorax: 'mane' }),
  Volcaniques: A({ head: 'helmet', eyes: 'glow', antennae: 'horns', body: 'armored', thorax: 'plate' }),
  Venimeuses: A({ head: 'long', eyes: 'glow', tail: 'long', fangs: true }),
  Gluantes: A({ head: 'big', eyes: 'big', antennae: 'curly', body: 'round', tail: 'none' }),
  Caustiques: A({ head: 'long', eyes: 'glow', antennae: 'curly', tail: 'long', fangs: true }),
  Énergiques: A({ head: 'small', eyes: 'big', antennae: 'bolt', body: 'long', legs: 'long' }),
  Ténébreuses: A({ head: 'hood', eyes: 'glow' }),
  Fossiles: A({ head: 'helmet', eyes: 'tiny', antennae: 'short', body: 'segmented', legs: 'thick' }),
  Pétrolières: A({ eyes: 'visor', antennae: 'short', body: 'long', thorax: 'plate' }),
  Arcaniques: A({ eyes: 'glow', antennae: 'curly' }),
  Enchantées: A({ eyes: 'big', antennae: 'antlers' }),
  Nocturnes: A({ head: 'big', eyes: 'big', antennae: 'feather', thorax: 'mane' }),
  Solaires: A({ eyes: 'glow', thorax: 'mane' }),
  Célestes: A({ eyes: 'gem', antennae: 'feather' }),
  Aurorales: A({ eyes: 'big', antennae: 'feather' }),
  Pluviales: A({ eyes: 'big' }),
  Orageuses: A({ eyes: 'glow', antennae: 'bolt' }),
  Neigeuses: A({ antennae: 'feather', body: 'round', thorax: 'mane' }),
  Terroirs: A({ antennae: 'antlers' }),
  Florales: A({ eyes: 'big', antennae: 'curly' }),
  Sociales: A({ head: 'small', antennae: 'short' }),
  Serricoles: A({ eyes: 'big', antennae: 'curly', thorax: 'mane' }),
  Recluses: A({ head: 'hood', eyes: 'tiny', antennae: 'short' }),
  Mécaniques: A({ head: 'helmet', eyes: 'visor', antennae: 'bolt', body: 'segmented', thorax: 'plate', legs: 'thick', tail: 'drill' }),
  Chaotiques: A({ head: 'big', eyes: 'glow', antennae: 'curly', body: 'segmented' }),
  Harmonieuses: A({ eyes: 'gem', antennae: 'feather' }),
  Temporelles: A({ eyes: 'gem', body: 'segmented' }),
  Légendaires: A({ head: 'big', eyes: 'gem', antennae: 'feather', thorax: 'mane' }),
  Sauvages: A({ head: 'long', eyes: 'big', antennae: 'antlers', body: 'segmented', thorax: 'mane', legs: 'long' }),
  Mythiques: A({ head: 'big', eyes: 'gem', antennae: 'feather', body: 'long', thorax: 'mane' }),
};

function hash(x: number, y: number, seed: number) {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

function mix(hex: string, to: string, t: number) {
  const a = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const b = [0, 2, 4].map((i) => parseInt(to.slice(i, i + 2), 16));
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

type Px = Map<number, string>;

/** Ton d'une surface éclairée par en haut à gauche : 0 ombre, 1 base, 2 lumière. */
const tone = (nx: number, ny: number) => {
  const l = -(nx * 0.55 + ny * 0.85);
  return l > 0.5 ? '2' : l < -0.4 ? '0' : '1';
};

// Couleurs translucides (ailes, aura, reflets) : estompées pour une espèce inconnue
const GHOST = new Set(['w', 'W', 'V', 'x2', 'l', 'l2', 'a', 'a2', 'S', 'g', 'g2', 'u', 'u2', 'p', 'p2', 'x']);

function draw(look: ReturnType<typeof lookOf>['look'], anatomy: Anatomy, sizeIndex: number, type: BeeType, seed: number): Px {
  const px: Px = new Map();
  const set = (x: number, y: number, k: string) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < W && y >= 0 && y < W) px.set(y * W + x, k);
  };
  const get = (x: number, y: number) => px.get(Math.round(y) * W + Math.round(x));
  const f = new Set<string>(look.features);
  const size = 0.82 + 0.07 * Math.max(0, Math.min(5, sizeIndex));

  /** Remplit une forme (test sur le centre des pixels) et trace son contour par-dessus ce qu'elle recouvre. */
  const shape = (inside: (x: number, y: number) => boolean, fill: (x: number, y: number) => string | null, rim: string | null = 'o') => {
    const cells: [number, number][] = [];
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) if (inside(x + 0.5, y + 0.5)) cells.push([x, y]);
    const mine = new Set(cells.map(([x, y]) => y * W + x));
    const has = (x: number, y: number) => mine.has(y * W + x);
    for (const [x, y] of cells) {
      const edge = !has(x - 1, y) || !has(x + 1, y) || !has(x, y - 1) || !has(x, y + 1);
      const key = edge && rim ? rim : fill(x, y);
      if (key) set(x, y, key);
    }
    return cells;
  };
  const ellipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;

  // ---- Mise en place : abdomen, thorax, tête, centrés dans la case
  const dims: Record<Body, [number, number]> = { oval: [11, 8], long: [13.5, 6.5], round: [11, 9.5], segmented: [12, 7.5], armored: [11.5, 8.5] };
  const headR: Record<Head, number> = { round: 5.6, big: 7, small: 4.4, long: 5, helmet: 6, skull: 5.8, hood: 6 };
  // Les plus grandes (corps allongé, grosse tête) sont réduites pour tenir dans la case
  const thoraxR = anatomy.thorax === 'plate' ? 5.2 : 5.6;
  const natural = (dims[anatomy.body][0] * 2 + thoraxR * 2 + headR[anatomy.head] * 1.6) * size + 8;
  const k = size * Math.min(1, (W - 4) / natural);
  const rx = dims[anatomy.body][0] * k;
  const ry = dims[anatomy.body][1] * k;
  const tr = thoraxR * k;
  const hr = headR[anatomy.head] * k;
  const span = rx * 2 + 2 + tr * 2 + hr * 1.6 + 6;
  const ax = (W - span) / 2 + 3 + rx;
  const ay = 30;
  const tx = ax + rx * 0.88 + tr * 0.55;
  const ty = ay - 2;
  const hx = tx + tr + hr * 0.45;
  const hy = ty - 2.5;
  const left = ax - rx;
  const width = rx * 2;

  // ---- Ailes, derrière le corps
  const wingScale = { big: 1.2, small: 0.7, butterfly: 1.2 }[look.wings as string] ?? 1;
  const tall = look.wings === 'butterfly' ? 1.25 : 1;
  const wings = [
    { cx: tx - 6 * k, cy: ty - tr - 5 * k, rx: 10.5 * k * wingScale, ry: 5.2 * k * wingScale * tall, ang: -0.42 },
    { cx: tx + 1.5 * k, cy: ty - tr - 7 * k, rx: 8.5 * k * wingScale, ry: 4.2 * k * wingScale * tall, ang: -0.95 },
  ];
  for (const [i, w] of wings.entries()) {
    const c = Math.cos(w.ang);
    const s = Math.sin(w.ang);
    const local = (x: number, y: number) => {
      const dx = x - w.cx;
      const dy = y - w.cy;
      return [(dx * c + dy * s) / w.rx, (-dx * s + dy * c) / w.ry];
    };
    const inside = (x: number, y: number) => {
      const [u, v] = local(x, y);
      if (look.wings === 'crystal') return Math.abs(u) + Math.abs(v) <= 1;
      if (look.wings === 'leaf') return Math.abs(v) <= 1 - u * u;
      if (look.wings === 'tattered' && v > 0.35 && hash(Math.floor(x), Math.floor(y), seed + i) % 3 === 0) return false;
      return u * u + v * v <= 1;
    };
    shape(
      inside,
      (x, y) => {
        const [u, v] = local(x + 0.5, y + 0.5);
        if (look.wings === 'butterfly') return u * u + v * v < 0.12 ? 'b1' : (u + 0.3) ** 2 + v * v < 0.03 ? 'o' : 'S';
        if (look.wings === 'leaf') return Math.abs(v) < 0.14 ? 'l2' : 'l';
        if (look.wings === 'aqua') return Math.round((u + 1) * 4) % 2 === 0 ? 'a2' : 'a';
        if (look.wings === 'crystal') return Math.abs(u - v) < 0.14 ? 'x' : 'x2';
        // Nervures : une le long de l'aile, une en travers
        if (Math.abs(v + u * 0.15) < 0.1 || Math.abs(u + 0.25) < 0.07) return 'V';
        return 'w';
      },
      look.wings === 'butterfly' ? 'o' : 'W',
    );
  }

  // ---- Pattes
  const legLen = anatomy.legs === 'long' ? 6 : 4;
  for (const [i, dx] of [-3, 0, 3].entries()) {
    const lx = tx + dx * k - 1;
    const ly = ty + tr - 1;
    for (let j = 0; j < legLen; j++) {
      const x = lx - (j > legLen / 2 ? j - legLen / 2 : 0) + (i === 2 ? 1 : 0);
      set(x, ly + j, 'o');
      if (anatomy.legs === 'thick') set(x + 1, ly + j, 'o');
    }
  }

  // ---- Dard
  if (anatomy.tail === 'stinger') {
    set(left - 1, ay, 'o');
    set(left - 2, ay, 'o');
    set(left - 1, ay + 1, 'o');
  } else if (anatomy.tail === 'long') {
    for (let i = 1; i <= 4; i++) set(left - i, ay + Math.floor(i / 3), i === 4 ? 'P' : 'o');
    set(left - 1, ay + 1, 'o');
  } else if (anatomy.tail === 'drill') {
    for (let i = 1; i <= 5; i++) for (let j = -Math.floor((5 - i) / 2); j <= Math.floor((5 - i) / 2); j++) set(left - i + 1, ay + j, i % 2 ? 'r' : 'r2');
  }

  // ---- Abdomen et son motif
  const pattern = (x: number, y: number) => {
    const rel = (x + 0.5 - left) / width;
    const ny = (y + 0.5 - ay) / ry;
    switch (look.pattern) {
      case 'stripes':
        return Math.floor(rel * 7) % 2 === 1;
      case 'thin':
        return Math.floor(rel * 14) % 3 === 1;
      case 'bands':
        return (rel > 0.3 && rel < 0.42) || (rel > 0.56 && rel < 0.68);
      case 'spots':
        return hash(x >> 1, y >> 1, seed) % 4 === 0;
      case 'split':
        return ny > 0;
      default:
        return ny > 0.5;
    }
  };
  const abdomenFill = (cx: number, cy: number, erx: number, ery: number) => (x: number, y: number) => {
    const t = tone((x + 0.5 - cx) / erx, (y + 0.5 - cy) / ery);
    if (pattern(x, y)) return f.has('bones') ? `B${t}` : `s${t}`;
    return `b${t}`;
  };
  const segments: [number, number, number, number][] =
    anatomy.body === 'segmented'
      ? [
          [ax - rx * 0.6, ay + 1, rx * 0.45, ry * 0.85],
          [ax, ay, rx * 0.5, ry],
          [ax + rx * 0.55, ay - 0.5, rx * 0.42, ry * 0.82],
        ]
      : [[ax, ay, rx, ry]];
  const abdomen: [number, number][] = [];
  for (const [cx, cy, erx, ery] of segments) abdomen.push(...shape(ellipse(cx, cy, erx, ery), abdomenFill(cx, cy, erx, ery)));
  const inAbdomen = new Set(abdomen.map(([x, y]) => y * W + x));
  const bodyCell = (x: number, y: number) => inAbdomen.has(y * W + x) && get(x, y) !== 'o';
  if (anatomy.body === 'armored')
    for (const p of [0.25, 0.45, 0.65]) {
      const x = Math.round(left + width * p);
      for (let y = 0; y < W; y++) if (bodyCell(x, y)) set(x, y, 'k');
    }

  // Textures et particularités de l'abdomen
  for (const [x, y] of abdomen) {
    if (!bodyCell(x, y)) continue;
    if ((f.has('speckle') || f.has('rock')) && hash(x, y, seed + 7) % (f.has('rock') ? 4 : 7) === 0) set(x, y, f.has('rock') && hash(x, y, seed) % 2 ? 'R' : 'k');
    if (f.has('crystal') && (x + y) % 5 === 0) set(x, y, 'x');
  }
  if (f.has('shine')) {
    const y = Math.round(ay - ry * 0.55);
    for (let x = Math.round(ax - rx * 0.5); x <= Math.round(ax + rx * 0.1); x++) if (bodyCell(x, y)) set(x, y, 'x');
  }
  if (f.has('rivets')) for (const p of [0.2, 0.4, 0.6, 0.8]) set(left + width * p, ay + ry * 0.7, 'r');
  const topOf = (x: number) => abdomen.filter(([bx]) => bx === Math.round(x)).reduce((m, [, by]) => Math.min(m, by), W);
  const bottomOf = (x: number) => abdomen.filter(([bx]) => bx === Math.round(x)).reduce((m, [, by]) => Math.max(m, by), -1);
  if (f.has('fluff'))
    for (let x = Math.round(left + 2); x < ax + rx * 0.7; x++) {
      const t = topOf(x);
      set(x, t, 'f');
      if (hash(x, t, seed) % 2 === 0) set(x, t - 1, 'f');
    }
  if (f.has('flame'))
    for (let x = Math.round(left + 2); x < ax; x += 3) {
      const t = topOf(x);
      const h = 2 + (hash(x, t, seed) % 3);
      for (let j = 1; j <= h; j++) set(x, t - j, j === h ? 'F2' : 'F');
      set(x + 1, t - 1, 'F');
    }
  if (f.has('drip'))
    for (let x = Math.round(left + 3); x < ax + rx * 0.5; x += 4) {
      const b = bottomOf(x);
      const h = 1 + (hash(x, b, seed) % 3);
      for (let j = 1; j <= h; j++) set(x, b + j, 'd');
    }

  // ---- Thorax
  const thorax = shape(ellipse(tx, ty, tr, tr * 0.95), (x, y) => {
    const t = tone((x + 0.5 - tx) / tr, (y + 0.5 - ty) / tr);
    if (anatomy.thorax === 'plate') return t === '2' ? 'x' : `t${t}`;
    return hash(x, y, seed + 3) % 4 === 0 ? 'tf' : `t${t}`;
  });
  if (anatomy.thorax === 'mane') {
    const cells = new Set(thorax.map(([x, y]) => y * W + x));
    for (const [x, y] of thorax) if (y < ty - tr * 0.3 && !cells.has((y - 1) * W + x) && hash(x, y, seed) % 2 === 0) set(x, y - 1, 'f');
  }
  if (f.has('flower')) {
    const fx = tx - 1;
    const fy = ty - tr - 1;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(fx + dx, fy + dy, 'Pk');
    set(fx, fy, 'Y');
  }

  // ---- Tête
  const headTone = anatomy.head === 'skull' ? 'B' : anatomy.head === 'hood' || f.has('mask') ? 'm' : 'h';
  const headShape = anatomy.head === 'long' ? ellipse(hx + 1, hy, hr * 1.35, hr * 0.85) : ellipse(hx, hy, hr, hr);
  shape(headShape, (x, y) => {
    const nx = (x + 0.5 - hx) / hr;
    const ny = (y + 0.5 - hy) / hr;
    if (anatomy.head === 'helmet' && ny < -0.15) return tone(nx, ny) === '2' ? 'x' : `b${tone(nx, ny)}`;
    if (anatomy.head === 'hood' && nx < -0.1) return 's0';
    return `${headTone}${tone(nx, ny)}`;
  });
  if (anatomy.head === 'helmet') set(hx - hr * 0.5, hy - hr * 0.35, 'r');

  // Yeux
  const ex = Math.round(hx + hr * (anatomy.head === 'long' ? 0.75 : 0.35));
  const ey = Math.round(hy - hr * 0.25);
  const square = (key: string) => {
    for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) set(ex + dx, ey + dy, key);
  };
  if (anatomy.head === 'skull') {
    square('o');
    if (anatomy.eyes === 'glow') set(ex, ey, 'G');
  } else if (anatomy.eyes === 'normal') {
    square('e');
    set(ex, ey, 'E');
  } else if (anatomy.eyes === 'big') {
    for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.abs(dx) + Math.abs(dy - 0.5) < 2.4) set(ex + dx, ey + dy, 'e');
    set(ex - 1, ey - 1, 'E');
    set(ex, ey, 'E');
  } else if (anatomy.eyes === 'glow') {
    square('G');
    set(ex + 1, ey, 'E');
  } else if (anatomy.eyes === 'tiny') {
    set(ex, ey, 'e');
  } else if (anatomy.eyes === 'visor') {
    for (let x = Math.round(hx - hr * 0.2); x <= Math.round(hx + hr * 0.9); x++) {
      if (get(x, ey) && get(x, ey) !== 'o') set(x, ey, 'v');
      if (get(x, ey + 1) && get(x, ey + 1) !== 'o') set(x, ey + 1, 'v2');
    }
  } else if (anatomy.eyes === 'gem') {
    for (const [dx, dy] of [[0, -1], [-1, 0], [0, 0], [1, 0], [0, 1]]) set(ex + dx, ey + dy, 's2');
    set(ex, ey, 'E');
  }
  if (anatomy.fangs) {
    const fx = Math.round(hx + hr * (anatomy.head === 'long' ? 1.2 : 0.7));
    const fy = Math.round(hy + hr * 0.55);
    set(fx, fy, 'B1');
    set(fx, fy + 1, 'B1');
    set(fx - 2, fy + 1, 'B1');
  }

  // Antennes
  const top = Math.round(hy - hr);
  const bases: [number, number][] = [
    [Math.round(hx + hr * 0.05), top],
    [Math.round(hx + hr * 0.5), top + 1],
  ];
  for (const [i, [bx, by]] of bases.entries()) {
    const path = (steps: [number, number][], key = 'o', thick = false) => {
      let x = bx;
      let y = by;
      for (const [dx, dy] of steps) {
        x += dx;
        y += dy;
        set(x, y, key);
        if (thick) set(x + 1, y, key);
      }
      return [x, y];
    };
    switch (anatomy.antennae) {
      case 'short':
        path([[0, -1], [1, -1]]);
        break;
      case 'long': {
        const [x, y] = path([[0, -1], [0, -1], [1, -1], [1, -1], [1, 0]]);
        set(x + 1, y, 'o');
        set(x + 1, y + 1, 'o');
        break;
      }
      case 'curly':
        path([[0, -1], [0, -1], [1, -1], [1, 0], [1, 1], [-1, 1]]);
        break;
      case 'feather': {
        let x = bx;
        let y = by;
        for (const [j, [dx, dy]] of ([[0, -1], [1, -1], [0, -1], [1, -1], [1, -1]] as [number, number][]).entries()) {
          x += dx;
          y += dy;
          set(x, y, 'o');
          if (j > 0) set(x - 1, y, 'f');
        }
        break;
      }
      case 'horns': {
        // Deux cornes épaisses, recourbées vers l'arrière et vers l'avant, à pointe claire
        const [x, y] = i === 0 ? path([[0, -1], [-1, -1], [-1, -1], [-1, -1], [0, -1]], 'H', true) : path([[0, -1], [1, -1], [0, -1], [1, -1]], 'H', true);
        set(x, y - 1, 'H2');
        break;
      }
      case 'antlers': {
        const [x, y] = path([[0, -1], [0, -1], [1, -1], [0, -1]]);
        set(x - 1, y - 1, 'o');
        set(x + 1, y - 1, 'o');
        set(bx - 1, by - 2, 'o');
        break;
      }
      case 'bolt': {
        const [x, y] = path([[0, -1], [1, -1], [-1, -1], [1, -1]]);
        set(x + 1, y - 1, 'Y');
        break;
      }
    }
  }

  // ---- Couronne, diadème, crête, auréole
  const crownY = top - 1;
  const cx0 = Math.round(hx - hr * 0.75);
  if (type === 'queen') {
    for (let x = cx0; x <= cx0 + 4; x++) set(x, crownY, 'c');
    for (const x of [cx0, cx0 + 2, cx0 + 4]) set(x, crownY - 1, 'c');
    set(cx0 + 2, crownY, 'C');
    set(cx0 + 2, crownY - 2, 'c');
  } else if (type === 'princess') {
    for (let x = cx0; x <= cx0 + 3; x++) set(x, crownY, 't');
    set(cx0 + 1, crownY - 1, 't');
    set(cx0 + 2, crownY - 1, 't');
  } else if (f.has('crest')) {
    set(cx0 + 1, crownY, 'c');
    set(cx0 + 2, crownY - 1, 'c');
  }
  if (f.has('halo')) for (let x = Math.round(hx - hr); x <= Math.round(hx + hr * 0.6); x++) set(x, crownY - 4, x % 2 ? 'Gh' : 'Gh2');

  // ---- Bulles, étincelles
  if (f.has('bubbles'))
    for (const [x, y, r] of [
      [left - 3, ay - ry - 2, 1.6],
      [left - 1, ay - ry - 7, 1.1],
      [left - 5, ay - ry - 10, 0.8],
    ])
      shape(ellipse(x, y, r + 0.4, r + 0.4), () => 'u', 'u2');
  if (f.has('sparkle'))
    for (const [x, y] of [
      [left - 3, ay - ry - 5],
      [hx + hr + 2, ay + 4],
      [tx - 9, 5],
    ]) {
      set(x, y, 'p');
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!get(x + dx, y + dy)) set(x + dx, y + dy, 'p2');
    }

  // ---- Aura : autour des parties pleines, sur les cases vides, en dégradé tramé
  if (f.has('glow')) {
    const solid = [...px.entries()].filter(([, v]) => !GHOST.has(v)).map(([i]) => i);
    for (const i of solid) {
      const x = i % W;
      const y = Math.floor(i / W);
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          const d = Math.abs(dx) + Math.abs(dy);
          if (d === 0 || d > 3 || get(x + dx, y + dy)) continue;
          if (d === 3 && (x + dx + y + dy) % 2) continue;
          set(x + dx, y + dy, d === 1 ? 'g' : 'g2');
        }
    }
  }
  return px;
}

function palette(color: string, secondary: string): Record<string, [string, number?]> {
  const tones = (hex: string, prefix: string): Record<string, [string]> => ({
    [`${prefix}0`]: [mix(hex, '000000', 0.32)],
    [`${prefix}1`]: [`#${hex}`],
    [`${prefix}2`]: [mix(hex, 'ffffff', 0.4)],
  });
  return {
    o: ['#24180c'],
    ...tones(color, 'b'),
    ...tones(secondary, 's'),
    // Thorax teinté de la couleur de l'espèce, pour que la tête (plus sombre) s'en détache
    ...tones(mix(color, '2a1a0a', 0.62).slice(1), 't'),
    ...tones('3b2f1c', 'h'),
    ...tones('2a2a40', 'm'),
    ...tones('ece6d2', 'B'),
    tf: ['#7a5c3a'],
    e: ['#111111'],
    E: ['#ffffff'],
    G: [mix(secondary, 'ffffff', 0.5)],
    g: [`#${secondary}`, 0.45],
    g2: [`#${secondary}`, 0.22],
    w: ['#e8f4ff', 0.75],
    W: ['#8ea6bd', 0.95],
    V: ['#9fb4c8', 0.8],
    x: ['#ffffff', 0.75],
    x2: ['#bdf4ff', 0.85],
    l: ['#9ccc65', 0.85],
    l2: ['#5f8f2f', 0.9],
    a: ['#8fd3f4', 0.8],
    a2: ['#5fb3e0', 0.85],
    S: [`#${secondary}`, 0.92],
    c: ['#ffd23f'],
    C: ['#e74c3c'],
    t: ['#ff8fc7'],
    H: ['#6b1d1d'],
    H2: ['#e8d8c0'],
    f: ['#fff7e6'],
    k: ['#000000', 0.25],
    R: ['#9a9aa0'],
    r: ['#a9b2ba'],
    r2: ['#6f7a84'],
    d: [`#${secondary}`],
    v: ['#7af5ff'],
    v2: ['#2fb5c9'],
    P: ['#9b2fae'],
    Pk: ['#ff8fc7'],
    Y: ['#ffe14d'],
    Gh: ['#ffe066'],
    Gh2: ['#ffd23f'],
    u: ['#e6f6ff', 0.6],
    u2: ['#8fd3f4', 0.9],
    p: ['#fffbe0'],
    p2: ['#fff1a0', 0.8],
    F: ['#ff7a1a'],
    F2: ['#ffd23f'],
  };
}

type Run = { x: number; y: number; w: number; k: string };
const cache = new Map<string, Run[]>();

/** Regroupe les pixels voisins de même couleur en bandes horizontales, une fois par espèce et par caste. */
function runsOf(key: string, build: () => Map<number, string>): Run[] {
  const hit = cache.get(key);
  if (hit) return hit;
  const px = build();
  const out: Run[] = [];
  for (let y = 0; y < W; y++)
    for (let x = 0; x < W; ) {
      const kx = px.get(y * W + x);
      if (!kx) {
        x++;
        continue;
      }
      let end = x + 1;
      while (end < W && px.get(y * W + end) === kx) end++;
      out.push({ x, y, w: end - x, k: kx });
      x = end;
    }
  cache.set(key, out);
  return out;
}

/** Couleur et opacité d'une bande ; une espèce inconnue n'est qu'une silhouette, sans aura ni étincelles. */
function paintOf(r: Run, colors: Record<string, [string, number?]>, unknown: boolean): { fill: string; opacity?: number } | null {
  if (!unknown) {
    const [fill, opacity] = colors[r.k] ?? ['#ff00ff'];
    return { fill, opacity };
  }
  if (['g', 'g2', 'p', 'p2'].includes(r.k)) return null;
  return { fill: colors[r.k]?.[0] ?? '#ff00ff', opacity: GHOST.has(r.k) && r.k !== 'x' ? 0.45 : 1 };
}

export const BeePortrait = memo(function BeePortrait({
  species,
  type = 'queen',
  size = 288,
  unknown = false,
  variant,
}: {
  species: string;
  type?: BeeType;
  size?: number;
  unknown?: boolean;
  /** Variante rare : sa robe remplace les couleurs de l'espèce */
  variant?: string;
}) {
  const content = useContent();
  const spec = content.species[species];
  const { look, size: sizeIndex, seed } = lookOf(spec, species, type, (allele) => content.alleles.lifespan?.[allele]?.value ?? 30);
  const anatomy = ANATOMY[spec?.branch] ?? BASE;
  const runs = runsOf(`${species}|${type}`, () => draw(look, anatomy, sizeIndex, type, seed));
  const robe = variant ? content.variants[variant] : undefined;
  const colors = palette(robe?.color ?? spec.color, robe?.secondary ?? spec.secondary);
  return (
    <svg
      className={`bee-portrait${robe ? ` rare rare-${variant}` : ''}`}
      width={size}
      height={size}
      viewBox={`0 0 ${W} ${W}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={unknown ? 'Espèce inconnue' : robe ? `${spec.label} ${robe.label.toLowerCase()}` : spec.label}
    >
      {runs.map((r) => {
        const paint = paintOf(r, colors, unknown);
        if (!paint) return null;
        return (
          <rect
            key={`${r.x},${r.y}`}
            x={r.x}
            y={r.y}
            width={r.w + 0.02}
            height={1.02}
            fill={paint.fill}
            fillOpacity={paint.opacity}
            style={unknown ? { fill: 'var(--unknown)' } : undefined}
          />
        );
      })}
    </svg>
  );
});
