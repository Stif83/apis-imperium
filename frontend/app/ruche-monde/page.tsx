'use client';

import { Donations, donePercent } from '@/components/Donations';
import { PageHead } from '@/components/ui';
import { useGame } from '@/lib/game';

const pct = (x: number) => `${Math.round(x * 100)} %`;

export default function WorldHivePage() {
  const { content, state, act } = useGame();
  const world = state.world_hive;
  const needs: [string, number][] = [['honey', world.request.honey], ...Object.entries(world.request.items ?? {})];
  const given = (item: string) => world.given[item] ?? 0;

  return (
    <>
      <PageHead guide="ruche-monde" title="Ruche-monde">
        Une ruche immense que tous les apiculteurs rêvent d'achever, et qui ne l'est jamais. Chaque niveau demande un panier de
        produits de branches différentes, tiré parmi les espèces que vous connaissez. Chaque niveau achevé ajoute{' '}
        {pct(content.late.world_hive.bonus)} de production à toutes vos ruches.
      </PageHead>

      <div className="card world-hive">
        <div className="world-hive-head">
          <span className="world-globe" aria-hidden>
            🌍
          </span>
          <span>
            <span className="title">Niveau {world.level + 1}</span>
            <span className="muted">
              {world.level ? `${world.level} niveau${world.level > 1 ? 'x' : ''} achevé${world.level > 1 ? 's' : ''}` : 'Aucun niveau achevé'} ·
              production ×
              {world.multiplier.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} dans toutes les ruches
            </span>
          </span>
          <span className="badge">{donePercent(needs, given)} %</span>
        </div>
        <Donations needs={needs} given={given} onGive={(item, qty) => act('/world-hive/contribute', { item, qty })} />
      </div>
    </>
  );
}
