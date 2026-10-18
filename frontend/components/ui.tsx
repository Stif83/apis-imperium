'use client';

import type { ReactNode } from 'react';
import { useGame } from '@/lib/game';
import type { BeeType, Cost, Genome } from '@/lib/types';
import { BeeIcon } from './BeeIcon';

export const TYPE_LABELS: Record<BeeType, string> = { princess: 'Princesse', drone: 'Faux-bourdon', queen: 'Reine' };

export const fmt = (n: number) => n.toLocaleString('fr-FR');

export const PHASE_ICONS: Record<string, string> = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
export const WEATHER_ICONS: Record<string, string> = { clear: '', rain: '🌧️', storm: '⛈️', snow: '❄️' };

/** Heure du monde, commune à tous les joueurs (une journée de jeu = 24 minutes). */
export function WorldClock() {
  const { content, state } = useGame();
  const { hour, minute, phase } = state.world;
  const time = `${String(hour).padStart(2, '0')} h ${String(minute).padStart(2, '0')}`;
  return (
    <span className="chip" title={`${content.world.phases[phase]} · une journée dure ${content.world.day_seconds / 60} minutes`}>
      {PHASE_ICONS[phase]} {time}
    </span>
  );
}

export function Honey({ amount }: { amount: number }) {
  return (
    <span className="honey">
      <span className="honey-drop" />
      {fmt(amount)}
    </span>
  );
}

export function ItemIcon({ id, size = 22 }: { id: string; size?: number }) {
  const { content } = useGame();
  const item = content.items[id];
  const fill = `#${item?.color ?? '888888'}`;
  const stroke = 'rgba(0,0,0,0.55)';
  let shape: ReactNode;
  if (item?.category === 'comb') {
    shape = <polygon points="8,1 14,4.5 14,11.5 8,15 2,11.5 2,4.5" fill={fill} stroke={stroke} />;
  } else if (item?.category === 'module') {
    shape = <rect x="2" y="2" width="12" height="12" rx="2" fill={fill} stroke={stroke} />;
  } else if (item?.category === 'consumable') {
    shape = <path d="M6 1h4v5l4 8H2l4-8z" fill={fill} stroke={stroke} />;
  } else {
    shape = <circle cx="8" cy="8" r="6" fill={fill} stroke={stroke} />;
  }
  return (
    <svg className="item-icon" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      {shape}
    </svg>
  );
}

export function ItemQty({ id, qty }: { id: string; qty?: number }) {
  const { content } = useGame();
  return (
    <span className="chip">
      <ItemIcon id={id} size={16} />
      {content.items[id]?.label ?? id}
      {qty !== undefined && <b>×{fmt(qty)}</b>}
    </span>
  );
}

export function CostView({ cost, times = 1 }: { cost: Cost; times?: number }) {
  const { state } = useGame();
  return (
    <span className="cost">
      {cost.honey > 0 && (
        <span className={state.player.honey < cost.honey * times ? 'lacking' : ''}>
          <Honey amount={cost.honey * times} />
        </span>
      )}
      {Object.entries(cost.items).map(([item, n]) => (
        <span key={item} className={(state.inventory[item] ?? 0) < n * times ? 'lacking' : ''}>
          <ItemQty id={item} qty={n * times} />
        </span>
      ))}
    </span>
  );
}

export function speciesName(content: ReturnType<typeof useGame>['content'], genome: Genome) {
  const [active, inactive] = genome.species;
  const name = content.species[active]?.label ?? active;
  return active === inactive ? name : `${name} (hybride ${content.species[inactive]?.label ?? inactive})`;
}

export function alleleLabel(content: ReturnType<typeof useGame>['content'], chromosome: string, allele: string) {
  if (chromosome === 'species') return content.species[allele]?.label ?? allele;
  return content.alleles[chromosome]?.[allele]?.label ?? allele;
}

export function GenomeIcon({ genome, type, size }: { genome: Genome; type: BeeType; size?: number }) {
  const { content } = useGame();
  const species = content.species[genome.species[0]];
  return <BeeIcon color={species?.color ?? '888888'} secondary={species?.secondary ?? 'ffdc16'} type={type} size={size} />;
}

export function GenomeTable({ genome }: { genome: Genome }) {
  const { content } = useGame();
  return (
    <table className="genome">
      <thead>
        <tr>
          <th />
          <th>Actif</th>
          <th>Inactif</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(content.chromosomes).map(([chromosome, label]) => {
          const pair = genome[chromosome];
          if (!pair) return null;
          return (
            <tr key={chromosome}>
              <th>{label}</th>
              <td>{alleleLabel(content, chromosome, pair[0])}</td>
              <td className="muted">{alleleLabel(content, chromosome, pair[1])}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function BeeCard({
  genome,
  type,
  count,
  children,
  selected,
  onClick,
}: {
  genome: Genome;
  type: BeeType;
  count?: number;
  children?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  const { content } = useGame();
  return (
    <div className={`card bee-card${selected ? ' selected' : ''}${onClick ? ' clickable' : ''}`} onClick={onClick}>
      <div className="bee-head">
        <GenomeIcon genome={genome} type={type} />
        <div>
          <div className="title">{speciesName(content, genome)}</div>
          <div className="muted">
            {TYPE_LABELS[type]}
            {count !== undefined && count > 1 && <b> ×{fmt(count)}</b>}
          </div>
        </div>
      </div>
      <GenomeTable genome={genome} />
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
