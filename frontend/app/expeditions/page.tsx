'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import { GenomeIcon, ItemQty, PageHead, TYPE_LABELS, alleleLabel } from '@/components/ui';
import { beeScore, teamChance } from '@/lib/expeditions';
import { useGame } from '@/lib/game';
import type { Bee } from '@/lib/types';

function useNow(serverTime: number) {
  // Horloge locale recalée sur celle du serveur, pour les retours d'expédition
  const [offset] = useState(() => serverTime - Date.now());
  const [now, setNow] = useState(() => Date.now() + offset);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(timer);
  }, [offset]);
  return now;
}

const duration = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}`;
  if (s >= 60) return `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')}`;
  return `${s} s`;
};
const pct = (p: number) => `${Math.round(p * 100)} %`;

export default function ExpeditionsPage() {
  const { content, state, act } = useGame();
  const now = useNow(state.server_time);
  const [region, setRegion] = useState<string | null>(null);
  const [team, setTeam] = useState<string[]>([]);
  const data = state.expeditions;
  const stage = data.stage;
  const slots = stage ? content.expeditions.slots[String(stage)] : 0;
  const maxTier = stage ? content.expeditions.tiers[String(stage)] : 0;
  const reserve = state.bees.filter((b) => b.hive_id === null);
  const name = (sid: string) => (state.discovered.includes(sid) ? content.species[sid]?.label : '???');

  if (stage < 1)
    return (
      <>
        <PageHead guide="expeditions" title="Expéditions">Envoyez des équipes d'abeilles explorer des régions hostiles, et rapportez butin et espèces sauvages.</PageHead>
        <div className="notice">
          Il faut d'abord construire le <b>Poste d'expédition</b>, dans les <Link href="/projets">Grands projets</Link>.
        </div>
      </>
    );

  const picked = (bee: Bee) => team.filter((id) => id === bee.id).length;
  const chosen = region ? content.expeditions.regions[region] : null;
  const scores = chosen ? team.map((id) => beeScore(content, reserve.find((b) => b.id === id)!.genome, chosen).total) : [];

  return (
    <>
      <PageHead guide="expeditions" title="Expéditions">
        Chaque abeille est notée selon la région : climat toléré, résistance à la pluie, activité dans l'obscurité, endurance. Plus l'équipe
        est adaptée, plus la réussite est probable. Au retour : butin, parfois un fragment de gène rare, parfois une espèce sauvage. En cas
        d'échec, chaque abeille a {pct(content.expeditions.loss_chance)} de risque de ne pas revenir.
      </PageHead>

      <h2>
        Équipes en route · {data.teams.length} / {slots}
      </h2>
      {data.teams.length === 0 && <p className="muted">Aucune équipe dehors. Choisissez une région ci-dessous.</p>}
      <div className="exp-teams">
        {data.teams.map((t) => {
          const r = content.expeditions.regions[t.region];
          const progress = Math.min(1, (now - t.start_ms) / (t.end_ms - t.start_ms));
          return (
            <div key={t.id} className="card exp-team">
              <div className="row between">
                <b>
                  {r.icon} {r.label}
                </b>
                <span className="badge">{pct(t.chance)} de réussite</span>
              </div>
              <div className="row">
                {t.bees.map((b, i) => (
                  <GenomeIcon key={i} genome={b.genome} type={b.type} size={30} />
                ))}
              </div>
              <span className="bar">
                <span style={{ width: `${progress * 100}%` }} />
              </span>
              <span className="muted">{t.end_ms > now ? `Retour dans ${duration(t.end_ms - now)}` : 'De retour…'}</span>
            </div>
          );
        })}
      </div>

      {data.log.length > 0 && (
        <>
          <h2>Carnet de route</h2>
          <div className="exp-log">
            {data.log.map((r) => {
              const reg = content.expeditions.regions[r.region];
              return (
                <div key={r.id} className={`card exp-report${r.success ? ' ok' : ' ko'}${r.wild ? ' wild' : ''}`}>
                  <div className="row between">
                    <b>
                      {reg.icon} {reg.label} · {r.success ? 'Réussite' : 'Échec'}
                    </b>
                    <span className="muted">chance {pct(r.chance)}</span>
                  </div>
                  {r.wild && (
                    <div className="exp-wild">
                      <BeeIcon species={r.wild} color={content.species[r.wild].color} secondary={content.species[r.wild].secondary} type="queen" size={40} />
                      <span>
                        <b>Espèce sauvage : {content.species[r.wild].label} !</b>
                        <span className="muted"> Une princesse et un faux-bourdon ont rejoint votre réserve.</span>
                      </span>
                    </div>
                  )}
                  <div className="row" style={{ gap: 4 }}>
                    {Object.entries(r.loot).map(([item, n]) => (
                      <ItemQty key={item} id={item} qty={n} />
                    ))}
                    {r.fragment && (
                      <span className="chip">
                        🧬 Fragment : {content.chromosomes[r.fragment[0]]} « {alleleLabel(content, r.fragment[0], r.fragment[1])} »
                      </span>
                    )}
                  </div>
                  {r.lost.length > 0 && (
                    <span className="lacking">
                      Perdue{r.lost.length > 1 ? 's' : ''} : {r.lost.map((i) => name(r.bees[i])).join(', ')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <h2>Régions</h2>
      <div className="exp-regions">
        {Object.entries(content.expeditions.regions).map(([rid, r]) => {
          const locked = r.tier > maxTier;
          const open = region === rid;
          return (
            <div key={rid} className={`card exp-region${locked ? ' locked' : ''}${open ? ' open' : ''}`}>
              <div className="row between">
                <span className="exp-region-title">
                  <span className="exp-region-icon">{r.icon}</span>
                  <b>{r.label}</b>
                </span>
                <span className="badge">{r.tier === 1 ? 'Proche' : 'Lointaine'}</span>
              </div>
              <span className="muted">{r.desc}</span>
              <div className="row" style={{ gap: 4 }}>
                <span className="chip">🌡️ {content.temp_labels[r.temp]}</span>
                {r.wet && <span className="chip">🌧️ Pluie</span>}
                {r.dark && <span className="chip">🌑 Obscurité</span>}
                <span className="chip">⏳ {duration(r.minutes * 60000)}</span>
              </div>
              <div className="row" style={{ gap: 4 }}>
                {r.loot.map(([item, lo, hi]) => (
                  <span key={item} className="row" style={{ gap: 2 }}>
                    <ItemQty id={item} />
                    <span className="muted">
                      {lo}–{hi}
                    </span>
                  </span>
                ))}
                {r.rare.map((item) => (
                  <span key={item} title="Trouvaille rare">
                    ✨<ItemQty id={item} />
                  </span>
                ))}
              </div>
              <span className="muted">
                🦋 Sauvage : <b>{name(r.wild)}</b> · 🧬 {content.chromosomes[r.gene[0]]} « {alleleLabel(content, r.gene[0], r.gene[1])} »
              </span>
              {locked ? (
                <span className="muted">🔒 Région lointaine : Poste d'expédition, étape 2.</span>
              ) : !open ? (
                <div>
                  <button
                    className="primary compact"
                    disabled={data.teams.length >= slots}
                    title={data.teams.length >= slots ? 'Toutes les équipes sont dehors' : undefined}
                    onClick={() => {
                      setRegion(rid);
                      setTeam([]);
                    }}
                  >
                    Préparer une équipe
                  </button>
                </div>
              ) : (
                <div className="exp-builder">
                  <b>Choisissez jusqu'à {content.expeditions.team_max} abeilles</b>
                  <div className="exp-candidates">
                    {reserve
                      .map((b) => ({ bee: b, score: beeScore(content, b.genome, r) }))
                      .sort((x, y) => y.score.total - x.score.total)
                      .map(({ bee, score }) => {
                        const left = bee.count - picked(bee);
                        return (
                          <button
                            key={bee.id}
                            className="exp-candidate"
                            disabled={left <= 0 || team.length >= content.expeditions.team_max}
                            title={`Climat ${score.climate}/40 · pluie ${score.weather}/20 · obscurité ${score.dark}/20 · endurance ${score.endurance}/20`}
                            onClick={() => setTeam([...team, bee.id])}
                          >
                            <GenomeIcon genome={bee.genome} type={bee.type} size={26} />
                            <span className="grow">
                              {content.species[bee.genome.species[0]]?.label}
                              <span className="muted">
                                {' '}
                                {bee.type === 'princess' ? '♀' : '♂'} ×{left}
                              </span>
                            </span>
                            <span className={`exp-score s${Math.floor(score.total / 25)}`}>{score.total}</span>
                          </button>
                        );
                      })}
                  </div>
                  <div className="row between">
                    <span className="row" style={{ gap: 4 }}>
                      {team.length === 0 && <span className="muted">Équipe vide</span>}
                      {team.map((id, i) => {
                        const bee = reserve.find((b) => b.id === id)!;
                        return (
                          <button key={i} className="chip pick selected" title={`Retirer · ${TYPE_LABELS[bee.type]}`} onClick={() => setTeam(team.filter((_, j) => j !== i))}>
                            <GenomeIcon genome={bee.genome} type={bee.type} size={18} /> ×
                          </button>
                        );
                      })}
                    </span>
                    <span className="badge">{team.length ? pct(teamChance(scores)) : '—'} de réussite</span>
                  </div>
                  <div className="row">
                    <button
                      className="primary compact"
                      disabled={team.length === 0}
                      onClick={async () => {
                        if (await act('/expeditions/launch', { region: rid, bee_ids: team })) {
                          setRegion(null);
                          setTeam([]);
                        }
                      }}
                    >
                      Partir
                    </button>
                    <button className="small" onClick={() => setRegion(null)}>
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
