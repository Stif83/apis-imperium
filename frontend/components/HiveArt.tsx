import { type Ctx, noise, pixelUrl, rect, shade, shaded } from '@/lib/pixel';

/** Ruches et décor des cartes de ruche, en pixel art. */

const HIVE_W = 46;
const HIVE_H = 42;

/** Ruche en paille tressée (un anneau par étage, l'alvéaire en a un de plus), ou robo-ruche en acier. */
function drawHive(ctx: Ctx, color: string, alveary: boolean, robo: boolean) {
  const cx = HIVE_W / 2 - 0.5;
  if (robo) {
    rect(ctx, 22, 0, 2, 7, '#546e7a');
    rect(ctx, 21, 0, 4, 2, '#00e676');
    shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= 7 && y <= 17 && Math.abs(x - cx) <= 16, '#90a4ae');
    shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= 17 && y <= 27 && Math.abs(x - cx) <= 18, '#b0bec5');
    shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= 26 && y <= 39 && Math.abs(x - cx) <= 20, '#90a4ae');
    rect(ctx, 11, 11, 3, 3, '#00e676');
    rect(ctx, 16, 11, 3, 3, '#ffca28');
    rect(ctx, 25, 10, 10, 5, '#263238');
    rect(ctx, 26, 11, 3, 1, '#4dd0e1');
    rect(ctx, 8, 32, 6, 1, '#607d8b');
    rect(ctx, 32, 32, 6, 1, '#607d8b');
    shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= 30 && y <= 37 && Math.abs(x - cx) <= 5, '#37474f');
    rect(ctx, 3, 40, 40, 2, '#455a64');
    return;
  }
  // Demi-largeur de chaque anneau, du haut vers le bas : un dôme qui s'arrondit vite puis tombe droit
  const rings = alveary ? [11, 16, 18, 19, 19] : [12, 17, 19, 19];
  const ringH = alveary ? 6 : 7;
  const bottom = 39;
  const top = bottom - rings.length * ringH;
  // Planche du dessus
  shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= top - 4 && y < top && Math.abs(x - cx) <= 7, '#8a5a2b');
  rings.forEach((half, i) => {
    const y0 = top + i * ringH;
    shaded(
      ctx,
      HIVE_W,
      HIVE_H,
      (x, y) => {
        // Chaque anneau est un boudin : ses bords haut et bas sont un peu rentrés, le premier s'arrondit en dôme
        const t = (y - y0) / ringH;
        const prev = i ? rings[i - 1] : half - 6;
        const w = i === 0 ? prev + (half - prev) * Math.sqrt(Math.min(1, t * 1.6)) : half - (t < 0.15 || t > 0.85 ? 1 : 0);
        return y >= y0 && y <= y0 + ringH && Math.abs(x - cx) <= w;
      },
      color,
      { pattern: (x, y) => (x + y * 2) % 5 === 0 },
    );
  });
  // Entrée et pierre du socle
  shaded(ctx, HIVE_W, HIVE_H, (x, y) => y <= bottom - 1 && (x - cx) ** 2 / 16 + (y - (bottom - 1)) ** 2 / 25 <= 1, '#4a2e14');
  shaded(ctx, HIVE_W, HIVE_H, (x, y) => y >= bottom && Math.abs(x - cx) <= 22, '#9e9e9e');
}

export function HiveArt({
  color = '#e0a95a',
  alveary = false,
  robo = false,
  className = 'hive-art',
  size,
}: {
  color?: string;
  alveary?: boolean;
  robo?: boolean;
  className?: string;
  size?: number;
}) {
  const src = pixelUrl(`hive|${color}|${alveary}|${robo}`, HIVE_W, HIVE_H, (ctx) => drawHive(ctx, color, alveary, robo));
  return <img className={`pixel ${className}`} src={src} width={size} alt="" aria-hidden />;
}

const SCENE_W = 150;
const SCENE_H = 75;
const SKIES: Record<string, string[]> = {
  day: ['#6ec3ee', '#8fd3f4', '#acdff6', '#c9ecf7'],
  dawn: ['#f59a7a', '#ffb38a', '#ffcb9c', '#ffe1b0'],
  dusk: ['#6f53a3', '#8d6bb8', '#c98a98', '#ffad7a'],
  night: ['#141c45', '#1f2a5c', '#2c3973', '#3b4a8a'],
};

