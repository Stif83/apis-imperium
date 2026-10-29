'use client';

import { Donations, donePercent } from '@/components/Donations';
import { PageHead } from '@/components/ui';
import { useGame } from '@/lib/game';

export default function ProjectsPage() {
  const { content, state, act } = useGame();

  return (
    <>
      <PageHead guide="projets" title="Grands projets">
        De grands chantiers en plusieurs étapes, qui avalent des ressources de toutes vos branches. Donnez au fur et à mesure : une étape
        s'achève dès que tout ce qu'elle demande est réuni, et son effet s'applique aussitôt.
      </PageHead>

      <div className="project-grid">
        {Object.entries(content.projects.list).map(([pid, project]) => {
          const progress = state.projects?.[pid] ?? { stage: 0, given: {} };
          const stage = project.stages[progress.stage];
          const done = progress.stage >= project.stages.length;
          const needs: [string, number][] = stage ? [['honey', stage.cost.honey], ...Object.entries(stage.cost.items)] : [];
          const given = (item: string) => progress.given[item] ?? 0;
          const give = (item: string, qty: number) => act('/projects/contribute', { project_id: pid, item, qty });
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
                    <span className="muted">{donePercent(needs, given)} %</span>
                  </div>
                  <Donations needs={needs} given={given} onGive={give} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
