'use client';

import { useState } from 'react';
import { ActiveEffects } from '@/components/Effects';
import {
  BIOME_ICONS,
  BeeSheet,
  BeeTile,
  CostView,
  GenomeIcon,
  GenomeTable,
  Honey,
  ItemIcon,
  ItemQty,
  PageHead,
  TYPE_LABELS,
  Traits,
  WEATHER_ICONS,
  climateFit,
  fmt,
  groupBees,
  speciesName,
  type BeeGroup,
} from '@/components/ui';
import { HiveArt } from '@/components/HiveArt';
import { useGame } from '@/lib/game';
import { pedigreeLevel, pedigreeMissing } from '@/lib/trophies';
import type { Bee, Hive } from '@/lib/types';

const STATUS: Record<Hive['status'], { label: string; className: string; title: string }> = {
  working: { label: 'Au travail', className: 'badge ok', title: 'La reine produit des rayons.' },
  resting: { label: '💤 Au repos', className: 'badge info', title: "Ce n'est pas l'heure de travail de cette reine. Une lanterne la fait travailler à toute heure." },
  weather: { label: '☂️ À l’abri', className: 'badge info', title: 'Cette reine craint les intempéries. Un abri, ou le gène « Résiste aux intempéries », la fait travailler quand même.' },
  climate: { label: 'Climat inadapté', className: 'badge warn', title: "Le climat de la ruche ne convient pas à cette reine : elle ne travaille pas et ne vieillit pas." },
  empty: { label: 'Sans reine', className: 'badge', title: 'Installez une princesse et un faux-bourdon.' },
};

