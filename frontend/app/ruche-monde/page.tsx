'use client';

import { Donations } from '@/components/Donations';
import { donePercent } from '@/lib/format';
import { worldTreeUrl } from '@/components/WorldTreeArt';
import { PageHead } from '@/components/ui';
import { useGame } from '@/lib/game';

const pct = (x: number) => `${Math.round(x * 100)} %`;

export default function WorldHivePage() {
  const { content, state, act } = useGame();
  const world = state.world_hive;
  const needs: [string, number][] = [['honey', world.request.honey], ...Object.entries(world.request.items ?? {})];
  const given = (item: string) => world.given[item] ?? 0;
  const done = donePercent(needs, given);

  return (
    <div className="world-tree pixel" style={{ backgroundImage: `url(${worldTreeUrl(world.level)})` }}>
      <div className="world-plate">
        <PageHead guide="ruche-monde" title="Ruche-monde">
          Une ruche immense, nichée au cœur de l'arbre-monde, que tous les apiculteurs rêvent d'achever et qui ne l'est jamais.
          Chaque niveau demande un panier de produits de branches différentes, tiré parmi les espèces que vous connaissez. Chaque
          niveau achevé allume des alvéoles et une lanterne dans l'arbre, et ajoute {pct(content.late.world_hive.bonus)} de
          production à toutes vos ruches.
        </PageHead>
        <div className="world-level">
          <span className="world-level-num">Niveau {world.level + 1}</span>
          <span>
            {world.level ? `${world.level} niveau${world.level > 1 ? 'x' : ''} achevé${world.level > 1 ? 's' : ''}` : 'Aucun niveau achevé'}
          </span>
          <span className="world-bonus">
            Production ×{world.multiplier.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} dans toutes les ruches
          </span>
        </div>
      </div>

      <div className="world-panel">
        <div className="row between">
          <b>Panier du niveau {world.level + 1}</b>
          <span className="badge">{done} %</span>
        </div>
        <span className="world-progress" aria-hidden>
          <span style={{ width: `${done}%` }} />
        </span>
        <Donations needs={needs} given={given} onGive={(item, qty) => act('/world-hive/contribute', { item, qty })} />
      </div>
    </div>
  );
}
