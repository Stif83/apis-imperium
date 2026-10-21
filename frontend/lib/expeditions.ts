import { climateFit } from '@/components/ui';
import type { Content, Genome, Region } from '@/lib/types';

// Mêmes règles que le serveur (game/expeditions.py), pour annoncer la chance avant le départ

export type Score = { climate: number; weather: number; dark: number; endurance: number; total: number };

export function beeScore(content: Content, genome: Genome, region: Region): Score {
  const lifespan = content.alleles.lifespan?.[genome.lifespan?.[0]]?.value ?? 30;
  const parts = {
    climate: climateFit(content, genome, region.temp) === 0 ? 40 : 0,
    weather: !region.wet || genome.weatherproof?.[0] === 'yes' ? 20 : 0,
    dark: !region.dark || ['nocturnal', 'cathemeral'].includes(genome.activity?.[0]) ? 20 : 0,
    endurance: Math.round(20 * Math.min(1, lifespan / 40)),
  };
  return { ...parts, total: parts.climate + parts.weather + parts.dark + parts.endurance };
}

export function teamChance(scores: number[]): number {
  const failure = scores.reduce((f, s) => f * (1 - (0.8 * s) / 100), 1);
  return Math.min(0.95, 1 - failure);
}