/** Choix du couple à installer : seules les princesses qui supportent le climat de la ruche sont sélectionnables. */
function InstallSheet({ hive, onClose }: { hive: Hive; onClose: () => void }) {
  const { content, state, act } = useGame();
  const reserve = state.bees.filter((b) => b.hive_id === null);
  const princesses = reserve
    .filter((b) => b.type === 'princess')
    .map((b) => ({ bee: b, fit: climateFit(content, b.genome, hive.mods.temp) }))
    .sort((a, b) => Math.abs(a.fit) - Math.abs(b.fit));
  const drones = reserve.filter((b) => b.type === 'drone');
  const [princessId, setPrincessId] = useState(princesses.find((p) => p.fit === 0)?.bee.id ?? '');
  const princess = reserve.find((b) => b.id === princessId);
  // Par défaut, un faux-bourdon de la même espèce que la princesse, de race pure si possible
  const sameSpecies = (id: string) =>
    (drones.find((d) => d.genome.species[0] === id && d.genome.species[1] === id) ?? drones.find((d) => d.genome.species[0] === id))?.id;
  const [droneId, setDroneId] = useState(() => (princess && sameSpecies(princess.genome.species[0])) ?? drones[0]?.id ?? '');
  const choosePrincess = (id: string) => {
    setPrincessId(id);
    const bee = reserve.find((b) => b.id === id);
    const match = bee && sameSpecies(bee.genome.species[0]);
    if (match) setDroneId(match);
  };
  const usable = princesses.filter((p) => p.fit === 0).length;
  const temp = content.temp_labels[hive.mods.temp];

  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet wide" role="dialog" aria-label={`Installer une reine dans ${hive.name}`} onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <div>
            <div style={{ font: '600 22px/1.2 var(--display)' }}>Installer une reine</div>
            <div className="muted">
              {hive.name} · {BIOME_ICONS[hive.biome]} climat {temp}
            </div>
          </div>
          <button className="help-btn" aria-label="Fermer" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="title">1. La princesse</div>
        {usable === 0 && (
          <div className="notice">
            Aucune de vos princesses ne supporte le climat « {temp} ». Achetez une ruche dans un autre biome, ou une princesse adaptée.
          </div>
        )}
        <div className="grid tiles">
          {princesses.map(({ bee, fit }) => (
            <button
              key={bee.id}
              className={`bee-tile${bee.id === princessId ? ' selected' : ''}`}
              disabled={fit !== 0}
              title={fit === 0 ? undefined : fit < 0 ? 'Trop froid pour elle ici' : 'Trop chaud pour elle ici'}
              onClick={() => choosePrincess(bee.id)}
            >
              <GenomeIcon genome={bee.genome} type="princess" size={44} />
              <span className="name">{content.species[bee.genome.species[0]]?.label}</span>
              {fit === 0 ? <Traits genome={bee.genome} /> : <span className="badge info">{fit < 0 ? '🥶 Trop froid' : '🥵 Trop chaud'}</span>}
              <span className="count">×{bee.count}</span>
            </button>
          ))}
        </div>

        <div className="title">2. Le faux-bourdon</div>
        {princess && princess.genome.species[0] !== princess.genome.species[1] && (
          <div className="help-text">
            Cette princesse est hybride : ses descendants risquent de retourner à l'espèce{' '}
            {content.species[princess.genome.species[1]]?.label}. Pour fixer l'espèce{' '}
            {content.species[princess.genome.species[0]]?.label}, accouplez-la avec un faux-bourdon de race pure de la même espèce
            (marqué « Fixe l'espèce »).
          </div>
        )}
        <div className="grid tiles">
          {drones.map((bee) => {
            const fixes =
              princess &&
              bee.genome.species[0] === princess.genome.species[0] &&
              bee.genome.species[1] === princess.genome.species[0];
            return (
              <button key={bee.id} className={`bee-tile${bee.id === droneId ? ' selected' : ''}`} onClick={() => setDroneId(bee.id)}>
                <GenomeIcon genome={bee.genome} type="drone" size={44} />
                <span className="name">{content.species[bee.genome.species[0]]?.label}</span>
                <Traits genome={bee.genome} />
                {fixes && <span className="badge ok">Fixe l'espèce</span>}
                <span className="count">×{bee.count}</span>
              </button>
            );
          })}
        </div>

        <button
          className="primary"
          disabled={!princessId || !droneId}
          onClick={async () => {
            if (await act(`/hives/${hive.id}/install`, { princess_id: princessId, drone_id: droneId })) onClose();
          }}
        >
          Accoupler et installer
        </button>
      </div>
    </div>
  );
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

function Scene({ hive }: { hive: Hive }) {
  const { content, state } = useGame();
  // Sous serre, il ne pleut pas
  const weather = hive.greenhouse ? 'clear' : (state.world.weather[hive.biome] ?? 'clear');
  const ground = content.greenhouse_biomes[hive.greenhouse ?? '']?.color ?? content.biomes[hive.biome].color;
  const queen = hive.queen;
  const species = queen ? content.species[queen.genome.species[0]] : null;
  const status = STATUS[hive.status];
  return (
    <div className="scene" data-phase={state.world.phase} data-weather={weather}>
      <span className="astre" />
      <span className="ground" style={{ background: `#${ground}` }} />
      <HiveArt alveary={hive.hive_type === 'alveary'} robo={hive.hive_type === 'robo'} />
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

/** Robo-ruche : les cadres à garder montés, remplacés depuis la réserve puis achetés au marché. */
function RoboLoadout({ hive, stage }: { hive: Hive; stage: number }) {
  const { content, act } = useGame();
  const saved = hive.loadout ?? [];
  const [draft, setDraft] = useState<string[]>(() => Array.from({ length: hive.slots }, (_, i) => saved[i] ?? ''));
  const changed = draft.filter(Boolean).join() !== saved.join();
  const set = (i: number, m: string) => setDraft(draft.map((d, j) => (j === i ? m : d)));
  return (
    <div className="upgrade-box robo-loadout">
      <div>
        <b>🤖 Configuration des cadres</b>
        <div className="muted">
          Un cadre usé est remplacé depuis la réserve
          {stage >= 2 ? ', ou acheté au marché si la réserve est vide.' : ' (achat au marché : étape « Chaîne de montage »).'}
        </div>
      </div>
      <div className="loadout-slots">
        {draft.map((m, i) => (
          <select key={i} value={m} onChange={(e) => set(i, e.target.value)} aria-label={`Emplacement ${i + 1}`}>
            <option value="">— vide —</option>
            {Object.entries(content.modules).map(([id, mod]) => (
              <option key={id} value={id}>
                {content.items[id]?.label ?? id} · {mod.desc}
              </option>
            ))}
          </select>
        ))}
      </div>
      <button className="primary compact" disabled={!changed} onClick={() => act(`/hives/${hive.id}/loadout`, { modules: draft.filter(Boolean) })}>
        Appliquer
      </button>
    </div>
  );
}

function HiveCard({ hive }: { hive: Hive }) {
  const { content, state, act } = useGame();
  const [picking, setPicking] = useState(false);
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
  const queen = hive.queen;
  const biome = content.biomes[hive.biome];
  const greenhouseStage = state.projects?.greenhouse?.stage ?? 0;
  const roboticsStage = state.projects?.robotics?.stage ?? 0;
  const greenhouseBiome = content.greenhouse_biomes[hive.greenhouse ?? ''];
  const next = content.evolutions[hive.hive_type];

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
            {hive.greenhouse && (
              <span
                className="chip"
                title={greenhouseBiome ? `Biome de serre : ${greenhouseBiome.desc}` : "Sous serre : température choisie, à l'abri de la pluie"}
              >
                🌡️ Serre · {greenhouseBiome?.label ?? content.temp_labels[hive.greenhouse]}
              </span>
            )}
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
              {hive.mutations_now && (
                <div className="mutations-now" title="Observatoire : mutations dont les parents et les conditions sont réunis en ce moment">
                  🔭{' '}
                  {hive.mutations_now.length === 0
                    ? 'Aucune mutation possible en ce moment'
                    : hive.mutations_now.map((m) => (
                        <span key={m.result} className="chip">
                          {state.discovered.includes(m.result) ? content.species[m.result]?.label : '???'} {Math.round(m.chance * 1000) / 10} %
                        </span>
                      ))}
                </div>
              )}
            </div>
          </div>
        ) : princesses.length && drones.length ? (
          <button className="primary" onClick={() => setPicking(true)}>
            Installer une reine
          </button>
        ) : (
          <div className="muted">Il faut une princesse et un faux-bourdon en réserve.</div>
        )}
        {picking && <InstallSheet hive={hive} onClose={() => setPicking(false)} />}

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
                  {hive.wear[i] != null && (
                    <span className={`badge${hive.wear[i]! <= 1 ? ' warn' : ''}`} title="Générations restantes avant usure">
                      {hive.wear[i]}/{content.modules[m]?.uses} gén.
                    </span>
                  )}
                  <button className="small" title="Démonter (il garde son usure)" onClick={() => act(`/hives/${hive.id}/modules/${i}`, undefined, 'DELETE')}>
                    ×
                  </button>
                </span>
              ))}
              {hive.modules.length < hive.slots &&
                fittable.map((m) => {
                  const spare = state.worn_modules[m] ?? [];
                  return (
                    <button key={m} className="small" title={content.modules[m].desc} onClick={() => act(`/hives/${hive.id}/modules`, { module_id: m })}>
                      + {content.items[m].label} (×{state.inventory[m]})
                      {spare.length > 0 && ` · entamé : ${Math.min(...spare)} gén.`}
                    </button>
                  );
                })}
              {hive.modules.length === 0 && fittable.length === 0 && (
                <span className="muted">Aucun cadre monté. Les cadres s'achètent en boutique.</span>
              )}
            </div>
            {hive.loadout && <RoboLoadout hive={hive} stage={roboticsStage} />}
            {hive.upgrade_cost && next && (
              <div className="upgrade-box">
                <div>
                  <b>Faire évoluer en {content.hive_types[next].label.toLowerCase()}</b>
                  <div className="muted">
                    Garde la reine, la récolte, les cadres et le biome. Passe à {content.hive_types[next].slots} emplacements (jusqu'à{' '}
                    {content.hive_types[next].max_slots}), production ×{String(content.hive_types[next].production).replace('.', ',')}
                    {next === 'robo'
                      ? ', avec élevage automatique intégré et des cadres configurés qui se remplacent seuls.'
                      : ', et accepte tous les modules.'}
                  </div>
                </div>
                <div className="row">
                  <CostView cost={hive.upgrade_cost} />
                  <button className="primary compact" onClick={() => act(`/hives/${hive.id}/upgrade`)}>
                    Faire évoluer
                  </button>
                </div>
              </div>
            )}
            {next === 'robo' && !hive.upgrade_cost && (
              <span className="muted">🤖 Le grand projet « L'ère de la robotique » permettra de la faire évoluer en robo-ruche.</span>
            )}
            {hive.slot_cost !== null && (
              <div>
                <button className="small" onClick={() => act(`/hives/${hive.id}/expand`)}>
                  + 1 emplacement (<Honey amount={hive.slot_cost} />)
                </button>
              </div>
            )}
            {greenhouseStage >= 1 && (
              <label className="row muted">
                🌡️ Serre
                <select
                  value={hive.greenhouse ?? ''}
                  onChange={(e) => act(`/hives/${hive.id}`, { greenhouse: e.target.value })}
                  aria-label="Température sous serre"
                >
                  <option value="">Hors serre (climat du biome)</option>
                  <optgroup label="Température">
                    {(content.projects.greenhouse_temps[String(Math.min(greenhouseStage, 3))] ?? []).map((t) => (
                      <option key={t} value={t}>
                        {content.temp_labels[t]}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Biomes de serre">
                    {Object.entries(content.greenhouse_biomes)
                      .filter(([, b]) => b.stage <= greenhouseStage)
                      .map(([id, b]) => (
                        <option key={id} value={id}>
                          {b.label} ({content.temp_labels[b.temp]})
                        </option>
                      ))}
                  </optgroup>
                </select>
              </label>
            )}
            {hive.mods.automation && (
              <label className="row muted">
                <input type="checkbox" checked={hive.keep_drones} onChange={(e) => act(`/hives/${hive.id}`, { keep_drones: e.target.checked })} />
                Conserver les faux-bourdons en surplus
              </label>
            )}
            {hive.mods.automation && (
              <label className="row muted">
                <input type="checkbox" checked={hive.reuse_drone} onChange={(e) => act(`/hives/${hive.id}`, { reuse_drone: e.target.checked })} />
                Réinjecter le faux-bourdon installé tant qu'il en reste en réserve
                {hive.line_drone &&
                  (hive.line_drone.genome ? (
                    <span className="badge">
                      {speciesName(content, hive.line_drone.genome)} ×{hive.line_drone.count}
                    </span>
                  ) : (
                    <span className="badge">réserve épuisée</span>
                  ))}
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

/** Présente l'abeille au jury : le pedigree obtenu reste acquis pour l'espèce, l'abeille n'est pas consommée. */
function Certify({ bee }: { bee: Bee }) {
  const { content, state, act } = useGame();
  const level = pedigreeLevel(bee.genome);
  const species = bee.genome.species[0];
  const best = state.pedigree?.[species] ?? 0;
  const levels = content.trophies.pedigree;
  const missing = pedigreeMissing(content, bee.genome);
  const next = levels[String(level + 1)];
  const hint = next ? `Pour « ${next.label} » : ${missing.join(', ')}` : 'Niveau maximal';
  if (level === 0) return <span className="muted" title={hint}>Hybride : pas de pedigree</span>;
  if (level <= best)
    return (
      <span className="muted" title={hint}>
        {levels[String(level)].icon} {levels[String(level)].label} · espèce déjà certifiée {levels[String(best)].label}
      </span>
    );
  return (
    <button className="small primary-soft" title={hint} onClick={() => act('/bees/certify', { bee_id: bee.id })}>
      Faire certifier : {levels[String(level)].icon} {levels[String(level)].label}
    </button>
  );
}

/** Prévisions de l'Observatoire : météo des prochaines périodes, pour chaque biome où l'on a une ruche. */
function Forecast() {
  const { content, state } = useGame();
  const biomes = [...new Set(state.hives.map((h) => h.biome))];
  const hours = (ms: number) => `dans ${Math.max(1, Math.round(ms / ((content.world.day_seconds * 1000) / 24)))} h`;
  return (
    <div className="card forecast">
      <div className="title">🔭 Prévisions de l'Observatoire</div>
      <table className="forecast-table">
        <thead>
          <tr>
            <th />
            {state.forecast!.map((f) => (
              <th key={f.in_ms}>{hours(f.in_ms)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {biomes.map((b) => (
            <tr key={b}>
              <th>
                {BIOME_ICONS[b]} {content.biomes[b].label}
              </th>
              {state.forecast!.map((f) => (
                <td key={f.in_ms} title={content.world.weathers[f.weather[b]]}>
                  {WEATHER_ICONS[f.weather[b]] || '☀️'} {content.world.weathers[f.weather[b]]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <span className="muted">Heures de jeu. Une ruche sous serre ne craint pas la pluie.</span>
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
      <PageHead guide="ruches" title="Rucher">
        Accouplez une princesse et un faux-bourdon pour obtenir une reine. Elle produit des rayons pendant sa vie, puis laisse une
        princesse et des faux-bourdons qui héritent de ses gènes, parfois avec une mutation. Chaque espèce a son climat : achetez en
        boutique des ruches dans d'autres biomes. Certaines mutations n'arrivent qu'à une heure, par un temps ou dans un lieu précis :
        tout se joue au moment où la reine meurt (voir l'Apidex).
        <br />
        <br />
        Quand une princesse mute, elle naît de race pure : installez-la avec un faux-bourdon de sa nouvelle espèce pour garder la
        lignée. Les faux-bourdons mutants, eux, sont souvent hybrides (pastille 🧬) : croisés avec une princesse de la même espèce,
        ils donnent des descendants de race pure.
      </PageHead>
      {state.rescue_available && (
        <div className="notice row between">
          <span>Plus d'abeilles ni de miel ? Un voisin apiculteur vous offre un couple de Sylvestres.</span>
          <button className="primary" onClick={() => act('/rescue')}>
            Accepter
          </button>
        </div>
      )}

      <ActiveEffects />
      {state.forecast && <Forecast />}

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
              <Certify bee={bee} />
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
