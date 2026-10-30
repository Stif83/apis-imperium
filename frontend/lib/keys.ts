/**
 * Clés React stables pour une liste de valeurs qui peuvent se répéter (cadres montés, lignes de journal…) :
 * la valeur elle-même, suivie de son rang parmi ses doublons.
 */
export function keyed<T>(items: T[], keyOf: (item: T) => string): { item: T; key: string }[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = keyOf(item);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { item, key: n ? `${base}#${n}` : base };
  });
}
