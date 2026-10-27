'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useGame } from '@/lib/game';
import type { Bee, BeeType, Content, Cost, GameState, Genome } from '@/lib/types';
import { BeeIcon } from './BeeIcon';

export const TYPE_LABELS: Record<BeeType, string> = { princess: 'Princesse', drone: 'Faux-bourdon', queen: 'Reine' };

export const fmt = (n: number) => n.toLocaleString('fr-FR');

const PHASE_ICONS: Record<string, string> = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };
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

const THEMES = [
  { id: 'auto', icon: '🌗', label: "Thème : comme l'appareil" },
  { id: 'light', icon: '☀️', label: 'Thème : clair' },
  { id: 'dark', icon: '🌙', label: 'Thème : nuit' },
] as const;

/** Bascule auto → clair → nuit ; le choix est gardé dans ce navigateur. */
export function ThemeToggle() {
  const [theme, setTheme] = useState<string>('auto');
  useEffect(() => {
    try {
      setTheme(localStorage.getItem('apis.theme') ?? 'auto');
    } catch {
      /* stockage indisponible */
    }
  }, []);
  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0];
  const next = () => {
    const chosen = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length].id;
    setTheme(chosen);
    const root = document.documentElement;
    if (chosen === 'auto') delete root.dataset.theme;
    else root.dataset.theme = chosen;
    try {
      if (chosen === 'auto') localStorage.removeItem('apis.theme');
      else localStorage.setItem('apis.theme', chosen);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite */
    }
  };
  return (
    <button className="small" onClick={next} title={`${current.label} (cliquer pour changer)`} aria-label={current.label}>
      {current.icon}
    </button>
  );
}

/** Écart entre le climat d'une ruche et ce que supporte l'abeille : 0 si elle s'y plaît, sinon -1 (trop froid) ou +1 (trop chaud). */
export function climateFit(content: Content, genome: Genome, hiveTemp: string): -1 | 0 | 1 {
  const wanted = content.temps.indexOf(content.species[genome.species[0]]?.temp ?? 'normal');
  const tolerance = content.alleles.tolerance?.[genome.tolerance?.[0] ?? 'none']?.value ?? 0;
  const diff = content.temps.indexOf(hiveTemp) - wanted;
  if (Math.abs(diff) <= tolerance) return 0;
  return diff < 0 ? -1 : 1;
}

export const BIOME_ICONS: Record<string, string> = { plains: '🌼', taiga: '🌲', tundra: '🧊', jungle: '🌴', desert: '🌵' };

/** Titre de page ; l'explication est rangée derrière un bouton « ? », avec un lien vers la section `guide` de l'aide. */
export function PageHead({ title, children, extra, guide }: { title: ReactNode; children?: ReactNode; extra?: ReactNode; guide?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="page-head">
        <h1>{title}</h1>
        {children && (
          <button className="help-btn" title="Comment ça marche ?" aria-expanded={open} onClick={() => setOpen(!open)}>
            ?
          </button>
        )}
        {extra}
      </div>
      {open && (
        <div className="help-text">
          {children}
          {guide && (
            <div>
              <Link href={`/aide#${guide}`}>Tout savoir dans l'aide →</Link>
            </div>
          )}
        </div>
      )}
    </>
  );
}

const ACTIVITY_ICONS: Record<string, string> = { diurnal: '☀️', nocturnal: '🌙', crepuscular: '🌅', cathemeral: '♾️' };

/** Gènes qui méritent d'être vus d'un coup d'œil ; le reste est dans la fiche complète. */
export function notableTraits(content: Content, genome: Genome): { icon: string; label: string }[] {
  const label = (c: string) => `${content.chromosomes[c]} : ${alleleLabel(content, c, genome[c]?.[0] ?? '')}`;
  const out: { icon: string; label: string }[] = [];
  const active = (c: string): string => genome[c]?.[0] ?? '';
  if (genome.species[0] !== genome.species[1]) out.push({ icon: '🧬', label: `Hybride de ${content.species[genome.species[1]]?.label}` });
  if (active('activity')) out.push({ icon: ACTIVITY_ICONS[active('activity')] ?? '☀️', label: label('activity') });
  if (active('weatherproof') === 'yes') out.push({ icon: '☂️', label: label('weatherproof') });
  if (['fast', 'faster', 'fastest'].includes(active('speed'))) out.push({ icon: '⚡', label: label('speed') });
  if (['long', 'longer', 'longest'].includes(active('lifespan'))) out.push({ icon: '⏳', label: label('lifespan') });
  if (Number(active('fertility')) >= 3) out.push({ icon: `♂${active('fertility')}`, label: label('fertility') });
  if (['one', 'two'].includes(active('tolerance'))) out.push({ icon: '🌡️', label: label('tolerance') });
  if (['chaotic', 'erratic', 'unstable'].includes(active('stability'))) out.push({ icon: '🎲', label: label('stability') });
  if (['stable', 'ordered', 'pure'].includes(active('stability'))) out.push({ icon: '🛡️', label: label('stability') });
  return out;
}

export function Traits({ genome }: { genome: Genome }) {
  const { content } = useGame();
  return (
    <span className="traits row" style={{ gap: 3 }}>
      {notableTraits(content, genome).map((t) => (
        <span key={t.label} className="trait" title={t.label}>
          {t.icon}
        </span>
      ))}
    </span>
  );
}

export type BeeGroup = { key: string; genome: Genome; bees: Bee[]; princesses: number; drones: number };

