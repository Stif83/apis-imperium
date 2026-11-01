'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RankChip } from '@/components/Badges';
import { ShowcaseCard, ShowcaseCase } from '@/components/ShowcaseCard';
import { BeeSearch, GenomeIcon, Modal, PageHead } from '@/components/ui';
import { TYPE_LABELS, beeMatches, variantOf } from '@/lib/bees';
import { useGame } from '@/lib/game';
import { pedigreeLevel } from '@/lib/trophies';
import type { ProfileSummary, Showcase } from '@/lib/types';

const SORTS = [
  ['recent', '🕒 Récentes'],
  ['liked', '♥ Les plus aimées'],
  ['mine', '🙋 Les miennes'],
] as const;

/** Fenêtre de création : titre, description, choix des spécimens (avec recherche) et aperçu de la vitrine. */
function ShowcaseCreator({ onClose, onPublish }: { onClose: () => void; onPublish: (body: unknown) => Promise<boolean> }) {
  const { content, state } = useGame();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  // Filtres : branche, pedigree minimal, variante ("" : tout ; "any" : toutes les variantes)
  const [branch, setBranch] = useState('');
  const [pedigree, setPedigree] = useState(0);
  const [variant, setVariant] = useState('');
  const max = content.showcase_max_entries;
  const chosen = new Set(picked);
  const byId = useMemo(() => new Map(state.bees.map((b) => [b.id, b])), [state.bees]);
  const branches = useMemo(() => [...new Set(state.bees.map((b) => content.species[b.genome.species[0]]?.branch))].filter(Boolean).sort(), [content, state.bees]);
  const shown = useMemo(
    () =>
      state.bees.filter((b) => {
        const v = variantOf(b.genome);
        return (
          beeMatches(content, b, query) &&
          (!branch || content.species[b.genome.species[0]]?.branch === branch) &&
          pedigreeLevel(b.genome) >= pedigree &&
          (!variant || (variant === 'any' ? !!v : v === variant))
        );
      }),
    [content, state.bees, query, branch, pedigree, variant],
  );
  const toggle = (id: string) => {
    if (chosen.has(id)) setPicked(picked.filter((p) => p !== id));
    else if (picked.length < max) setPicked([...picked, id]);
  };
  const entries = picked.flatMap((id) => {
    const bee = byId.get(id);
    return bee ? [{ type: bee.type, genome: bee.genome }] : [];
  });
  const publish = async () => {
    if (await onPublish({ title, description, bee_ids: picked })) onClose();
  };
  return (
    <Modal label="Nouvelle vitrine" onClose={onClose}>
      <div className="sheet wide showcase-creator">
        <div className="row between">
          <b className="card-title">Nouvelle vitrine</b>
          <button className="help-btn" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>
        <input placeholder="Titre de la vitrine" aria-label="Titre" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea
          placeholder="Description (facultative) : l'histoire de cette lignée, un défi relevé…"
          aria-label="Description"
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <ShowcaseCase entries={entries} />
        <div className="row between">
          <b>
            Spécimens : {picked.length} / {max}
          </b>
          <BeeSearch value={query} onChange={setQuery} shown={shown.length} total={state.bees.length} />
        </div>
        <div className="creator-filters">
          <select aria-label="Branche" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="">Toutes les branches</option>
            {branches.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select aria-label="Pedigree" value={pedigree} onChange={(e) => setPedigree(Number(e.target.value))}>
            <option value={0}>Tout pedigree</option>
            {Object.entries(content.trophies.pedigree).map(([level, p]) => (
              <option key={level} value={level}>
                {p.icon} {p.label} ou mieux
              </option>
            ))}
          </select>
          <select aria-label="Variante" value={variant} onChange={(e) => setVariant(e.target.value)}>
            <option value="">Variantes ou non</option>
            <option value="any">✨ Variantes seulement</option>
            {Object.entries(content.variants).map(([id, v]) => (
              <option key={id} value={id}>
                {v.icon} {v.label}
              </option>
            ))}
          </select>
        </div>
        {shown.length === 0 && <p className="muted">Aucune abeille ne correspond à ces filtres.</p>}
        <div className="grid tiles creator-tiles">
          {shown.map((b) => (
            <button
              key={b.id}
              type="button"
              className={`bee-tile${chosen.has(b.id) ? ' selected' : ''}`}
              aria-pressed={chosen.has(b.id)}
              disabled={!chosen.has(b.id) && picked.length >= max}
              onClick={() => toggle(b.id)}
            >
              <GenomeIcon genome={b.genome} type={b.type} size={44} />
              <span className="name">{content.species[b.genome.species[0]]?.label}</span>
              <span className="count">{TYPE_LABELS[b.type]}</span>
            </button>
          ))}
        </div>
        <div className="row">
          <button className="primary" disabled={!title.trim() || picked.length === 0} onClick={publish}>
            Publier la vitrine
          </button>
          <button onClick={onClose}>Annuler</button>
        </div>
      </div>
    </Modal>
  );
}

function Showcases() {
  const { call } = useGame();
  const [showcases, setShowcases] = useState<Showcase[] | null>(null);
  const [sort, setSort] = useState<(typeof SORTS)[number][0]>('recent');
  const [creating, setCreating] = useState(false);

  // Le tri se fait côté serveur : « les miennes » et « les plus aimées » ne se limitent pas aux vitrines récentes
  const load = useCallback(() => call<Showcase[]>(`/community/showcases?sort=${sort}`).then((list) => list && setShowcases(list)), [call, sort]);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (path: string, body?: unknown, method?: string) => {
    const done = (await call<Showcase[]>(path, body, method)) !== null;
    if (done) await load();
    return done;
  };
  const shown = showcases ?? [];

  return (
    <>
      <div className="row between showcase-toolbar">
        <div className="row" role="radiogroup" aria-label="Trier les vitrines">
          {SORTS.map(([id, text]) => (
            <button key={id} role="radio" aria-checked={sort === id} className={`chip pick${sort === id ? ' selected' : ''}`} onClick={() => setSort(id)}>
              {text}
            </button>
          ))}
        </div>
        <button className="primary" onClick={() => setCreating(true)}>
          ＋ Créer une vitrine
        </button>
      </div>

      {showcases === null && <p className="muted">Chargement…</p>}
      {showcases && !shown.length && (
        <p className="muted">
          {sort === 'mine' ? "Vous n'avez encore publié aucune vitrine." : "Aucune vitrine pour l'instant. Soyez le premier à en publier une !"}
        </p>
      )}
      <div className="showcase-grid">
        {shown.map((s) => (
          <ShowcaseCard key={s.id} showcase={s} onUpdate={update} />
        ))}
      </div>

      {creating && <ShowcaseCreator onClose={() => setCreating(false)} onPublish={(body) => update('/community/showcases', body)} />}
    </>
  );
}

/** Annuaire des apiculteurs : chacun mène à son profil. */
function Beekeepers() {
  const { content, call } = useGame();
  const [list, setList] = useState<ProfileSummary[] | null>(null);
  useEffect(() => {
    call<ProfileSummary[]>('/community/profiles').then((l) => l && setList(l));
  }, [call]);
  if (!list) return <p className="muted">Chargement…</p>;
  return (
    <div className="grid beekeepers">
      {list.map((p) => (
        <Link key={p.id} href={`/apiculteur/${p.id}`} className={`card beekeeper-card${p.mine ? ' mine' : ''}`}>
          <span className="beekeeper-bee" style={{ background: `#${content.biomes[p.biome]?.color ?? '8bc34a'}55` }}>
            {p.favorite ? <GenomeIcon genome={p.favorite.genome} type={p.favorite.type as 'drone'} size={44} /> : '🐝'}
          </span>
          <span className="grow">
            <span className="title">{p.name}</span>
            <RankChip badges={p.badges} />
          </span>
          {p.mine && <span className="badge ok">Vous</span>}
        </Link>
      ))}
    </div>
  );
}

const TABS = [
  ['showcases', '🖼️ Vitrines'],
  ['beekeepers', '👥 Apiculteurs'],
] as const;

export default function CommunityPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('showcases');
  return (
    <>
      <PageHead
        guide="communaute"
        title="Communauté"
        extra={
          <Link className="button primary" style={{ marginLeft: 'auto' }} href="/apiculteur/moi">
            Mon profil
          </Link>
        }
      >
        Exposez vos plus belles abeilles, découvrez celles des autres apiculteurs et visitez leurs profils.
      </PageHead>
      <div className="row" role="tablist" aria-label="Communauté" style={{ marginBottom: 14 }}>
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={`chip pick${tab === id ? ' selected' : ''}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'showcases' ? <Showcases /> : <Beekeepers />}
    </>
  );
}
