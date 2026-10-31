'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { SceneArtBanner } from '@/components/SceneBanner';
import { BadgeStrip, RankChip } from '@/components/Badges';
import { ShowcaseCard, useEntryLabel } from '@/components/ShowcaseCard';
import { GenomeIcon, Modal } from '@/components/ui';
import { fmt } from '@/lib/format';
import { useGame } from '@/lib/game';
import type { Profile, ProfileSettings, Showcase } from '@/lib/types';

const PHASES: [string, string][] = [
  ['dawn', '🌅 Aube'],
  ['day', '☀️ Jour'],
  ['dusk', '🌇 Crépuscule'],
  ['night', '🌙 Nuit'],
];

/** Fenêtre de personnalisation du profil : présentation, décor, abeille préférée, statistiques mises en avant. */
function ProfileEditor({ settings, onClose, onSave }: { settings: ProfileSettings; onClose: () => void; onSave: (body: unknown) => Promise<boolean> }) {
  const { content, state } = useGame();
  const label = useEntryLabel();
  const [bio, setBio] = useState(settings.bio);
  const [biome, setBiome] = useState(settings.biome);
  const [phase, setPhase] = useState(settings.phase);
  const [featured, setFeatured] = useState(settings.featured);
  // undefined : on garde l'abeille actuelle ; "" : aucune ; sinon une abeille de la réserve
  const [favorite, setFavorite] = useState<string | undefined>(undefined);
  const max = content.profiles.max_featured;
  const chosen = new Set(featured);
  const toggle = (id: string) =>
    setFeatured(chosen.has(id) ? featured.filter((f) => f !== id) : featured.length < max ? [...featured, id] : featured);
  const reserve = state.bees.filter((b) => b.hive_id === null);
  const save = async () => {
    if (await onSave({ bio, biome, phase, featured, favorite_bee_id: favorite ?? null })) onClose();
  };
  return (
    <Modal label="Personnaliser mon profil" onClose={onClose}>
      <div className="sheet wide profile-editor">
        <div className="row between">
          <b className="card-title">Personnaliser mon profil</b>
          <button className="help-btn" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>

        <label className="stack">
          <span className="title">Présentation</span>
          <textarea value={bio} maxLength={content.profiles.bio_max} onChange={(e) => setBio(e.target.value)} placeholder="Quelques mots sur votre rucher…" />
          <span className="muted">
            {bio.length} / {content.profiles.bio_max}
          </span>
        </label>

        <div className="stack">
          <span className="title">Décor de la bannière</span>
          <select aria-label="Biome" value={biome} onChange={(e) => setBiome(e.target.value)}>
            {Object.entries(content.biomes).map(([id, b]) => (
              <option key={id} value={id}>
                {b.label}
              </option>
            ))}
          </select>
          <div className="row" role="radiogroup" aria-label="Moment de la journée">
            {PHASES.map(([id, text]) => (
              <button key={id} role="radio" aria-checked={phase === id} className={`chip pick${phase === id ? ' selected' : ''}`} onClick={() => setPhase(id)}>
                {text}
              </button>
            ))}
          </div>
          <SceneArtBanner biome={biome} phase={phase} />
        </div>

        <div className="stack">
          <span className="title">Abeille préférée</span>
          <div className="row">
            <button className={`chip pick${favorite === '' ? ' selected' : ''}`} onClick={() => setFavorite('')}>
              Aucune
            </button>
            {reserve.map((b) => (
              <button key={b.id} className={`chip pick${favorite === b.id ? ' selected' : ''}`} onClick={() => setFavorite(b.id)}>
                <GenomeIcon genome={b.genome} type={b.type} size={24} />
                {label(b.type, b.genome)}
              </button>
            ))}
          </div>
          <span className="muted">Une copie est gardée : elle reste sur votre profil même si l&apos;abeille quitte votre réserve.</span>
        </div>

        <div className="stack">
          <span className="title">
            Statistiques mises en avant ({featured.length} / {max})
          </span>
          <div className="row">
            {Object.entries(content.profiles.stats).map(([id, s]) => (
              <button
                key={id}
                className={`chip pick${chosen.has(id) ? ' selected' : ''}`}
                aria-pressed={chosen.has(id)}
                disabled={!chosen.has(id) && featured.length >= max}
                onClick={() => toggle(id)}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="row">
          <button className="primary" onClick={save}>
            Enregistrer
          </button>
          <button onClick={onClose}>Annuler</button>
        </div>
      </div>
    </Modal>
  );
}

export default function BeekeeperPage() {
  const { id } = useParams<{ id: string }>();
  const { content, call } = useGame();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    call<Profile>(`/community/profiles/${id}`).then((p) => p && setProfile(p));
  }, [call, id]);

  if (!profile) return <p className="muted">Chargement du profil…</p>;
  const { settings, stats } = profile;
  const featured = new Set(settings.featured);
  const others = Object.keys(content.profiles.stats).filter((s) => !featured.has(s));
  const save = async (body: unknown) => {
    const next = await call<Profile>('/community/profile', body, 'PUT');
    if (next) setProfile(next);
    return next !== null;
  };
  // Les « j'aime » renvoient toutes les vitrines : on garde celles de ce profil
  const updateShowcases = async (path: string, body?: unknown, method?: string) => {
    const list = await call<Showcase[]>(path, body, method);
    if (list) setProfile({ ...profile, showcases: list.filter((s) => s.author_id === profile.id) });
  };

  return (
    <>
      <Link href="/communaute" className="back-link">
        ← Communauté
      </Link>
      <div className="card profile-hero">
        <SceneArtBanner biome={settings.biome} phase={settings.phase} className="profile-banner" />
        <div className="profile-id">
          <span className="profile-bee">
            {settings.favorite ? <GenomeIcon genome={settings.favorite.genome} type={settings.favorite.type as 'drone'} size={96} /> : <span aria-hidden>🐝</span>}
          </span>
          <div className="grow">
            <h1>{profile.name}</h1>
            <div className="row" style={{ gap: 6 }}>
              <RankChip badges={profile.badges} />
              {profile.since && <span className="muted">Apiculteur depuis le {new Date(profile.since).toLocaleDateString('fr-FR')}</span>}
            </div>
          </div>
          {profile.mine && (
            <button className="primary" onClick={() => setEditing(true)}>
              ✏️ Personnaliser
            </button>
          )}
        </div>
        {settings.bio ? <p className="profile-bio">{settings.bio}</p> : profile.mine && <p className="muted">Ajoutez une présentation avec « Personnaliser ».</p>}
        <BadgeStrip badges={profile.badges} />
      </div>

      {settings.featured.length > 0 && (
        <div className="profile-featured">
          {settings.featured.map((sid) => (
            <div key={sid} className="card profile-stat big">
              <span className="profile-stat-icon">{content.profiles.stats[sid]?.icon}</span>
              <b>{fmt(stats[sid] ?? 0)}</b>
              <span className="muted">{content.profiles.stats[sid]?.label}</span>
            </div>
          ))}
        </div>
      )}

      <h2>Toutes les statistiques</h2>
      <div className="card">
        <ul className="profile-stats">
          {others.map((sid) => (
            <li key={sid}>
              <span>
                {content.profiles.stats[sid].icon} {content.profiles.stats[sid].label}
              </span>
              <b>{fmt(stats[sid] ?? 0)}</b>
            </li>
          ))}
        </ul>
      </div>

      <h2>Vitrines</h2>
      {profile.showcases.length ? (
        <div className="showcase-grid">
          {profile.showcases.map((s) => (
            <ShowcaseCard key={s.id} showcase={s} onUpdate={updateShowcases} />
          ))}
        </div>
      ) : (
        <p className="muted">{profile.mine ? 'Vous n’avez encore publié aucune vitrine.' : 'Aucune vitrine publiée.'}</p>
      )}

      {editing && <ProfileEditor settings={settings} onClose={() => setEditing(false)} onSave={save} />}
    </>
  );
}
