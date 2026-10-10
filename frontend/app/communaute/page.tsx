'use client';

import { useEffect, useState } from 'react';
import { SpecimenIcon, specimenLabel } from '@/components/garden';
import { BeeCard } from '@/components/ui';
import { useGame } from '@/lib/game';
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

  const toggle = (id: string) => {
    if (picked.includes(id)) setPicked(picked.filter((p) => p !== id));
    else if (picked.length < content.showcase_max_entries) setPicked([...picked, id]);
  };

  const flora = [
    ...state.garden.saplings.map((s) => ({ id: s.id, kind: 'tree', genome: s.genome })),
    ...state.garden.butterflies.map((b) => ({ id: b.id, kind: 'butterfly', genome: { species: [b.species, b.species] as [string, string] } })),
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
      <h1>Communauté</h1>
      <p className="muted">Exposez vos plus belles abeilles, vos arbres et vos papillons, et découvrez ceux des autres apiculteurs.</p>

      <div className="row">
        <button className="primary" onClick={() => setCreating(!creating)}>
          {creating ? 'Annuler' : 'Créer une vitrine'}
        </button>
      </div>

      {creating && (
        <div className="card" style={{ marginTop: 12 }}>
          <input placeholder="Titre de la vitrine" maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea placeholder="Description (facultative)" maxLength={1000} value={description} onChange={(e) => setDescription(e.target.value)} />
          <div className="muted">
            Choisissez jusqu'à {content.showcase_max_entries} spécimens ({picked.length} sélectionnés) : abeilles, pousses d'arbres ou
            papillons. La vitrine en garde une copie : elle reste visible même si le spécimen disparaît.
          </div>
          <div className="row">
            {flora.map((f) => (
              <button key={f.id} className={`chip pick${picked.includes(f.id) ? ' selected' : ''}`} onClick={() => toggle(f.id)}>
                <SpecimenIcon kind={f.kind} type={f.kind} genome={f.genome} size={24} />
                {specimenLabel(content, f.kind, f.kind, f.genome)}
              </button>
            ))}
          </div>
          <div className="grid">
            {state.bees.map((b) => (
              <BeeCard key={b.id} genome={b.genome} type={b.type} selected={picked.includes(b.id)} onClick={() => toggle(b.id)} />
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
                <button className={s.liked ? 'primary' : ''} onClick={() => update(`/community/showcases/${s.id}/like`, {})}>
                  ♥ {s.likes}
                </button>
                {s.mine && (
                  <button className="danger" onClick={() => update(`/community/showcases/${s.id}`, undefined, 'DELETE')}>
                    Supprimer
                  </button>
                )}
              </div>
            </div>
            {s.description && <p>{s.description}</p>}
            <div className="row">
              {s.entries.map((entry, i) => (
                <span key={i} className="chip">
                  <SpecimenIcon kind={entry.kind} type={entry.type} genome={entry.genome} size={28} />
                  {specimenLabel(content, entry.kind, entry.type, entry.genome)}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
