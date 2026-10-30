'use client';

import { type Ctx, noise, pixelUrl, rect, shade, shaded, sprite } from '@/lib/pixel';

/** Pixel art des lieux : blasons des guildes du Comptoir, paysages des expéditions, Ruche-monde. */

// ---- Comptoir --------------------------------------------------------------

const GUILD_COLORS: Record<string, string> = {
  herbalists: '#4f8f2a',
  forge: '#8d3b2b',
  monastery: '#6d4c8a',
  court: '#b71c1c',
  explorers: '#00796b',
};

// Emblèmes 10 × 10 : 'a' clair, 'b' foncé
const EMBLEMS: Record<string, string[]> = {
  herbalists: ['......aa..', '....aaab..', '...aaabb..', '..aaabba..', '..aabba...', '.aabba....', '.abba.....', '.bb.......', 'b.........', '..........'],
  forge: ['..........', '.aaaaaaaa.', 'aaaaaaaaab', '.bbaaaabb.', '...aaab...', '...aaab...', '..aaaaab..', '.abbbbbbb.', '..........', '..........'],
  monastery: ['....a.....', '...aa.....', '....b.....', '...aaa....', '...aab....', '...aab....', '...aab....', '...aab....', '.abbbbba..', '..........'],
  court: ['..........', 'a...a...a.', 'aa.aaa.aa.', 'aaaaaaaaa.', 'aabaabaab.', 'aaaaaaaaa.', 'bbbbbbbbb.', '..........', '..........', '..........'],
  explorers: ['...aaaa...', '..a....a..', '.a..a...a.', '.a..ab..a.', '.a.abba.a.', '.a..bb..a.', '.a......a.', '..a....a..', '...aaaa...', '..........'],
};

/** Blason d'une guilde : écu à ses couleurs, emblème doré. */
export function GuildCrest({ guild, size = 36 }: { guild: string; size?: number }) {
  const color = GUILD_COLORS[guild] ?? '#8a5a2b';
  const src = pixelUrl(`guild|${guild}`, 18, 20, (ctx) => {
    shaded(ctx, 18, 20, (x, y) => x >= 1 && x <= 16 && (y <= 11 ? y >= 1 : Math.abs(x - 8.5) <= 7.5 - (y - 11) * 0.9), color, {
      outline: '#3b2f1c',
    });
    sprite(ctx, EMBLEMS[guild] ?? [], 4, 4, { a: '#ffe082', b: '#c99a2e' });
  });
  return <img className="pixel" src={src} width={size} height={(size * 20) / 18} alt="" aria-hidden />;
}

/** Porte de boutique fermée : une place libre au comptoir. */
export function ShopDoor({ size = 40 }: { size?: number }) {
  const src = pixelUrl('shop-door', 16, 20, (ctx) => {
    shaded(ctx, 16, 20, (x, y) => x >= 1 && x <= 14 && y >= 1 && (y > 5 || (x - 7.5) ** 2 + (y - 6) ** 2 <= 42), '#8a5a2b', {
      pattern: (x) => x % 4 === 0,
    });
    rect(ctx, 10, 11, 2, 2, '#ffd54f');
    rect(ctx, 4, 7, 8, 3, '#e8d9b0');
    rect(ctx, 5, 8, 6, 1, '#8a5a2b');
  });
  return <img className="pixel" src={src} width={size} height={(size * 20) / 16} alt="" aria-hidden />;
}

// ---- Expéditions -----------------------------------------------------------

const BW = 120;
const BH = 40;

function sky(ctx: Ctx, top: string, bottom: string, h = BH) {
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < BW; x++) {
      const t = y / h + (noise(x, y, 3) - 0.5) * 0.15;
      rect(ctx, x, y, 1, 1, t < 0.5 ? top : bottom);
    }
  }
}

/** Relief : remplit sous la courbe `height(x)` avec un dessus plus clair. */
function land(ctx: Ctx, height: (x: number) => number, color: string, rim = shade(color, 0.25)) {
  for (let x = 0; x < BW; x++) {
    const h = Math.round(height(x));
    for (let y = Math.max(0, h); y < BH; y++) rect(ctx, x, y, 1, 1, y === h ? rim : noise(x, y, 7) > 0.88 ? shade(color, -0.2) : color);
  }
}

