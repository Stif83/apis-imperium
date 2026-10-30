import type { Content, GameState, Genome, Trophy } from '@/lib/types';

// Mêmes règles que le serveur (game/trophies.py), pour afficher le pedigree avant de certifier
const ELITE: Record<string, string[]> = { speed: ['fast', 'faster', 'fastest'], lifespan: ['long', 'longer', 'longest'], fertility: ['3', '4'] };
const CHAMPION: Record<string, string[]> = { tolerance: ['two'], weatherproof: ['yes'], activity: ['cathemeral'] };

/** Niveau de pedigree d'un génome : 0 (hybride) à 4 (Champion). */
export function pedigreeLevel(genome: Genome): number {
  if (genome.species[0] !== genome.species[1]) return 0;
  if (Object.values(genome).some(([a, b]) => a !== b)) return 1;
  if (Object.entries(ELITE).some(([c, ok]) => !ok.includes(genome[c]?.[0]))) return 2;
  if (Object.entries(CHAMPION).some(([c, ok]) => !ok.includes(genome[c]?.[0]))) return 3;
  return 4;
}

/** Ce qui manque pour le niveau suivant, en libellés de chromosomes. */
export function pedigreeMissing(content: Content, genome: Genome): string[] {
  const level = pedigreeLevel(genome);
  if (level === 0) return ["Gène d'espèce : copies différentes"];
  if (level === 1) return Object.entries(genome).filter(([, [a, b]]) => a !== b).map(([c]) => `${content.chromosomes[c]} : copies différentes`);
  if (level === 2) return Object.entries(ELITE).filter(([c, ok]) => !ok.includes(genome[c]?.[0])).map(([c]) => content.chromosomes[c]);
  if (level === 3) return Object.entries(CHAMPION).filter(([c, ok]) => !ok.includes(genome[c]?.[0])).map(([c]) => content.chromosomes[c]);
  return [];
}

/** Nombre de paliers atteints pour une valeur de la mesure. */
export const reachedTiers = (trophy: Trophy, value: number) => trophy.tiers.filter((t) => value >= t.need).length;

/** Trophées dont au moins un palier atteint attend d'être réclamé. */
export function claimableTrophies(content: Content, state: GameState): Trophy[] {
  return content.trophies.list.filter((t) => {
    const s = state.trophies?.[t.id];
    return s && reachedTiers(t, s.progress) > s.claimed;
  });
}

export const METAL_LABELS: Record<string, string> = { bronze: 'bronze', silver: 'argent', gold: 'or', diamond: 'diamant' };
