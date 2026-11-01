'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { ProfileBanner } from '@/components/SceneBanner';
import { BadgeStrip, RankChip } from '@/components/Badges';
import { ShowcaseCard } from '@/components/ShowcaseCard';
import { GenomeIcon, Modal } from '@/components/ui';
import { variantOf } from '@/lib/bees';
import { fmt } from '@/lib/format';
import { useGame } from '@/lib/game';
import type { Profile, ProfileSettings, Showcase } from '@/lib/types';

const PHASES: [string, string][] = [
  ['dawn', '🌅 Aube'],
  ['day', '☀️ Jour'],
  ['dusk', '🌇 Crépuscule'],
  ['night', '🌙 Nuit'],
];

/** Avatar possible : une espèce découverte, dans sa robe normale ("") ou celle d'une variante déjà vue. */
type AvatarChoice = { species: string; variant: string };

/** Fenêtre de personnalisation du profil : présentation, avatar, décor, statistiques mises en avant. */
function ProfileEditor({
  settings,
  worldLevel,
  onClose,
  onSave,
}: {
  settings: ProfileSettings;
  worldLevel: number;
  onClose: () => void;
  onSave: (body: unknown) => Promise<boolean>;
}) {
  const { content, state } = useGame();
  const [bio, setBio] = useState(settings.bio);
  const [biome, setBiome] = useState(settings.biome);
  const [phase, setPhase] = useState(settings.phase);
  const [decor, setDecor] = useState(settings.decor ?? 'scene');
  const [featured, setFeatured] = useState(settings.featured);
  // Avatar : null pour aucun ; au départ, celui du profil
  const current = settings.favorite;
  const [avatar, setAvatar] = useState<AvatarChoice | null>(current ? { species: current.genome.species[0], variant: variantOf(current.genome) ?? '' } : null);
  const max = content.profiles.max_featured;
  const chosen = new Set(featured);
  const toggle = (id: string) =>
    setFeatured(chosen.has(id) ? featured.filter((f) => f !== id) : featured.length < max ? [...featured, id] : featured);
  // Toutes les espèces découvertes, puis chacune dans les robes déjà vues
  const avatars = useMemo(() => {
    const found = new Set(state.discovered);
    const out: AvatarChoice[] = [];
    for (const sid of Object.keys(content.species)) {
      if (!found.has(sid)) continue;
      out.push({ species: sid, variant: '' });
      for (const v of Object.keys(content.variants)) if (state.stats[`variant:${v}:${sid}`]) out.push({ species: sid, variant: v });
    }
    return out;
  }, [content, state.discovered, state.stats]);
  // Décors débloqués : le paysage, l'arbre-monde (un niveau achevé), les régions dont l'espèce sauvage est découverte
  const decors = useMemo(() => {
    const found = new Set(state.discovered);
    const out: [string, string][] = [['scene', 'Paysage du biome']];
    if (worldLevel >= 1) out.push(['world', '🌍 Arbre-monde']);
    for (const [rid, r] of Object.entries(content.expeditions.regions)) if (found.has(r.wild)) out.push([`region:${rid}`, `${r.icon} ${r.label}`]);
    return out;
  }, [content, state.discovered, worldLevel]);
  const save = async () => {
    const body = { bio, biome, phase, featured, decor, avatar: avatar?.species ?? '', avatar_variant: avatar?.variant || null };
    if (await onSave(body)) onClose();
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
          <span className="title">Avatar</span>
          <div className="avatar-picker" role="radiogroup" aria-label="Avatar">
            <button role="radio" aria-checked={!avatar} className={`avatar-pick${!avatar ? ' selected' : ''}`} onClick={() => setAvatar(null)}>
              <span className="avatar-none" aria-hidden>
                🐝
              </span>
              Aucun
            </button>
            {avatars.map((a) => {
              const spec = content.species[a.species];
              const robe = a.variant ? content.variants[a.variant] : undefined;
              const selected = avatar?.species === a.species && avatar.variant === a.variant;
              return (
                <button
                  key={`${a.species}:${a.variant}`}
                  role="radio"
                  aria-checked={selected}
                  className={`avatar-pick${selected ? ' selected' : ''}`}
                  title={robe ? `${spec.label} ${robe.label.toLowerCase()}` : spec.label}
                  onClick={() => setAvatar(a)}
                >
                  <BeeIcon
                    species={a.species}
                    type="queen"
                    color={robe?.color ?? spec.color}
                    secondary={robe?.secondary ?? spec.secondary}
                    size={36}
                    className={robe ? `rare rare-${a.variant}` : undefined}
                  />
                  {spec.label}
                  {robe && (
                    <span className="muted">
                      {robe.icon} {robe.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <span className="muted">Toutes les espèces découvertes, et chacune dans la robe des variantes déjà vues naître.</span>
        </div>

        <div className="stack">
          <span className="title">Décor de la bannière</span>
          <div className="decor-picker" role="radiogroup" aria-label="Décor">
            {decors.map(([id, text]) => (
              <button key={id} role="radio" aria-checked={decor === id} className={`decor-pick${decor === id ? ' selected' : ''}`} onClick={() => setDecor(id)}>
                <ProfileBanner settings={{ biome, phase, decor: id }} worldLevel={worldLevel} className="profile-banner" />
                {text}
              </button>
            ))}
          </div>
          {decor === 'scene' && (
            <>
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
            </>
          )}
          <ProfileBanner settings={{ biome, phase, decor }} worldLevel={worldLevel} />
          <span className="muted">D&apos;autres décors se débloquent : l&apos;arbre-monde avec la Ruche-monde, chaque région avec son espèce sauvage.</span>
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
  // Après un « j'aime » ou une suppression, on recharge le profil : il contient toutes les vitrines de l'auteur
  const updateShowcases = async (path: string, body?: unknown, method?: string) => {
    if ((await call<Showcase[]>(path, body, method)) === null) return;
    const next = await call<Profile>(`/community/profiles/${id}`);
    if (next) setProfile(next);
  };

  return (
    <>
      <Link href="/communaute" className="back-link">
        ← Communauté
      </Link>
      <div className="card profile-hero">
        <ProfileBanner settings={settings} worldLevel={stats.world ?? 0} className="profile-banner" />
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

      {editing && <ProfileEditor settings={settings} worldLevel={stats.world ?? 0} onClose={() => setEditing(false)} onSave={save} />}
    </>
  );
}
