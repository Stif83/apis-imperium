/** Mesures des vitrines du Musée, en pixels de jeu. */

export const CELL = 12;

export const PER_SHELF = 6;

export const SHELF = 14;

/** Taille d'une vitrine, en pixels de jeu, selon le nombre d'objets exposés. */
export function vitrineSize(n: number) {
  const shelves = Math.max(1, Math.ceil(n / PER_SHELF));
  return { w: PER_SHELF * CELL + 8, h: 14 + shelves * SHELF + 9 };
}
