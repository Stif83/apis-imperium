import type { Cost, GameState } from './types';

/** Mise en forme des nombres et petites règles d'affichage partagées par les pages. */

export const fmt = (n: number) => n.toLocaleString('fr-FR');

export const WEATHER_ICONS: Record<string, string> = { clear: '', rain: '🌧️', storm: '⛈️', snow: '❄️' };

export const BIOME_ICONS: Record<string, string> = { plains: '🌼', taiga: '🌲', tundra: '🧊', jungle: '🌴', desert: '🌵' };

/** Vrai si le joueur a de quoi payer `times` fois ce prix (miel et objets). */
export function canAfford(state: GameState, cost: Cost | null | undefined, times = 1): boolean {
  if (!cost) return false;
  return state.player.honey >= (cost.honey ?? 0) * times && Object.entries(cost.items ?? {}).every(([i, n]) => (state.inventory[i] ?? 0) >= n * times);
}

/** Message d'un bouton d'achat grisé faute de moyens. */
export const SHORT = 'Pas assez de miel ou de ressources';

export const percent = (chance: number) => `${(chance * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** Part déjà réunie, en pourcentage : chaque ligne compte autant, quelle que soit sa quantité. */
export function donePercent(needs: [string, number][], given: (item: string) => number) {
  if (!needs.length) return 100;
  const share = needs.reduce((n, [item, need]) => n + Math.min(1, given(item) / need), 0) / needs.length;
  return Math.floor(100 * share);
}
