'use client';

import { useState } from 'react';
import {
  BIOME_ICONS,
  BeeSheet,
  BeeTile,
  GenomeIcon,
  GenomeTable,
  Honey,
  ItemIcon,
  ItemQty,
  PageHead,
  TYPE_LABELS,
  Traits,
  WEATHER_ICONS,
  fmt,
  groupBees,
  speciesName,
  type BeeGroup,
} from '@/components/ui';
import { HiveArt } from '@/components/HiveArt';
import { useGame } from '@/lib/game';
import type { Bee, Hive } from '@/lib/types';

function beeLabel(content: ReturnType<typeof useGame>['content'], bee: Bee) {
  return `${speciesName(content, bee.genome)} ×${bee.count}`;
}

const STATUS: Record<Hive['status'], { label: string; className: string; title: string }> = {
  working: { label: 'Au travail', className: 'badge ok', title: 'La reine produit des rayons.' },
  resting: { label: '💤 Au repos', className: 'badge info', title: "Ce n'est pas l'heure de travail de cette reine. Une lanterne la fait travailler à toute heure." },
  weather: { label: '☂️ À l’abri', className: 'badge info', title: 'Cette reine craint les intempéries. Un abri, ou le gène « Résiste aux intempéries », la fait travailler quand même.' },
  climate: { label: 'Climat inadapté', className: 'badge warn', title: "Le climat de la ruche ne convient pas à cette reine : elle ne travaille pas et ne vieillit pas." },
  empty: { label: 'Sans reine', className: 'badge', title: 'Installez une princesse et un faux-bourdon.' },
};

function HiveName({ hive }: { hive: Hive }) {
  const { act } = useGame();
  const [draft, setDraft] = useState<string | null>(null);

  if (draft === null) {
    return (
      <button className="hive-name" title="Renommer la ruche" onClick={() => setDraft(hive.name)}>
        {hive.name} <span className="muted">✎</span>
      </button>
    );
  }
  const save = () => {
    const name = draft.trim();
    if (name && name !== hive.name) act(`/hives/${hive.id}`, { name });
    setDraft(null);
  };
  return (
    <input
      className="hive-name-input"
      value={draft}
      maxLength={64}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') setDraft(null);
      }}
    />
  );
}

function Scene({ hive }: { hive: Hive }) {
  const { content, state } = useGame();
  const weather = state.world.weather[hive.biome] ?? 'clear';
  const queen = hive.queen;
  const species = queen ? content.species[queen.genome.species[0]] : null;
  const status = STATUS[hive.status];
  return (
    <div className="scene" data-phase={state.world.phase} data-weather={weather}>
      <span className="astre" />
      <span className="ground" style={{ background: `#${content.biomes[hive.biome].color}` }} />
      <HiveArt alveary={hive.hive_type === 'alveary'} />
      {hive.status === 'working' &&
        species &&
        [0, 1, 2].map((i) => (
          <span key={i} className="fly" style={{ left: `${24 + i * 22}%`, top: `${26 + (i % 2) * 30}px`, animationDelay: `${-i * 0.8}s` }}>
            <GenomeIcon genome={queen!.genome} type="drone" size={22 - i * 2} />
          </span>
        ))}
      {hive.status === 'resting' && (
        <>
          <span className="zz" style={{ left: '56%', top: '70px' }}>z</span>
          <span className="zz" style={{ left: '60%', top: '60px', animationDelay: '-1.2s' }}>Z</span>
        </>
      )}
      {(weather === 'rain' || weather === 'storm') &&
        Array.from({ length: 14 }, (_, i) => <span key={i} className="drop" style={{ left: `${(i * 7.3) % 100}%`, animationDelay: `${-(i * 0.13) % 0.8}s` }} />)}
      {weather === 'snow' &&
        Array.from({ length: 12 }, (_, i) => <span key={i} className="flake" style={{ left: `${(i * 8.7) % 100}%`, animationDelay: `${-(i * 0.27) % 3}s` }} />)}
      <span className={`status ${status.className}`} title={status.title}>
        {status.label}
      </span>
      {weather !== 'clear' && (
        <span className="weather badge" title={content.world.weathers[weather]}>
          {WEATHER_ICONS[weather]} {content.world.weathers[weather]}
        </span>
      )}
    </div>
  );
}