function drawScene(ctx: Ctx, phase: string, weather: string, ground: string) {
  const sky = SKIES[phase] ?? SKIES.day;
  const wet = weather !== 'clear';
  // Ciel en bandes, tramées à la jonction
  const band = 60 / sky.length;
  for (let y = 0; y < 60; y++) {
    const k = Math.min(sky.length - 1, Math.floor(y / band));
    const next = sky[Math.min(sky.length - 1, k + 1)];
    for (let x = 0; x < SCENE_W; x++) {
      const dither = y % band >= band - 3 && (x + y) % 2 === 0;
      rect(ctx, x, y, 1, 1, wet ? shade(dither ? next : sky[k], -0.25) : dither ? next : sky[k]);
    }
  }
  if (phase === 'night') {
    for (let k = 0; k < 40; k++) {
      const x = Math.floor(noise(k, 1) * SCENE_W);
      const y = Math.floor(noise(k, 2) * 45);
      rect(ctx, x, y, 1, 1, noise(k, 3) > 0.7 ? '#ffffff' : '#9fb0e8');
    }
  }
  // Soleil ou lune
  const sx = 122;
  const sy = phase === 'dusk' ? 22 : 14;
  if (!wet || phase === 'night') {
    if (phase === 'night') {
      shaded(ctx, SCENE_W, SCENE_H, (x, y) => (x - sx) ** 2 + (y - sy) ** 2 <= 49 && (x - sx + 4) ** 2 + (y - sy + 2) ** 2 > 36, '#f4ecd2');
    } else {
      const sun = phase === 'dusk' ? '#ff9a5a' : '#ffd75a';
      ctx.globalAlpha = 0.35;
      shaded(ctx, SCENE_W, SCENE_H, (x, y) => (x - sx) ** 2 + (y - sy) ** 2 <= 110, '#fff3b0', { outline: '#fff3b0' });
      ctx.globalAlpha = 1;
      shaded(ctx, SCENE_W, SCENE_H, (x, y) => (x - sx) ** 2 + (y - sy) ** 2 <= 49, sun, { outline: shade(sun, -0.15) });
    }
  }
  // Nuages : deux petits par beau temps de jour, une couche grise par mauvais temps
  const cloud = (cx: number, cy: number, w: number, color: string) =>
    shaded(ctx, SCENE_W, SCENE_H, (x, y) => (x - cx) ** 2 / (w * w) + (y - cy) ** 2 / 16 <= 1 || (x - cx - w / 3) ** 2 / ((w / 2) ** 2) + (y - cy + 3) ** 2 / 16 <= 1, color, { outline: shade(color, -0.12) });
  if (wet) {
    for (let k = 0; k < 6; k++) cloud(k * 28 + 6, 6 + (k % 2) * 3, 16, weather === 'storm' ? '#6b7280' : '#aab4c0');
  } else if (phase === 'day' || phase === 'dawn') {
    cloud(30, 16, 12, '#ffffff');
    cloud(78, 9, 9, '#ffffff');
  }
  // Collines et herbe
  const hill = (x: number) => 57 + Math.round(Math.sin(x / 13) * 2 + Math.sin(x / 5.3) * 0.8);
  for (let x = 0; x < SCENE_W; x++) {
    const h = hill(x);
    for (let y = h; y < SCENE_H; y++) {
      let c = ground;
      if (y === h) c = shade(ground, 0.25);
      else if (noise(x, y, 5) > 0.86) c = shade(ground, -0.18);
      rect(ctx, x, y, 1, 1, phase === 'night' ? shade(c, -0.35) : c);
    }
    if (noise(x, 9) > 0.8) rect(ctx, x, h - 1, 1, 1, shade(ground, phase === 'night' ? -0.1 : 0.4));
  }
}

/** Décor d'une carte de ruche : ciel selon l'heure et la météo, soleil ou lune, sol aux couleurs du biome. */
export function sceneUrl(phase: string, weather: string, ground: string) {
  return pixelUrl(`scene|${phase}|${weather}|${ground}`, SCENE_W, SCENE_H, (ctx) => drawScene(ctx, phase, weather, `#${ground}`));
}