function stars(ctx: Ctx, n: number, maxY: number, seed = 1) {
  for (let k = 0; k < n; k++) rect(ctx, Math.floor(noise(k, seed) * BW), Math.floor(noise(k, seed + 1) * maxY), 1, 1, noise(k, seed + 2) > 0.6 ? '#ffffff' : '#a9b6ff');
}

const REGIONS: Record<string, (ctx: Ctx) => void> = {
  jungle(ctx) {
    sky(ctx, '#7fb8a0', '#a8d5b5');
    for (let k = 0; k < 30; k++) rect(ctx, Math.floor(noise(k, 4) * BW), Math.floor(noise(k, 5) * 30), 1, 3, '#d8efff');
    for (let k = 0; k < 9; k++) {
      const cx = k * 15 + 4;
      rect(ctx, cx, 24, 2, 16, '#5d3a1a');
      shaded(ctx, BW, BH, (x, y) => (x - cx) ** 2 + (y - 20) ** 2 <= 60, k % 2 ? '#2e7d32' : '#388e3c');
    }
    land(ctx, (x) => 34 + Math.sin(x / 9) * 1.5, '#1b5e20');
  },
  glacier(ctx) {
    sky(ctx, '#bfe3f2', '#e8f6fb');
    shaded(ctx, BW, BH, (x, y) => y >= 14 && y <= 30 && x >= 70 && x <= 100 && y >= 14 + Math.abs(x - 85) * 0.9, '#ffffff', { outline: '#8fb8cc' });
    land(ctx, (x) => 31 + Math.sin(x / 7) * 1.2, '#dff3fb', '#ffffff');
    for (let x = 0; x < BW; x += 9) rect(ctx, x, 35, 5, 1, '#9cc9dd');
    for (let k = 0; k < 18; k++) rect(ctx, Math.floor(noise(k, 8) * BW), Math.floor(noise(k, 9) * 28), 1, 1, '#ffffff');
  },
  glass_desert(ctx) {
    sky(ctx, '#7ec8ee', '#cdeaf7');
    shaded(ctx, BW, BH, (x, y) => (x - 100) ** 2 + (y - 8) ** 2 <= 20, '#fff176', { outline: '#ffd54f' });
    land(ctx, (x) => 27 + Math.sin(x / 14) * 3, '#e6c27a');
    for (let k = 0; k < 6; k++) {
      const x0 = k * 21 + 5;
      shaded(ctx, BW, BH, (x, y) => x >= x0 && x <= x0 + 9 && y >= 31 && y <= 34, '#bdf1ff', { outline: '#6fbfd6' });
      rect(ctx, x0 + 2, 32, 2, 1, '#ffffff');
    }
  },
  volcano(ctx) {
    sky(ctx, '#4a1c1c', '#8c3a1e');
    for (let k = 4; k >= 0; k--) shaded(ctx, BW, BH, (x, y) => (x - 61 - k * 5) ** 2 + (y - 9 + k * 1.6) ** 2 <= (3 + k * 0.8) ** 2, shade('#6d6262', k * 0.06));
    land(ctx, (x) => 12 + Math.abs(x - 60) * 0.75, '#3e2723', '#5d4037');
    for (let y = 13; y < BH; y++) rect(ctx, 59 + Math.round(Math.sin(y / 3) * 2), y, 2, 1, y % 3 ? '#ff6d00' : '#ffca28');
    rect(ctx, 54, 12, 12, 2, '#ff9100');
  },
  abyss(ctx) {
    sky(ctx, '#0d3a5c', '#061a2e');
    ctx.globalAlpha = 0.15;
    for (let k = 0; k < 4; k++) for (let y = 0; y < BH; y++) rect(ctx, 10 + k * 30 + y / 2, y, 4, 1, '#bfe7ff');
    ctx.globalAlpha = 1;
    land(ctx, (x) => 32 + Math.sin(x / 6) * 2 + Math.sin(x / 17) * 2, '#2b3a42');
    for (let k = 0; k < 8; k++) {
      const x0 = Math.floor(noise(k, 11) * BW);
      for (let y = 22; y < 33; y++) rect(ctx, x0 + Math.round(Math.sin(y / 2 + k)), y, 1, 1, '#2e7d5b');
    }
    for (let k = 0; k < 10; k++) rect(ctx, Math.floor(noise(k, 12) * BW), Math.floor(noise(k, 13) * 28), 1, 1, '#9ee6ff');
  },
  night_sky(ctx) {
    sky(ctx, '#0b1033', '#1f2a5c');
    stars(ctx, 45, 26);
    shaded(ctx, BW, BH, (x, y) => (x - 20) ** 2 + (y - 9) ** 2 <= 20 && (x - 22) ** 2 + (y - 8) ** 2 > 14, '#f4ecd2');
    land(ctx, (x) => 16 + Math.abs(((x + 10) % 40) - 20) * 0.9, '#3b4a6b', '#e8eefc');
  },
  sky_isles(ctx) {
    sky(ctx, '#6ec3ee', '#b9e4f7');
    for (let k = 0; k < 8; k++) shaded(ctx, BW, BH, (x, y) => (x - k * 16) ** 2 / 90 + (y - 37) ** 2 / 12 <= 1, '#ffffff', { outline: '#dbe7f0' });
    const isle = (cx: number, cy: number, w: number) => {
      shaded(ctx, BW, BH, (x, y) => y >= cy && Math.abs(x - cx) <= w - (y - cy) * 1.2, '#795548');
      shaded(ctx, BW, BH, (x, y) => y >= cy - 1 && y <= cy + 1 && Math.abs(x - cx) <= w, '#66bb6a');
    };
    isle(30, 18, 12);
    isle(84, 12, 9);
    isle(104, 26, 6);
    sprite(ctx, ['.yy', 'yy.', '.yy', 'yy.', 'y..'], 58, 6, { y: '#fff176' });
  },
  world_core(ctx) {
    sky(ctx, '#1a1020', '#2a1430');
    land(ctx, (x) => 6 - Math.sin(x / 8) * 3, '#120a14');
    for (let x = 0; x < BW; x++) for (let y = 0; y < 5 + Math.round(Math.sin(x / 8) * 3); y++) rect(ctx, x, y, 1, 1, '#3a2a3e');
    for (let k = 0; k < 7; k++) {
      const x0 = 8 + k * 16;
      const c = k % 2 ? '#7c4dff' : '#26c6da';
      shaded(ctx, BW, BH, (x, y) => y >= 22 && y <= 33 && Math.abs(x - x0) <= (y - 22) * 0.4, c);
    }
    for (let x = 0; x < BW; x++) for (let y = 34; y < BH; y++) rect(ctx, x, y, 1, 1, noise(x, y, 2) > 0.6 ? '#ffca28' : '#ff6d00');
  },
  sunken_ruins(ctx) {
    sky(ctx, '#137a7f', '#0a4a55');
    land(ctx, (x) => 33 + Math.sin(x / 11) * 1.5, '#c2a878');
    for (let k = 0; k < 5; k++) {
      const x0 = 10 + k * 24;
      const top = 12 + ((k * 7) % 9);
      shaded(ctx, BW, BH, (x, y) => x >= x0 && x <= x0 + 5 && y >= top && y < 34, '#d7ccb0');
      rect(ctx, x0 - 1, top - 2, 8, 2, '#e8dfc6');
    }
    rect(ctx, 33, 14, 26, 3, '#d7ccb0');
    for (let k = 0; k < 8; k++) rect(ctx, Math.floor(noise(k, 14) * BW), 30 + Math.floor(noise(k, 15) * 4), 1, 1, '#ffd54f');
    for (let k = 0; k < 10; k++) rect(ctx, Math.floor(noise(k, 16) * BW), Math.floor(noise(k, 17) * 26), 1, 1, '#b2ebf2');
  },
};

/** Paysage d'une région d'expédition, en bannière. */
export function RegionBanner({ region, className = '' }: { region: string; className?: string }) {
  const src = pixelUrl(`region|${region}`, BW, BH, (ctx) => (REGIONS[region] ?? ((c) => sky(c, '#8fd3f4', '#c9ecf7')))(ctx));
  return <img className={`pixel region-banner ${className}`} src={src} alt="" aria-hidden />;
}