function HiveCard({ hive }: { hive: Hive }) {
  const { content, state, act } = useGame();
  const [princess, setPrincess] = useState('');
  const [drone, setDrone] = useState('');
  const [details, setDetails] = useState(false);
  const [gain, setGain] = useState<string | null>(null);

  const type = content.hive_types[hive.hive_type];
  const inventory = state.bees.filter((b) => b.hive_id === null);
  const princesses = inventory.filter((b) => b.type === 'princess');
  const drones = inventory.filter((b) => b.type === 'drone');
  const waiting = state.bees.filter((b) => b.hive_id === hive.id);
  const outputs = Object.entries(hive.output);
  const fittable = Object.keys(content.modules).filter(
    (m) => (state.inventory[m] ?? 0) > 0 && (!type.frames_only || content.modules[m].frame),
  );
  const princessId = princesses.some((b) => b.id === princess) ? princess : princesses[0]?.id ?? '';
  const droneId = drones.some((b) => b.id === drone) ? drone : drones[0]?.id ?? '';
  const queen = hive.queen;
  const biome = content.biomes[hive.biome];

  const collect = async () => {
    const combs = outputs.reduce((n, [, q]) => n + q, 0);
    const bees = waiting.reduce((n, b) => n + b.count, 0);
    if (await act(`/hives/${hive.id}/collect`)) {
      setGain([combs && `+${fmt(combs)} rayons`, bees && `+${bees} 🐝`].filter(Boolean).join('  '));
      setTimeout(() => setGain(null), 1200);
    }
  };

  return (
    <div className="card hive-card">
      <Scene hive={hive} />
      <div className="body">
        <div className="row between">
          <HiveName hive={hive} />
          <span className="row" style={{ gap: 4 }}>
            <span className="chip" title={`${biome.label} · climat ${content.temp_labels[hive.mods.temp]}`}>
              {BIOME_ICONS[hive.biome]} {biome.label}
            </span>
            {hive.modules.map((m, i) => (
              <span key={i} title={`${content.items[m]?.label} : ${content.modules[m]?.desc}`}>
                <ItemIcon id={m} size={16} />
              </span>
            ))}
          </span>
        </div>

        {queen ? (
          <div className="bee-head">
            <GenomeIcon genome={queen.genome} type="queen" size={44} />
            <div className="grow">
              <div className="row between">
                <b>{content.species[queen.genome.species[0]]?.label}</b>
                <Traits genome={queen.genome} />
              </div>
              <div className="bar" title={`Reste ${queen.health} cycles sur ${queen.max_health}`}>
                <div style={{ width: `${(100 * queen.health) / queen.max_health}%` }} />
              </div>
            </div>
          </div>
        ) : princesses.length && drones.length ? (
          <div className="stack">
            <div className="row">
              <select className="grow" aria-label="Princesse" value={princessId} onChange={(e) => setPrincess(e.target.value)}>
                {princesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    ♀ {beeLabel(content, b)}
                  </option>
                ))}
              </select>
              <select className="grow" aria-label="Faux-bourdon" value={droneId} onChange={(e) => setDrone(e.target.value)}>
                {drones.map((b) => (
                  <option key={b.id} value={b.id}>
                    ♂ {beeLabel(content, b)}
                  </option>
                ))}
              </select>
            </div>
            <button className="primary" onClick={() => act(`/hives/${hive.id}/install`, { princess_id: princessId, drone_id: droneId })}>
              Accoupler et installer
            </button>
          </div>
        ) : (
          <div className="muted">Il faut une princesse et un faux-bourdon en réserve.</div>
        )}

        {(outputs.length > 0 || waiting.length > 0 || gain) && (
          <div className="row">
            {outputs.map(([item, n]) => (
              <ItemQty key={item} id={item} qty={n} />
            ))}
            {waiting.map((b) => (
              <span key={b.id} className="chip" title={`${TYPE_LABELS[b.type]} ${speciesName(content, b.genome)}`}>
                <GenomeIcon genome={b.genome} type={b.type} size={18} />
                {b.type === 'princess' ? '♀' : '♂'} ×{b.count}
              </span>
            ))}
            <span className="gains" style={{ marginLeft: 'auto' }}>
              {gain && <span className="float-gain">{gain}</span>}
              {(outputs.length > 0 || waiting.length > 0) && (
                <button className="primary" onClick={collect}>
                  Récolter
                </button>
              )}
            </span>
          </div>
        )}

        <button className="small link" onClick={() => setDetails(!details)}>
          {details ? '▾' : '▸'} Réglages · modules {hive.modules.length}/{hive.slots}
        </button>
        {details && (
          <div className="stack">
            <div className="slots">
              {hive.modules.map((m, i) => (
                <span key={i} className="slot filled" title={content.modules[m]?.desc}>
                  <ItemIcon id={m} size={14} />
                  {content.items[m]?.label ?? m}
                  <button className="small" title="Démonter" onClick={() => act(`/hives/${hive.id}/modules/${i}`, undefined, 'DELETE')}>
                    ×
                  </button>
                </span>
              ))}
              {hive.modules.length < hive.slots &&
                fittable.map((m) => (
                  <button key={m} className="small" title={content.modules[m].desc} onClick={() => act(`/hives/${hive.id}/modules`, { module_id: m })}>
                    + {content.items[m].label} (×{state.inventory[m]})
                  </button>
                ))}
              {hive.modules.length === 0 && fittable.length === 0 && (
                <span className="muted">Aucun cadre monté. Les cadres s'achètent en boutique.</span>
              )}
            </div>
            {hive.slot_cost !== null && (
              <div>
                <button className="small" onClick={() => act(`/hives/${hive.id}/expand`)}>
                  + 1 emplacement (<Honey amount={hive.slot_cost} />)
                </button>
              </div>
            )}
            {hive.mods.automation && (
              <label className="row muted">
                <input type="checkbox" checked={hive.keep_drones} onChange={(e) => act(`/hives/${hive.id}`, { keep_drones: e.target.checked })} />
                Conserver les faux-bourdons en surplus
              </label>
            )}
            {queen && (
              <>
                <div className="muted">
                  Génération {queen.generation} · reste {queen.health} / {queen.max_health} cycles · accouplée avec{' '}
                  {speciesName(content, queen.mate)}
                </div>
                <GenomeTable genome={queen.genome} />
                <div>
                  <button
                    className="small danger"
                    title="La princesse revient en réserve, le faux-bourdon est perdu"
                    onClick={() => act(`/hives/${hive.id}/eject`)}
                  >
                    Retirer la reine
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ApiaryPage() {
  const { content, state, act } = useGame();
  const [open, setOpen] = useState<string | null>(null);
  const groups = groupBees(state.bees.filter((b) => b.hive_id === null));
  const opened: BeeGroup | undefined = groups.find((g) => g.key === open);

  return (
    <>
      <PageHead title="Rucher">
        Accouplez une princesse et un faux-bourdon pour obtenir une reine. Elle produit des rayons pendant sa vie, puis laisse une
        princesse et des faux-bourdons qui héritent de ses gènes, parfois avec une mutation. Chaque espèce a son climat : achetez en
        boutique des ruches dans d'autres biomes. Certaines mutations n'arrivent qu'à une heure, par un temps ou dans un lieu précis :
        tout se joue au moment où la reine meurt (voir l'Apidex).
      </PageHead>
      {state.rescue_available && (
        <div className="notice row between">
          <span>Plus d'abeilles ni de miel ? Un voisin apiculteur vous offre un couple de Sylvestres.</span>
          <button className="primary" onClick={() => act('/rescue')}>
            Accepter
          </button>
        </div>
      )}

      <h2>Ruches</h2>
      <div className="grid">
        {state.hives.map((hive) => (
          <HiveCard key={hive.id} hive={hive} />
        ))}
      </div>

      <h2>Réserve</h2>
      {groups.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
      <div className="grid tiles">
        {groups.map((group) => (
          <BeeTile key={group.key} group={group} onClick={() => setOpen(group.key)} />
        ))}
      </div>
      {opened && (
        <BeeSheet
          group={opened}
          onClose={() => setOpen(null)}
          actions={(bee) => (
            <>
              <button className="small" onClick={() => act('/bees/sell', { bee_id: bee.id, qty: 1 })}>
                Vendre 1 (<Honey amount={content.bee_sell[bee.type]} />)
              </button>
              {bee.count > 1 && (
                <button className="small" onClick={() => act('/bees/sell', { bee_id: bee.id, qty: bee.count })}>
                  Tout vendre ({fmt(bee.count)})
                </button>
              )}
            </>
          )}
        />
      )}
    </>
  );
}
