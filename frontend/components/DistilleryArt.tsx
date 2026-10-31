'use client';

import { type Ctx, rect, shade, usePixelCanvas } from '@/lib/pixel';

const W = 128;
// Image figée : hauteur de chaque flamme, bulles dans le hublot, bouffées de vapeur (x, y, rayon)
const FLAMES = [5, 4, 7, 6, 5, 4];
const BUBBLES = [31, 35, 32];
const PUFFS = [
  [27, 6, 1],
  [23, 4, 2],
  [27, 2, 2],
];
const H = 72;

/** Disque plein, ligne par ligne (chaudière, bouchons, bulles). */
function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  for (let dy = -r; dy <= r; dy++) {
    const half = Math.round(Math.sqrt(r * r - dy * dy));
    rect(ctx, cx - half, cy + dy, half * 2 + 1, 1, color);
  }
}

/** Petite fiole d'étagère, de la couleur de l'élixir. */
function bottle(ctx: Ctx, x: number, y: number, color: string) {
  rect(ctx, x + 1, y, 2, 1, '#8d6e63');
  rect(ctx, x + 1, y + 1, 2, 2, '#d7eef5');
  rect(ctx, x, y + 3, 4, 4, '#d7eef5');
  rect(ctx, x, y + 4, 4, 3, `#${color}`);
  rect(ctx, x, y + 4, 1, 2, shade(color, 0.45));
}

/**
 * Atelier de la distillerie en pixel art : fourneau, alambic de cuivre, col de cygne, serpentin dans son
 * tonneau, fiole qui se remplit goutte à goutte, et étagère des élixirs en réserve. Une image fixe : le feu,
 * les bulles, la vapeur et la goutte sont figés à un instant choisi.
 */
export function DistilleryArt({ built, liquid, shelf }: { built: boolean; liquid: string; shelf: string[] }) {
  const ref = usePixelCanvas(
    W,
    H,
    (ctx) => {
      // Sans distillerie : le même atelier, éteint et poussiéreux
      const tone = (c: string) => (built ? c : shade(shade(c, -0.35), 0.15));
      // Mur de briques et sol de dalles
      rect(ctx, 0, 0, W, H, tone('#4a3a2e'));
      for (let y = 0; y < 58; y += 5) {
        rect(ctx, 0, y, W, 1, tone('#3a2c22'));
        for (let x = (y / 5) % 2 ? 0 : 6; x < W; x += 12) rect(ctx, x, y, 1, 5, tone('#3a2c22'));
      }
      rect(ctx, 0, 60, W, 12, tone('#2e241c'));
      for (let x = 0; x < W; x += 16) rect(ctx, x, 60, 1, 12, tone('#241b15'));
      rect(ctx, 0, 60, W, 1, tone('#5a4636'));

      // Fourneau et feu
      rect(ctx, 8, 42, 34, 18, tone('#7a3b2a'));
      for (let y = 45; y < 60; y += 4) rect(ctx, 8, y, 34, 1, tone('#5e2c1f'));
      rect(ctx, 16, 49, 18, 10, '#1a1210');
      if (built) {
        FLAMES.forEach((h, i) => {
          rect(ctx, 17 + i * 3, 58 - h, 2, h, i % 2 ? '#ff7a1a' : '#ffb300');
          rect(ctx, 17 + i * 3, 58 - (h - 3), 2, h - 3, '#ffd23f');
        });
        ctx.globalAlpha = 0.18;
        rect(ctx, 12, 40, 26, 3, '#ff7a1a');
        ctx.globalAlpha = 1;
      } else {
        rect(ctx, 17, 56, 16, 2, '#3b3b3b');
      }

      // Chaudière de cuivre, avec son hublot où bout l'élixir
      disc(ctx, 25, 31, 13, tone('#8a4520'));
      disc(ctx, 25, 30, 12, tone('#c56a2d'));
      disc(ctx, 21, 26, 5, tone('#e8945a'));
      rect(ctx, 13, 41, 24, 2, tone('#6b3418'));
      disc(ctx, 27, 33, 5, '#d7eef5');
      disc(ctx, 27, 33, 4, built ? `#${liquid}` : '#555555');
      if (built) {
        BUBBLES.forEach((by, b) => rect(ctx, 25 + b * 2, by, 1, 1, shade(liquid, 0.6)));
      }
      rect(ctx, 25, 31, 1, 1, '#ffffff');

      // Chapiteau, col de cygne qui descend vers le serpentin
      rect(ctx, 21, 13, 9, 6, tone('#c56a2d'));
      rect(ctx, 22, 13, 2, 6, tone('#e8945a'));
      rect(ctx, 19, 18, 13, 2, tone('#8a4520'));
      rect(ctx, 23, 9, 5, 4, tone('#c56a2d'));
      for (let x = 28; x < 76; x++) {
        const y = 10 + Math.round(((x - 28) / 48) * 16);
        rect(ctx, x, y, 1, 2, tone('#c56a2d'));
        rect(ctx, x, y, 1, 1, tone('#e8945a'));
      }

      // Vapeur au-dessus du chapiteau
      if (built) {
        ctx.globalAlpha = 0.35;
        for (const [x, y, r] of PUFFS) disc(ctx, x, y, r, '#f5f5f5');
        ctx.globalAlpha = 1;
      }

      // Tonneau du serpentin, cerclé de fer, le cuivre affleurant entre les douelles
      rect(ctx, 70, 26, 24, 34, tone('#8d5a2b'));
      for (let x = 72; x < 94; x += 4) rect(ctx, x, 26, 1, 34, tone('#6e4320'));
      rect(ctx, 70, 30, 24, 2, tone('#5d5d5d'));
      rect(ctx, 70, 54, 24, 2, tone('#5d5d5d'));
      rect(ctx, 71, 26, 22, 2, tone('#4f9fc4'));
      for (let y = 35; y < 52; y += 5) rect(ctx, 74, y, 16, 1, tone('#c56a2d'));

      // Robinet, goutte et fiole qui se remplit
      rect(ctx, 94, 48, 8, 2, tone('#c56a2d'));
      rect(ctx, 101, 48, 2, 4, tone('#c56a2d'));
      if (built) rect(ctx, 101, 58, 2, 2, `#${liquid}`);
      rect(ctx, 99, 58, 6, 3, '#d7eef5');
      rect(ctx, 97, 61, 10, 8, '#d7eef5');
      rect(ctx, 98, 64, 8, 5, built ? `#${liquid}` : '#666666');
      rect(ctx, 98, 64, 2, 3, built ? shade(liquid, 0.45) : '#777777');

      // Étagère des élixirs en réserve
      rect(ctx, 108, 14, 18, 44, tone('#5e3b1e'));
      for (let s = 0; s < 3; s++) {
        const sy = 26 + s * 14;
        rect(ctx, 107, sy, 20, 2, tone('#8d5a2b'));
        shelf.slice(s * 3, s * 3 + 3).forEach((color, i) => bottle(ctx, 110 + i * 5, sy - 8, color));
      }
    },
    [built, liquid, shelf.join(',')],
  );
  return <canvas ref={ref} className="pixel distillery-art" style={{ width: W * 3, aspectRatio: `${W} / ${H}` }} aria-hidden />;
}
