import { type Ctx, pixelUrl, rect, shaded } from '@/lib/pixel';

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

