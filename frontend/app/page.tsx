'use client';

import { useState } from 'react';
import { BeeCard, GenomeIcon, GenomeTable, Honey, ItemIcon, ItemQty, TYPE_LABELS, WEATHER_ICONS, fmt, speciesName } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Bee, Hive } from '@/lib/types';

function beeLabel(content: ReturnType<typeof useGame>['content'], bee: Bee) {
  return `${speciesName(content, bee.genome)} ×${bee.count}`;
}

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

/** Petite ruche teintée à la couleur de son biome ; l'alvéaire a un étage de plus. */
function HiveIcon({ color, alveary }: { color: string; alveary: boolean }) {
  return (
    <svg width={26} height={26} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden>
      <rect x="5" y="1" width="6" height="2" fill="#2b1d0e" />
      {alveary && <rect x="2" y="3" width="12" height="3" fill={color} stroke="#2b1d0e" strokeWidth="0.6" />}
      <rect x="3" y={alveary ? 6 : 3} width="10" height={alveary ? 4 : 7} fill={color} stroke="#2b1d0e" strokeWidth="0.6" />
      <rect x="2" y="10" width="12" height="4" fill={color} stroke="#2b1d0e" strokeWidth="0.6" />
      <rect x="6" y="11" width="4" height="2" fill="#2b1d0e" />
    </svg>
  );
}

function HiveCard({ hive }: { hive: Hive }) {
  const { content, state, act } = useGame();
  const [princess, setPrincess] = useState('');
  const [drone, setDrone] = useState('');
  const [details, setDetails] = useState(false);

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
  const color = `#${content.biomes[hive.biome].color}`;

  return (
    <div className="card hive-card" style={{ borderTopColor: color }}>
      <div className="row between">
        <span className="row grow">
          <HiveIcon color={color} alveary={hive.hive_type === 'alveary'} />
          <HiveName hive={hive} />
        </span>
        {hive.status === 'working' && <span className="badge ok">Au travail</span>}
        {hive.status === 'climate' && <span className="badge warn">Climat inadapté</span>}
        {hive.status === 'resting' && (
          <span className="badge" title="Ce n'est pas l'heure de travail de cette reine (gène d'activité). Une lanterne la fait travailler à toute heure.">
            Au repos
          </span>
        )}
        {hive.status === 'weather' && (
          <span className="badge" title="Cette reine craint les intempéries. Un abri, ou le gène « Résiste aux intempéries », la fait travailler quand même.">
            À l'abri
          </span>
        )}
        {hive.status === 'empty' && <span className="badge">Sans reine</span>}
      </div>
      <div className="muted">
        {type.label} · <span style={{ color }}>{content.biomes[hive.biome].label}</span> · {content.temp_labels[hive.mods.temp]} ·{' '}
        {WEATHER_ICONS[state.world.weather[hive.biome]]} {content.world.weathers[state.world.weather[hive.biome]]}
        {hive.mods.automation && ' · automatisée'}
      </div>

      {queen ? (
        <div className="bee-head">
          <GenomeIcon genome={queen.genome} type="queen" />
          <div style={{ flex: 1 }}>
            <div className="title">Reine {speciesName(content, queen.genome)}</div>
            <div className="bar" title={`Reste ${queen.health} cycles sur ${queen.max_health}`}>
              <div style={{ width: `${(100 * (queen.max_health - queen.health)) / queen.max_health}%` }} />
            </div>
          </div>
        </div>
      ) : princesses.length && drones.length ? (
        <div className="stack">
          <div className="row">
            <select className="grow" value={princessId} onChange={(e) => setPrincess(e.target.value)}>
              {princesses.map((b) => (
                <option key={b.id} value={b.id}>
                  ♀ {beeLabel(content, b)}
                </option>
              ))}
            </select>
            <select className="grow" value={droneId} onChange={(e) => setDrone(e.target.value)}>
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

      {(outputs.length > 0 || waiting.length > 0) && (
        <div className="stack">
          <div className="row">
            {outputs.map(([item, n]) => (
              <ItemQty key={item} id={item} qty={n} />
            ))}
            {waiting.map((b) => (
              <span key={b.id} className="chip" title={`${TYPE_LABELS[b.type]} ${speciesName(content, b.genome)}`}>
                <GenomeIcon genome={b.genome} type={b.type} size={16} />
                {b.type === 'princess' ? '♀' : '♂'} {speciesName(content, b.genome)}
                <b>×{b.count}</b>
              </span>
            ))}
          </div>
          <button className="primary" onClick={() => act(`/hives/${hive.id}/collect`)}>
            Récolter
          </button>
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
  );
}

export default function ApiaryPage() {
  const { content, state, act } = useGame();
  const bees = state.bees.filter((b) => b.hive_id === null);

  return (
    <>
      <h1>Rucher</h1>
      <p className="muted">
        Accouplez une princesse et un faux-bourdon pour obtenir une reine. Elle produit des rayons pendant sa vie, puis laisse une
        princesse et des faux-bourdons qui héritent de ses gènes — parfois avec une mutation. Chaque espèce a son climat : achetez en
        boutique des ruches dans d'autres biomes au fur et à mesure. Certaines mutations n'arrivent qu'à une heure, par un temps ou
        dans un lieu précis : c'est au moment où la reine meurt que tout se joue (voir l'Apidex).
      </p>
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

      <h2>Abeilles en réserve</h2>
      {bees.length === 0 && <p className="muted">Aucune abeille en réserve.</p>}
      <div className="grid">
        {bees.map((bee) => (
          <BeeCard key={bee.id} genome={bee.genome} type={bee.type} count={bee.count}>
            <button className="small" onClick={() => act('/bees/sell', { bee_id: bee.id, qty: 1 })}>
              Vendre 1 (<Honey amount={content.bee_sell[bee.type]} />)
            </button>
            {bee.count > 1 && (
              <button className="small" onClick={() => act('/bees/sell', { bee_id: bee.id, qty: bee.count })}>
                Tout vendre ({fmt(bee.count)})
              </button>
            )}
          </BeeCard>
        ))}
      </div>
    </>
  );
}
