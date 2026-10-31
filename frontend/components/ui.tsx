'use client';

import Link from 'next/link';
import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useContent, useGame } from '@/lib/game';
import { type BeeGroup, TYPE_LABELS, alleleLabel, notableTraits, speciesName, variantOf } from '@/lib/bees';
import { fmt } from '@/lib/format';
import type { Bee, BeeType, Cost, Genome } from '@/lib/types';
import { BeeIcon } from './BeeIcon';
import { ITEM_PX, drawItem } from './ItemArt';
import { pixelUrl, sprite } from '@/lib/pixel';

const PHASE_ICONS: Record<string, string> = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' };

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

export function BeeTile({ group, onClick }: { group: BeeGroup; onClick: () => void }) {
  const { content } = useGame();
  const type: BeeType = group.princesses ? 'princess' : 'drone';
  const counts = [group.princesses && `♀ ${fmt(group.princesses)}`, group.drones && `♂ ${fmt(group.drones)}`].filter(Boolean).join(' · ');
  const rare = content.variants.variants[variantOf(group.genome) ?? ''];
  return (
    <button className={`bee-tile${rare ? ' rare-tile' : ''}`} onClick={onClick} title="Voir la fiche">
      <GenomeIcon genome={group.genome} type={type} size={52} />
      <span className="name">
        {content.species[group.genome.species[0]]?.label}
        {rare && ` ${rare.label.toLowerCase()}`}
      </span>
      <Traits genome={group.genome} />
      <span className="count">{counts}</span>
    </button>
  );
}

/**
 * Fenêtre modale native : Échap la ferme, le focus y reste, et un clic sur le fond (le `<dialog>` lui-même,
 * étiré sur tout l'écran) aussi. `children` est la carte affichée au centre.
 */
export function Modal({ label, onClose, children }: { label?: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="overlay"
      aria-label={label}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {children}
    </dialog>
  );
}

/** Fiche complète d'un groupe d'abeilles : chaque variante avec son génome et ses actions. */
export function BeeSheet({ group, onClose, actions }: { group: BeeGroup; onClose: () => void; actions?: (bee: Bee) => ReactNode }) {
  const { content } = useGame();
  const species = content.species[group.genome.species[0]];
  return (
    <Modal label={species?.label} onClose={onClose}>
      <div className="sheet">
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
    </Modal>
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

/** Goutte de miel en pixel art. */
const DROP = ['...o...', '..obo..', '.obbbo.', 'obwbbbo', 'obwbbdo', 'obbbbdo', '.obddo.', '..ooo..'];

export function Honey({ amount }: { amount: number }) {
  const src = pixelUrl('honey-drop', 7, 8, (ctx) => sprite(ctx, DROP, 0, 0, { o: '#a86a00', b: '#ffb300', w: '#fff3b0', d: '#e08e00' }));
  return (
    <span className="honey">
      <img className="pixel honey-drop" src={src} width={10} height={12} alt="" aria-hidden />
      {fmt(amount)}
    </span>
  );
}

export const ItemIcon = memo(function ItemIcon({ id, size = 22, unknown = false }: { id: string; size?: number; unknown?: boolean }) {
  const content = useContent();
  const src = pixelUrl(`item|${id}|${unknown}`, ITEM_PX, ITEM_PX, (ctx) => drawItem(ctx, id, content.items[id], unknown));
  return <img className="pixel item-icon" src={src} width={size} height={size} alt="" aria-hidden />;
});

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

export function GenomeIcon({ genome, type, size }: { genome: Genome; type: BeeType; size?: number }) {
  const content = useContent();
  const species = content.species[genome.species[0]];
  // Une variante rare change la robe de l'abeille et la fait briller
  const id = variantOf(genome);
  const variant = id ? content.variants.variants[id] : undefined;
  return (
    <BeeIcon
      species={genome.species[0]}
      color={variant?.color ?? species?.color ?? '888888'}
      secondary={variant?.secondary ?? species?.secondary ?? 'ffdc16'}
      type={type}
      size={size}
      className={variant ? `rare rare-${id}` : undefined}
    />
  );
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
 * de la page (ou de la modale ouverte, qui passe au-dessus de tout), en position fixe, pour ne pas être coupée
 * par les listes qui défilent ni passer sous les tuiles.
 */
export function GenesTip({ genome, className = '' }: { genome: Genome; className?: string }) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; root: Element } | null>(null);
  const show = () => {
    const el = anchor.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 260;
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    // Sous l'icône, ou au-dessus s'il n'y a plus la place en bas
    const top = r.bottom + 230 > window.innerHeight ? Math.max(8, r.top - 230) : r.bottom + 6;
    setPos({ top, left, root: el.closest('dialog') ?? document.body });
  };
  const hide = () => setPos(null);
  useEffect(() => {
    if (!pos) return;
    window.addEventListener('scroll', hide, true);
    return () => window.removeEventListener('scroll', hide, true);
  }, [pos]);
  return (
    <button
      type="button"
      ref={anchor}
      className={`genes-tip ${className}`}
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
          pos.root,
        )}
    </button>
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
