'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BadgeStrip, RankChip } from '@/components/Badges';
import { GenomeIcon, GenomeTable, Modal, Traits } from '@/components/ui';
import { TYPE_LABELS, speciesName, variantOf } from '@/lib/bees';
import { useGame } from '@/lib/game';
import { keyed } from '@/lib/keys';
import type { Showcase } from '@/lib/types';

type Entry = Showcase['entries'][number];

// Au-delà de ce nombre de « j'aime », le cadre de la vitrine se dore
const GOLDEN_LIKES = 10;

/** Libellé d'un spécimen exposé : caste et espèce. */
export function useEntryLabel() {
  const { content } = useGame();
  return (type: string, genome: Entry['genome']) => `${TYPE_LABELS[type as 'drone'] ?? type} ${speciesName(content, genome)}`;
}

/** Fiche d'un spécimen exposé : son portrait, ses traits marquants et son génome complet. */
function SpecimenSheet({ entry, onClose }: { entry: Entry; onClose: () => void }) {
  const label = useEntryLabel();
  return (
    <Modal label={label(entry.type, entry.genome)} onClose={onClose}>
      <div className="sheet">
        <div className="row between">
          <div className="bee-head">
            <GenomeIcon genome={entry.genome} type={entry.type as 'drone'} size={64} />
            <b className="card-title">{label(entry.type, entry.genome)}</b>
          </div>
          <button className="help-btn" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        <Traits genome={entry.genome} />
        <GenomeTable genome={entry.genome} />
      </div>
    </Modal>
  );
}

/**
 * La vitrine elle-même : un meuble de bois, un fond de velours, des étagères de quatre spécimens et un reflet
 * sur le verre. Chaque spécimen s'ouvre en fiche ; `golden` dore le cadre.
 */
export function ShowcaseCase({ entries, golden = false }: { entries: Entry[]; golden?: boolean }) {
  const { content } = useGame();
  const label = useEntryLabel();
  const [open, setOpen] = useState<Entry | null>(null);
  return (
    <div className={`vcase${golden ? ' golden' : ''}`}>
      <div className="vcase-glass">
        {entries.length ? (
          keyed(entries, (e) => `${e.type}:${e.genome.species.join('/')}:${variantOf(e.genome) ?? ''}`).map(({ item: entry, key }) => (
            <button key={key} type="button" className="vcase-slot" title={label(entry.type, entry.genome)} onClick={() => setOpen(entry)}>
              <GenomeIcon genome={entry.genome} type={entry.type as 'drone'} size={68} />
              <span>{content.species[entry.genome.species[0]]?.label}</span>
            </button>
          ))
        ) : (
          <span className="vcase-empty">Choisissez des abeilles à exposer</span>
        )}
      </div>
      {open && <SpecimenSheet entry={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

/** Une vitrine publiée : titre, auteur (lien vers son profil), « j'aime », meuble d'exposition, description. */
export function ShowcaseCard({ showcase: s, onUpdate }: { showcase: Showcase; onUpdate: (path: string, body?: unknown, method?: string) => void }) {
  return (
    <article className="card showcase-card">
      <div className="row between">
        <div className="grow">
          <div className="title">{s.title}</div>
          <div className="row" style={{ gap: 6 }}>
            <Link className="muted author-link" href={`/apiculteur/${s.author_id}`}>
              par {s.author}
            </Link>
            <RankChip badges={s.badges} />
          </div>
        </div>
        <button className={`like-btn${s.liked ? ' primary' : ''}`} aria-pressed={s.liked} onClick={() => onUpdate(`/community/showcases/${s.id}/like`, {})}>
          {s.liked ? '♥' : '♡'} {s.likes}
        </button>
      </div>
      <ShowcaseCase entries={s.entries} golden={s.likes >= GOLDEN_LIKES} />
      {s.description && <p className="showcase-desc">{s.description}</p>}
      <div className="row between showcase-foot">
        <BadgeStrip badges={s.badges} max={5} />
        <span className="row" style={{ gap: 8 }}>
          {s.created_at && <span className="muted">{new Date(s.created_at).toLocaleDateString('fr-FR')}</span>}
          {s.mine && (
            <button className="small danger" onClick={() => onUpdate(`/community/showcases/${s.id}`, undefined, 'DELETE')}>
              Supprimer
            </button>
          )}
        </span>
      </div>
    </article>
  );
}
