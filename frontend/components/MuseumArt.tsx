'use client';

import { memo } from 'react';
import { type Ctx, rect, shade, sprite, usePixelCanvas } from '@/lib/pixel';
import { CELL, PER_SHELF, SHELF, vitrineSize } from './MuseumLayout';

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
const STAR = ['.s.', 'sSs', '.s.'];

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
