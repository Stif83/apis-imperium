'use client';

import { useEffect, useState } from 'react';
import { SpecimenIcon, specimenLabel } from '@/components/garden';
import { PageHead } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Genome, Showcase } from '@/lib/types';

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

  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((p) => p !== id));
    else if (picked.length < content.showcase_max_entries) setPicked([...picked, id]);
  };

  // Abeilles, plus pousses et papillons tant que le jardin est ouvert
  const specimens: { id: string; kind: string; type: string; genome: Genome }[] = [
    ...state.bees.map((b) => ({ id: b.id, kind: 'bee', type: b.type, genome: b.genome })),
    ...(content.garden_enabled
      ? [
          ...state.garden.saplings.map((s) => ({ id: s.id, kind: 'tree', type: 'tree', genome: s.genome })),
          ...state.garden.butterflies.map((b) => ({
            id: b.id,
            kind: 'butterfly',
            type: 'butterfly',
            genome: { species: [b.species, b.species] as [string, string] },
          })),
        ]
      : []),
  ];

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
            {specimens.map((f) => (
              <button key={f.id} className={`chip pick${picked.includes(f.id) ? ' selected' : ''}`} onClick={() => toggle(f.id)}>
                <SpecimenIcon kind={f.kind} type={f.type} genome={f.genome} size={24} />
                {specimenLabel(content, f.kind, f.type, f.genome)}
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
                <div className="muted">par {s.author}</div>
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
            <div className="shelf">
              {s.entries.map((entry, i) => (
                <span key={i} title={specimenLabel(content, entry.kind, entry.type, entry.genome)}>
                  <SpecimenIcon kind={entry.kind} type={entry.type} genome={entry.genome} size={48} />
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
