import { type Ctx, pixelUrl, shade, shaded } from '@/lib/pixel';
import type { Badge, PlayerBadges } from '@/lib/types';

const METALS: Record<string, [string, string, string]> = {
  // clair, foncé, ruban
  bronze: ['#e6a165', '#a8622c', '#7a4a8a'],
  silver: ['#eef2f5', '#9aa7b1', '#3f78b5'],
  gold: ['#ffe27a', '#d49a00', '#c0392b'],
  diamond: ['#e3fbff', '#5fc8e8', '#2c3e8f'],
};
export const METAL_LABELS: Record<string, string> = { bronze: 'bronze', silver: 'argent', gold: 'or', diamond: 'diamant' };

/** Médaille en pixel art (20 × 25) : ruban, disque ombré et liseré clair. */
function drawMedal(ctx: Ctx, light: string, dark: string, ribbon: string, branch: boolean) {
  shaded(ctx, 20, 25, (x, y) => y <= 8 && ((x >= 4 && x <= 8) || (x >= 11 && x <= 15)), ribbon);
  shaded(ctx, 20, 25, (x, y) => (x - 9.5) ** 2 + (y - 16) ** 2 <= 72, light, { outline: dark });
  shaded(ctx, 20, 25, (x, y) => {
    const d = (x - 9.5) ** 2 + (y - 16) ** 2;
    return d <= 40 && d > 26;
  }, shade(light, 0.4), { outline: shade(light, 0.2) });
  if (branch) shaded(ctx, 20, 25, (x, y) => Math.abs(x - 9.5) <= 3.5 && Math.abs(y - 16) <= 4.5 - Math.abs(x - 9.5) * 0.55, '#ffffff');
}

/** Médaille : métal pour un succès, couleurs de la branche pour une branche complète. */
export function Medal({ badge, size = 34 }: { badge: Badge; size?: number }) {
  const [light, dark, ribbon] =
    badge.kind === 'branch' ? [`#${badge.color}`, `#${badge.secondary}`, '#5a3a1a'] : METALS[badge.metal ?? 'bronze'];
  const title = badge.kind === 'achievement' ? `${badge.label} (${METAL_LABELS[badge.metal ?? 'bronze']}) · ${badge.desc}` : badge.desc;
  const branch = badge.kind === 'branch';
  const src = pixelUrl(`medal|${light}|${dark}|${ribbon}|${branch}`, 20, 25, (ctx) => drawMedal(ctx, light, dark, ribbon, branch));
  return (
    <span className="medal" role="img" aria-label={title} title={title} style={{ width: size, height: size * 1.25 }}>
      <img className="pixel" src={src} width={size} height={size * 1.25} alt="" />
      {!branch && (
        <span className="medal-icon" style={{ fontSize: size * 0.34 }}>
          {badge.icon}
        </span>
      )}
    </span>
  );
}

export function RankChip({ badges }: { badges: PlayerBadges }) {
  if (!badges.rank) return null;
  return (
    <span className="rank-chip" title={`${badges.species} espèces découvertes`}>
      👑 {badges.rank.label}
    </span>
  );
}

/** Rangée de médailles ; au-delà de `max`, un compteur « +N ». */
export function BadgeStrip({ badges, max = 8 }: { badges: PlayerBadges; max?: number }) {
  const list = badges.badges;
  if (!list.length) return null;
  return (
    <span className="badge-strip">
      {list.slice(0, max).map((b) => (
        <Medal key={b.id} badge={b} size={26} />
      ))}
      {list.length > max && (
        <span className="more" title={list.slice(max).map((b) => b.label).join(', ')}>
          +{list.length - max}
        </span>
      )}
    </span>
  );
}
