import { type Ctx, noise, pixelUrl, rect, shade, shaded, sprite } from '@/lib/pixel';

// ---- Ruche-monde -----------------------------------------------------------

const TW = 240;
const TH = 150;
const CELLS = 24;

/**
 * L'arbre-monde : un arbre géant sous un ciel de crépuscule, avec une ruche nichée dans le creux de son tronc.
 * Chaque niveau achevé allume deux alvéoles de plus (jusqu'à toutes) et une lanterne dans les branches.
 */
function drawWorldTree(ctx: Ctx, level: number) {
  // Ciel : nuit en haut, crépuscule doré à l'horizon, tramé entre les bandes
  const bands = ['#1b2150', '#2d2f6e', '#4f3f8a', '#8a5a9a', '#d4807a', '#f2b06a'];
  const bh = 120 / bands.length;
  for (let y = 0; y < 120; y++) {
    const k = Math.floor(y / bh);
    for (let x = 0; x < TW; x++) {
      const dither = y % bh >= bh - 3 && (x + y) % 2 === 0 && k + 1 < bands.length;
      rect(ctx, x, y, 1, 1, bands[dither ? k + 1 : k]);
    }
  }
  for (let k = 0; k < 70; k++) {
    const x = Math.floor(noise(k, 21) * TW);
    const y = Math.floor(noise(k, 22) * 55);
    rect(ctx, x, y, 1, 1, noise(k, 23) > 0.75 ? '#ffffff' : '#b9c3ff');
  }
  // Collines lointaines
  for (let x = 0; x < TW; x++) {
    const h = 104 + Math.round(Math.sin(x / 19) * 5 + Math.sin(x / 7) * 1.5);
    for (let y = h; y < 130; y++) rect(ctx, x, y, 1, 1, '#4a3a6e');
  }
  // Sol herbeux
  for (let x = 0; x < TW; x++) {
    const h = 128 + Math.round(Math.sin(x / 11) * 1.5);
    for (let y = h; y < TH; y++) rect(ctx, x, y, 1, 1, y === h ? '#7cb342' : noise(x, y, 6) > 0.85 ? '#33691e' : '#43702a');
  }

  const cx = 78; // l'arbre se tient à gauche : la droite reste libre pour l'interface
  const bark = '#6d4325';
  // Racines
  for (const [dir, len, drop] of [[-1, 34, 5], [1, 30, 6], [-1, 20, 9], [1, 22, 10]]) {
    for (let t = 0; t <= len; t++) {
      const x = cx + dir * (10 + t);
      const y = 120 + Math.round(drop * Math.sqrt(t / len)) + 2;
      const w = Math.max(1, Math.round(5 * (1 - t / len)));
      rect(ctx, x, y - w, 1, w + 1, shade(bark, -0.15));
    }
  }
  // Tronc : large à la base, il se resserre puis s'évase dans les branches
  const half = (y: number) => (y > 100 ? 15 + (y - 100) * 0.45 : y > 50 ? 12 + (100 - y) * 0.02 : 12 + (50 - y) * 0.25);
  shaded(ctx, TW, TH, (x, y) => y >= 28 && y <= 128 && Math.abs(x - cx - Math.sin(y / 18) * 2) <= half(y), bark, {
    pattern: (x, y) => noise(x, Math.floor(y / 3), 8) > 0.7,
  });
  // Maîtresses branches
  for (const [dir, y0, len, rise] of [[-1, 50, 38, 22], [1, 46, 44, 20], [-1, 36, 26, 18], [1, 34, 30, 22]]) {
    for (let t = 0; t <= len; t++) {
      const x = cx + dir * (8 + t);
      const y = y0 - Math.round(rise * (t / len) ** 0.8);
      const w = Math.max(2, Math.round(6 * (1 - t / len)) + 1);
      rect(ctx, x, y, 1, w, t % 5 === 0 ? shade(bark, -0.2) : bark);
      rect(ctx, x, y, 1, 1, shade(bark, 0.25));
    }
  }
  // Feuillage : grappes de feuilles en plusieurs verts, éclairées par le haut
  const greens = ['#1e5a2e', '#2e7d32', '#388e3c', '#4caf50'];
  for (let k = 0; k < 26; k++) {
    const fx = cx - 62 + noise(k, 31) * 124;
    const fy = 6 + noise(k, 32) * 30 + Math.abs(fx - cx) * 0.18;
    const r = 9 + noise(k, 33) * 7;
    shaded(ctx, TW, TH, (x, y) => (x - fx) ** 2 + ((y - fy) * 1.2) ** 2 <= r * r, greens[k % greens.length], {
      pattern: (x, y) => noise(x, y, k) > 0.82,
    });
  }
  // Lucioles dorées dans le feuillage
  for (let k = 0; k < 24; k++) rect(ctx, Math.floor(cx - 60 + noise(k, 41) * 120), Math.floor(8 + noise(k, 42) * 40), 1, 1, '#fff59d');

  // Creux du tronc, où la ruche est nichée
  const hx = cx;
  const hy = 82;
  shaded(ctx, TW, TH, (x, y) => (x - hx) ** 2 / 100 + (y - hy) ** 2 / 225 <= 1, '#2a160a', { outline: '#3e2414' });
  // Rayons de la ruche : une grille d'alvéoles, allumées selon le niveau
  const lit = Math.min(CELLS, 2 + level * 2);
  let n = 0;
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 4; col++) {
      const x = hx - 7 + col * 4 + (row % 2) * 2;
      const y = hy - 11 + row * 4;
      if ((x + 1.5 - hx) ** 2 / 64 + (y + 1.5 - hy) ** 2 / 169 > 1) continue;
      const on = n++ < lit;
      sprite(ctx, ['.oo.', 'obbo', 'obbo', '.oo.'], x, y, on ? { o: '#c98a00', b: '#ffc93c' } : { o: '#5a3a1a', b: '#7a5226' });
      if (on) rect(ctx, x + 1, y + 1, 1, 1, '#fff3b0');
    }
  }
  // Coulures de miel sous le creux
  for (const [dx, len] of [[-3, 4], [2, 6], [5, 3]]) for (let t = 0; t < len; t++) rect(ctx, hx + dx, hy + 14 + t, 1, 1, '#f5a800');
  // Lanternes dans les branches, une par niveau achevé (jusqu'à 10)
  const spots = [[44, 34], [112, 30], [56, 22], [100, 20], [36, 44], [124, 40], [68, 14], [90, 12], [28, 30], [132, 26]];
  spots.slice(0, Math.min(level, spots.length)).forEach(([x, y]) => {
    rect(ctx, x, y - 3, 1, 3, '#3e2414');
    sprite(ctx, ['.oo.', 'oyyo', 'oyyo', '.oo.'], x - 1, y, { o: '#8a5a2b', y: '#ffd54f' });
  });
  // Quelques abeilles autour du creux
  for (const [x, y] of [[96, 72], [101, 80], [60, 76], [94, 92], [64, 96]]) {
    rect(ctx, x, y, 2, 1, '#ffd54f');
    rect(ctx, x + 1, y, 1, 1, '#3e2723');
    rect(ctx, x, y - 1, 1, 1, '#e3f2fd');
  }
}

/** Image de fond de la Ruche-monde, selon le nombre de niveaux achevés. */
export function worldTreeUrl(level: number) {
  const key = Math.min(level, CELLS);
  return pixelUrl(`world-tree|${key}`, TW, TH, (ctx) => drawWorldTree(ctx, key));
}