/** Regroupe les abeilles par espèce (active + inactive) ; chaque génome distinct reste une variante. */
export function groupBees(bees: Bee[]): BeeGroup[] {
  const groups = new Map<string, BeeGroup>();
  for (const bee of bees) {
    const key = bee.genome.species.join('|');
    let group = groups.get(key);
    if (!group) {
      group = { key, genome: bee.genome, bees: [], princesses: 0, drones: 0 };
      groups.set(key, group);
    }
    group.bees.push(bee);
    if (bee.type === 'princess') group.princesses += bee.count;
    else group.drones += bee.count;
  }
  return [...groups.values()];
}

export function BeeTile({ group, onClick }: { group: BeeGroup; onClick: () => void }) {
  const { content } = useGame();
  const type: BeeType = group.princesses ? 'princess' : 'drone';
  const counts = [group.princesses && `♀ ${fmt(group.princesses)}`, group.drones && `♂ ${fmt(group.drones)}`].filter(Boolean).join(' · ');
  return (
    <button className="bee-tile" onClick={onClick} title="Voir la fiche">
      <GenomeIcon genome={group.genome} type={type} size={52} />
      <span className="name">{content.species[group.genome.species[0]]?.label}</span>
      <Traits genome={group.genome} />
      <span className="count">{counts}</span>
    </button>
  );
}

/** Fiche complète d'un groupe d'abeilles : chaque variante avec son génome et ses actions. */
export function BeeSheet({ group, onClose, actions }: { group: BeeGroup; onClose: () => void; actions?: (bee: Bee) => ReactNode }) {
  const { content } = useGame();
  const species = content.species[group.genome.species[0]];
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-label={species?.label} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div className="bee-head">
            <GenomeIcon genome={group.genome} type="queen" size={56} />
            <div>
              <div className="card-title" style={{ font: '600 22px/1.2 var(--display)' }}>
                {speciesName(content, group.genome)}
              </div>
              <div className="muted">
                {species?.branch} · climat {content.temp_labels[species?.temp ?? 'normal']}
              </div>
            </div>
          </div>
          <button className="help-btn" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        {group.bees.map((bee) => (
          <div key={bee.id} className="variant">
            <div className="row between">
              <b>
                {TYPE_LABELS[bee.type]} ×{fmt(bee.count)}
              </b>
              <Traits genome={bee.genome} />
            </div>
            <GenomeTable genome={bee.genome} />
            {actions && <div className="actions">{actions(bee)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Interrupteur marche/arrêt. */
export function Switch({ on, onChange, label, title }: { on: boolean; onChange: (on: boolean) => void; label?: ReactNode; title?: string }) {
  return (
    <label className={`switch${on ? ' on' : ''}`} title={title}>
      <input type="checkbox" role="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-track" aria-hidden>
        <span className="switch-knob" />
      </span>
      {label && <span>{label}</span>}
    </label>
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

/** Vrai si le joueur a de quoi payer `times` fois ce prix (miel et objets). */
export function canAfford(state: GameState, cost: Cost | null | undefined, times = 1): boolean {
  if (!cost) return false;
  return state.player.honey >= (cost.honey ?? 0) * times && Object.entries(cost.items ?? {}).every(([i, n]) => (state.inventory[i] ?? 0) >= n * times);
}

/** Message d'un bouton d'achat grisé faute de moyens. */
export const SHORT = 'Pas assez de miel ou de ressources';

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
  return <BeeIcon species={genome.species[0]} color={species?.color ?? '888888'} secondary={species?.secondary ?? 'ffdc16'} type={type} size={size} />;
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Vrai si l'abeille correspond à la recherche : espèces, branche, type ou gènes actifs, sans tenir compte des accents. */
export function beeMatches(content: Content, bee: { type: BeeType; genome: Genome }, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const [active, inactive] = bee.genome.species;
  const text = plain(
    [
      content.species[active]?.label,
      content.species[inactive]?.label,
      content.species[active]?.branch,
      TYPE_LABELS[bee.type],
      ...Object.keys(content.chromosomes).map((c) => (bee.genome[c] ? alleleLabel(content, c, bee.genome[c][0]) : '')),
    ].join(' '),
  );
  return words.every((w) => text.includes(w));
}

/** Champ de recherche d'abeilles, avec le nombre de résultats. */
export function BeeSearch({ value, onChange, shown, total }: { value: string; onChange: (v: string) => void; shown: number; total: number }) {
  return (
    <span className="bee-search">
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Rechercher : espèce, branche, gène (rapide, nocturne…)"
        aria-label="Rechercher une abeille"
      />
      {value && (
        <span className="muted">
          {shown} / {total}
        </span>
      )}
    </span>
  );
}

/**
 * Bulle « ⓘ » qui affiche tous les gènes d'une abeille, au survol ou au toucher. Elle est rendue à la racine
 * de la page, en position fixe, pour ne pas être coupée par les listes qui défilent ni passer sous les tuiles.
 */
export function GenesTip({ genome, className = '' }: { genome: Genome; className?: string }) {
  const anchor = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const show = () => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const width = 260;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    // Sous l'icône, ou au-dessus s'il n'y a plus la place en bas
    const top = r.bottom + 230 > window.innerHeight ? Math.max(8, r.top - 230) : r.bottom + 6;
    setPos({ top, left });
  };
  const hide = () => setPos(null);
  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [pos]);
  return (
    <span
      ref={anchor}
      className={`genes-tip ${className}`}
      role="button"
      tabIndex={0}
      aria-label="Voir ses gènes"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={(e) => {
        e.stopPropagation();
        if (pos) hide();
        else show();
      }}
    >
      ⓘ
      {pos &&
        createPortal(
          <span className="genes-pop" style={{ top: pos.top, left: pos.left }} role="tooltip">
            <GenomeTable genome={genome} />
          </span>,
          document.body,
        )}
    </span>
  );
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
