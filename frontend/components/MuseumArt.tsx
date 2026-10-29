'use client';

import { memo } from 'react';
import { type Ctx, rect, shade, sprite, usePixelCanvas } from '@/lib/pixel';

/** Un objet exposé : sa couleur, sa forme (rayon ou bocal) et la part déjà donnée (0 à 1). */
export type Exhibit = { color: string; comb: boolean; frac: number };

// Sprites 8 × 9 : 'i' = intérieur, qui se remplit de bas en haut avec la couleur de l'objet
const JAR = [
  '.LLLLLL.',
  '..GiiG..',
  '.GiiiiG.',
  'GiiiiiiG',
  'GiiiiiiG',
  'GiiiiiiG',
  'GiiiiiiG',
  'GiiiiiiG',
  '.GGGGGG.',
];
const COMB = [
  'FFFFFFFF',
  'FihihihF',
  'FhiihiiF',
  'FihihihF',
  'FhiihiiF',
  'FihihihF',
  'FhiihiiF',
  'FihihihF',
  'FFFFFFFF',
];
const BEE = ['..ww..', '.wwww.', 'ykyky.', 'ykykyk', '.yky..'];
const STAR = ['.s.', 'sSs', '.s.'];

const CELL = 12;
const PER_SHELF = 6;
const SHELF = 14;

function drawExhibit(ctx: Ctx, e: Exhibit, x: number, y: number, back: string) {
  const rows = e.comb ? COMB : JAR;
  // Lignes de l'intérieur remplies, en partant du bas ; une part entamée montre au moins une ligne
  const inner = rows.map((r, j) => (r.includes('i') ? j : -1)).filter((j) => j >= 0);
  const filled = e.frac >= 1 ? inner.length : e.frac > 0 ? Math.max(1, Math.floor(e.frac * inner.length)) : 0;
  const firstFilled = inner.length ? inner[inner.length - filled] ?? Infinity : Infinity;
  const ghost = shade(back, 0.18);
  const color = `#${e.color}`;
  sprite(
    ctx,
    rows,
    x,
    y,
    { L: '#8d6e63', G: '#d7eef5', F: e.frac > 0 ? '#e0b866' : shade(back, 0.3) },
    (ch, i, j) => {
      if (ch === 'i') return j >= firstFilled ? (i === 1 || i === 2 ? shade(e.color, 0.35) : color) : ghost;
      if (ch === 'h') return j >= firstFilled ? shade(e.color, -0.35) : shade(back, 0.1);
      return undefined;
    },
  );
  if (e.frac >= 1) sprite(ctx, STAR, x + 6, y - 2, { s: '#fff3b0', S: '#ffffff' });
}

/** Taille d'une vitrine, en pixels de jeu, selon le nombre d'objets exposés. */
export function vitrineSize(n: number) {
  const shelves = Math.max(1, Math.ceil(n / PER_SHELF));
  return { w: PER_SHELF * CELL + 8, h: 14 + shelves * SHELF + 9 };
}

/** Vitrine d'une branche : un cadre en bois (doré une fois complète), une étagère par rangée d'objets. */
export const Vitrine = memo(function Vitrine({ exhibits, color, complete }: { exhibits: Exhibit[]; color: string; complete: boolean }) {
  const { w, h } = vitrineSize(exhibits.length);
  const key = exhibits.map((e) => `${e.color}${e.comb ? 'c' : 'j'}${e.frac.toFixed(2)}`).join('|');
  const ref = usePixelCanvas(
    w,
    h,
    (ctx) => {
      const wood = complete ? '#c9971c' : '#7a4a24';
      const back = shade(color, -0.6);
      // Cadre, fronton aux couleurs de la branche, fond de velours
      rect(ctx, 0, 4, w, h - 4, wood);
      rect(ctx, 2, 0, w - 4, 6, shade(wood, -0.25));
      rect(ctx, 6, 1, w - 12, 3, `#${color}`);
      rect(ctx, 3, 8, w - 6, h - 15, back);
      rect(ctx, 3, 8, w - 6, 1, shade(back, -0.3));
      // Étagères et objets
      exhibits.forEach((e, k) => {
        const shelf = Math.floor(k / PER_SHELF);
        const col = k % PER_SHELF;
        const inShelf = Math.min(PER_SHELF, exhibits.length - shelf * PER_SHELF);
        const offset = ((PER_SHELF - inShelf) * CELL) / 2;
        const sy = 10 + shelf * SHELF;
        drawExhibit(ctx, e, 4 + offset + col * CELL + 2, sy + 2, back);
        if (col === 0) {
          rect(ctx, 3, sy + 11, w - 6, 2, shade(wood, 0.15));
          rect(ctx, 3, sy + 13, w - 6, 1, shade(wood, -0.35));
        }
      });
      // Reflets sur la vitre
      ctx.globalAlpha = 0.12;
      for (let d = 0; d < 3; d++) {
        for (let k = 0; k < h - 15; k++) rect(ctx, 8 + d * 2 + k, 8 + k, 1, 1, '#ffffff');
      }
      ctx.globalAlpha = 1;
      // Socle et plaque
      rect(ctx, 0, h - 7, w, 7, shade(wood, -0.2));
      rect(ctx, w / 2 - 10, h - 6, 20, 4, complete ? '#ffe082' : '#b08d57');
      rect(ctx, w / 2 - 8, h - 5, 16, 1, complete ? '#fff8e1' : '#d6b97c');
      if (complete) {
        sprite(ctx, STAR, 1, 2, { s: '#fff3b0', S: '#ffffff' });
        sprite(ctx, STAR, w - 4, 2, { s: '#fff3b0', S: '#ffffff' });
      }
    },
    [key, color, complete],
  );
  return <canvas ref={ref} className="pixel vitrine" style={{ width: w * 3, aspectRatio: `${w} / ${h}` }} aria-hidden />;
});

