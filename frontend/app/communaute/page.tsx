'use client';

import { useEffect, useState } from 'react';
import { BadgeStrip, RankChip } from '@/components/Badges';
import { GenomeIcon, PageHead } from '@/components/ui';
import { TYPE_LABELS, speciesName } from '@/lib/bees';
import { useGame } from '@/lib/game';
import { keyed } from '@/lib/keys';
import type { Showcase } from '@/lib/types';

export default function CommunityPage() {
  const { content, state, call } = useGame();
  const [showcases, setShowcases] = useState<Showcase[] | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    call<Showcase[]>('/community/showcases').then((list) => list && setShowcases(list));
  }, [call]);

  const update = async (path: string, body?: unknown, method?: string) => {
    const list = await call<Showcase[]>(path, body, method);
    if (list) setShowcases(list);
    return list !== null;
  };

  const pickedSet = new Set(picked);
  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((p) => p !== id));
    else if (picked.length < content.showcase_max_entries) setPicked([...picked, id]);
  };

  const label = (type: string, genome: Showcase['entries'][number]['genome']) =>
    `${TYPE_LABELS[type as 'drone'] ?? type} ${speciesName(content, genome)}`;

  const publish = async () => {
    if (await update('/community/showcases', { title, description, bee_ids: picked })) {
      setTitle('');
      setDescription('');
      setPicked([]);
      setCreating(false);
    }
  };

  return (
    <>
      <PageHead
        guide="communaute"
        title="Communauté"
        extra={
          <button className="primary" style={{ marginLeft: 'auto' }} onClick={() => setCreating(!creating)}>
            {creating ? 'Annuler' : 'Créer une vitrine'}
          </button>
        }
      >
        Exposez vos plus belles abeilles et découvrez celles des autres apiculteurs. Une vitrine garde une copie de chaque spécimen :
        elle reste visible même s'il disparaît de votre réserve.
      </PageHead>

      {creating && (
        <div className="card">
          <input placeholder="Titre de la vitrine" aria-label="Titre" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder="Description (facultative)"
            aria-label="Description"
            maxLength={1000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="muted">
            Spécimens choisis : {picked.length} / {content.showcase_max_entries}
          </div>
          <div className="row">
            {state.bees.map((b) => (
              <button key={b.id} className={`chip pick${pickedSet.has(b.id) ? ' selected' : ''}`} onClick={() => toggle(b.id)}>
                <GenomeIcon genome={b.genome} type={b.type} size={24} />
                {label(b.type, b.genome)}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="primary" disabled={!title.trim() || picked.length === 0} onClick={publish}>
              Publier
            </button>
          </div>
        </div>
      )}

      <h2>Vitrines</h2>
      {showcases === null && <p className="muted">Chargement…</p>}
      {showcases?.length === 0 && <p className="muted">Aucune vitrine pour l'instant. Soyez le premier à en publier une !</p>}
      <div className="grid wide">
        {showcases?.map((s) => (
          <div key={s.id} className="card">
            <div className="row between">
              <div>
                <div className="title">{s.title}</div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="muted">par {s.author}</span>
                  <RankChip badges={s.badges} />
                </div>
              </div>
              <div className="row">
                <button className={s.liked ? 'primary' : ''} aria-pressed={s.liked} onClick={() => update(`/community/showcases/${s.id}/like`, {})}>
                  {s.liked ? '♥' : '♡'} {s.likes}
                </button>
                {s.mine && (
                  <button className="small danger" onClick={() => update(`/community/showcases/${s.id}`, undefined, 'DELETE')}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>
            <BadgeStrip badges={s.badges} />
            <div className="shelf">
              {keyed(s.entries, (e) => `${e.type}:${e.genome.species.join('/')}`).map(({ item: entry, key }) => (
                <span key={key} title={label(entry.type, entry.genome)}>
                  <GenomeIcon genome={entry.genome} type={entry.type as 'drone'} size={48} />
                </span>
              ))}
            </div>
            {s.description && <p className="muted">{s.description}</p>}
          </div>
        ))}
      </div>
    </>
  );
}
