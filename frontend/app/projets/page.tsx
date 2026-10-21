'use client';

import { Honey, ItemIcon, PageHead, fmt } from '@/components/ui';
import { useGame } from '@/lib/game';

export default function ProjectsPage() {
  const { content, state, act } = useGame();

  return (
    <>
      <PageHead title="Grands projets">
        De grands chantiers en trois étapes, qui avalent des ressources de toutes vos branches. Donnez au fur et à mesure : une étape
        s'achève dès que tout ce qu'elle demande est réuni, et son effet s'applique aussitôt.
      </PageHead>

      <div className="project-grid">
        {Object.entries(content.projects.list).map(([pid, project]) => {
          const progress = state.projects?.[pid] ?? { stage: 0, given: {} };
          const stage = project.stages[progress.stage];
          const done = progress.stage >= project.stages.length;
          const needs: [string, number][] = stage ? [['honey', stage.cost.honey], ...Object.entries(stage.cost.items)] : [];
          const given = (item: string) => progress.given[item] ?? 0;
          const have = (item: string) => (item === 'honey' ? state.player.honey : state.inventory[item] ?? 0);
          const total = needs.reduce((n, [, need]) => n + need, 0);
          const got = needs.reduce((n, [item, need]) => n + Math.min(need, given(item)), 0);
          // « Tout donner » : chaque part reçoit ce qu'on peut lui donner
          const giveAll = async () => {
            for (const [item, need] of needs) {
              const qty = Math.min(need - given(item), have(item));
              if (qty > 0 && !(await act('/projects/contribute', { project_id: pid, item, qty }))) return;
            }
          };
          return (
            <div key={pid} className={`card project-card${done ? ' complete' : ''}`}>
              <div className="row between">
                <span className="project-title">
                  <span className="project-icon">{project.icon}</span>
                  <span>
                    <span className="title">{project.label}</span>
                    <span className="muted project-desc">{project.desc}</span>
                  </span>
                </span>
                {done && <span className="stamp">Achevé</span>}
              </div>

              <ol className="project-stages">
                {project.stages.map((s, i) => (
                  <li key={i} className={i < progress.stage ? 'done' : i === progress.stage ? 'current' : ''}>
                    <span className="project-step">{i < progress.stage ? '✓' : i + 1}</span>
                    <span>
                      <b>{s.label}</b>
                      <span className="muted"> · {s.effect}</span>
                    </span>
                  </li>
                ))}
              </ol>

              {stage && (
                <div className="stack">
                  <div className="row between">
                    <b>
                      Étape {progress.stage + 1} · {stage.label}
                    </b>
                    <span className="muted">{Math.floor((100 * got) / total)} %</span>
                  </div>
                  <div className="project-needs">
                    {needs.map(([item, need]) => {
                      const g = given(item);
                      const left = need - g;
                      const can = Math.min(left, have(item));
                      return (
                        <div key={item} className={`project-need${left <= 0 ? ' done' : ''}`}>
                          <span className="project-item">
                            {item === 'honey' ? <Honey amount={need} /> : <ItemIcon id={item} size={20} />}
                            <span>{item === 'honey' ? 'Miel' : content.items[item]?.label}</span>
                          </span>
                          <span className="bar">
                            <span style={{ width: `${Math.min(100, (100 * g) / need)}%` }} />
                          </span>
                          <span className="muted project-count">
                            {fmt(g)} / {fmt(need)}
                          </span>
                          {left > 0 ? (
                            <button
                              className="small"
                              disabled={can <= 0}
                              title={can <= 0 ? 'Rien en stock' : `Donner ${fmt(can)} (stock : ${fmt(have(item))})`}
                              onClick={() => act('/projects/contribute', { project_id: pid, item, qty: can })}
                            >
                              Donner {can > 0 ? fmt(can) : ''}
                            </button>
                          ) : (
                            <span className="ok-text">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div>
                    <button className="primary compact" onClick={giveAll}>
                      Tout donner
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <div className="card project-card soon">
          <span className="project-title">
            <span className="project-icon">🧭</span>
            <span>
              <span className="title">Poste d'expédition</span>
              <span className="muted project-desc">Bientôt : envoyer des abeilles explorer volcans, banquises et abysses.</span>
            </span>
          </span>
        </div>
      </div>
    </>
  );
}