const HALL_W = 240;
const HALL_H = 96;

/** Hall du musée : colonnes, lumière des verrières, un socle doré par collection complète, et des abeilles qui volent. */
export const MuseumHall = memo(function MuseumHall({ complete, total }: { complete: number; total: number }) {
  const ref = usePixelCanvas(
    HALL_W,
    HALL_H,
    (ctx, t) => {
      // Mur et lambris
      rect(ctx, 0, 0, HALL_W, 58, '#f3e2b3');
      rect(ctx, 0, 0, HALL_W, 4, '#d9bf86');
      rect(ctx, 0, 44, HALL_W, 16, '#8d5a2b');
      for (let x = 0; x < HALL_W; x += 12) rect(ctx, x, 46, 1, 12, '#6d4320');
      rect(ctx, 0, 44, HALL_W, 1, '#b07a3c');
      // Verrières en arc et rayons de lumière
      for (let x = 16; x < HALL_W; x += 52) {
        rect(ctx, x + 4, 8, 16, 20, '#bfe3f2');
        rect(ctx, x + 6, 6, 12, 2, '#bfe3f2');
        rect(ctx, x + 11, 8, 2, 20, '#d9bf86');
        rect(ctx, x + 4, 17, 16, 1, '#d9bf86');
        ctx.globalAlpha = 0.18;
        for (let k = 0; k < 40; k++) rect(ctx, x + 4 + k / 3, 28 + k, 16 + k / 2, 1, '#fffbe6');
        ctx.globalAlpha = 1;
      }
      // Colonnes
      for (let x = 2; x < HALL_W; x += 52) {
        rect(ctx, x, 4, 10, 4, '#e8d9b0');
        rect(ctx, x + 2, 8, 6, 52, '#efe3c2');
        rect(ctx, x + 2, 8, 1, 52, '#ffffff');
        rect(ctx, x + 7, 8, 1, 52, '#c9b88f');
        rect(ctx, x, 58, 10, 3, '#d6c69c');
      }
      // Sol en damier
      for (let y = 60; y < HALL_H; y += 4) {
        for (let x = 0; x < HALL_W; x += 8) {
          rect(ctx, x, y, 8, 4, (x / 8 + (y - 60) / 4) % 2 ? '#b07a3c' : '#d9a55c');
        }
      }
      // Un socle par collection complète (jusqu'à 14), puis un socle vide qui attend la suivante
      const shown = Math.min(complete, 14);
      const slots = shown + (complete < total ? 1 : 0);
      const gap = slots ? Math.min(16, (HALL_W - 20) / slots) : 16;
      const start = (HALL_W - gap * slots) / 2;
      for (let k = 0; k < slots; k++) {
        const x = Math.round(start + k * gap);
        rect(ctx, x, 70, 10, 14, '#e8d9b0');
        rect(ctx, x - 1, 68, 12, 3, '#f5ecd2');
        rect(ctx, x - 1, 83, 12, 3, '#c9b88f');
        if (k < shown) {
          sprite(ctx, JAR, x + 1, 58, { L: '#b8860b', G: '#fff3b0', i: '#ffc107' });
          if (Math.floor(t / 400 + k) % 5 === 0) sprite(ctx, STAR, x + 6, 56, { s: '#fff3b0', S: '#ffffff' });
        }
      }
      // Abeilles
      for (let b = 0; b < 6; b++) {
        const speed = 0.012 + b * 0.003;
        const x = ((t * speed + b * 47) % (HALL_W + 20)) - 10;
        const y = 22 + b * 6 + Math.sin(t / 300 + b * 1.7) * 5;
        const flap = Math.floor(t / 100 + b) % 2;
        sprite(ctx, BEE, x, y, { w: flap ? '#ffffff' : '#dfe9f5', y: '#ffd54f', k: '#3e2723' });
      }
    },
    [complete, total],
    true,
  );
  return <canvas ref={ref} className="pixel museum-hall" aria-hidden />;
});
