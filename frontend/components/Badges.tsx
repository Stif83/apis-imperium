import type { Badge, PlayerBadges } from '@/lib/types';

const METALS: Record<string, [string, string, string]> = {
  // clair, foncé, ruban
  bronze: ['#e6a165', '#a8622c', '#7a4a8a'],
  silver: ['#eef2f5', '#9aa7b1', '#3f78b5'],
  gold: ['#ffe27a', '#d49a00', '#c0392b'],
  diamond: ['#e3fbff', '#5fc8e8', '#2c3e8f'],
};
export const METAL_LABELS: Record<string, string> = { bronze: 'bronze', silver: 'argent', gold: 'or', diamond: 'diamant' };

/** Médaille : métal pour un succès, couleurs de la branche pour une branche complète. */
export function Medal({ badge, size = 34 }: { badge: Badge; size?: number }) {
  const [light, dark, ribbon] =
    badge.kind === 'branch' ? [`#${badge.color}`, `#${badge.secondary}`, '#5a3a1a'] : METALS[badge.metal ?? 'bronze'];
  const gid = `m-${badge.id.replace(/[^a-z0-9]/gi, '')}`;
  const title = badge.kind === 'achievement' ? `${badge.label} (${METAL_LABELS[badge.metal ?? 'bronze']}) · ${badge.desc}` : badge.desc;
  return (
    <svg width={size} height={size * 1.25} viewBox="0 0 40 50" role="img" aria-label={title}>
      <title>{title}</title>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={light} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
      </defs>
      <path d="M10 0h8l4 16h-8zM22 0h8l-4 16h-8z" fill={ribbon} />
      <circle cx="20" cy="31" r="17" fill={`url(#${gid})`} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
      <circle cx="20" cy="31" r="12.5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      {badge.kind === 'branch' ? (
        <polygon points="20,23 27,27 27,35 20,39 13,35 13,27" fill="rgba(255,255,255,0.85)" stroke="rgba(0,0,0,0.25)" />
      ) : (
        <text x="20" y="36.5" textAnchor="middle" fontSize="14">
          {badge.icon}
        </text>
      )}
    </svg>
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
