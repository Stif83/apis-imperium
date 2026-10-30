import type { Bee, BeeType, Content, Genome } from './types';

/** Règles d'affichage des abeilles : libellés, gènes notables, regroupement et recherche. */

export const TYPE_LABELS: Record<BeeType, string> = { princess: 'Princesse', drone: 'Faux-bourdon', queen: 'Reine' };

/** Écart entre le climat d'une ruche et ce que supporte l'abeille : 0 si elle s'y plaît, sinon -1 (trop froid) ou +1 (trop chaud). */
export function climateFit(content: Content, genome: Genome, hiveTemp: string): -1 | 0 | 1 {
  const wanted = content.temps.indexOf(content.species[genome.species[0]]?.temp ?? 'normal');
  const tolerance = content.alleles.tolerance?.[genome.tolerance?.[0] ?? 'none']?.value ?? 0;
  const diff = content.temps.indexOf(hiveTemp) - wanted;
  if (Math.abs(diff) <= tolerance) return 0;
  return diff < 0 ? -1 : 1;
}

const ACTIVITY_ICONS: Record<string, string> = { diurnal: '☀️', nocturnal: '🌙', crepuscular: '🌅', cathemeral: '♾️' };

/** Gènes qui méritent d'être vus d'un coup d'œil ; le reste est dans la fiche complète. */
export function notableTraits(content: Content, genome: Genome): { icon: string; label: string }[] {
  const label = (c: string) => `${content.chromosomes[c]} : ${alleleLabel(content, c, genome[c]?.[0] ?? '')}`;
  const out: { icon: string; label: string }[] = [];
  const active = (c: string): string => genome[c]?.[0] ?? '';
  if (genome.species[0] !== genome.species[1]) out.push({ icon: '🧬', label: `Hybride de ${content.species[genome.species[1]]?.label}` });
  if (active('activity')) out.push({ icon: ACTIVITY_ICONS[active('activity')] ?? '☀️', label: label('activity') });
  if (active('weatherproof') === 'yes') out.push({ icon: '☂️', label: label('weatherproof') });
  if (['fast', 'faster', 'fastest'].includes(active('speed'))) out.push({ icon: '⚡', label: label('speed') });
  if (['long', 'longer', 'longest'].includes(active('lifespan'))) out.push({ icon: '⏳', label: label('lifespan') });
  if (Number(active('fertility')) >= 3) out.push({ icon: `♂${active('fertility')}`, label: label('fertility') });
  if (['one', 'two'].includes(active('tolerance'))) out.push({ icon: '🌡️', label: label('tolerance') });
  if (['chaotic', 'erratic', 'unstable'].includes(active('stability'))) out.push({ icon: '🎲', label: label('stability') });
  if (['stable', 'ordered', 'pure'].includes(active('stability'))) out.push({ icon: '🛡️', label: label('stability') });
  return out;
}

export type BeeGroup = { key: string; genome: Genome; bees: Bee[]; princesses: number; drones: number };

/** Regroupe les abeilles par espèce (active + inactive) ; chaque génome distinct reste une variante. */
export function groupBees(bees: Bee[]): BeeGroup[] {
  const groups = new Map<string, BeeGroup>();
  for (const bee of bees) {
    const key = bee.genome.species.join('|');
    let group = groups.get(key);
    if (!group) {
      group = { key, genome: bee.genome, bees: [], princesses: 0, drones: 0 };
      groups.set(key, group);
    }
    group.bees.push(bee);
    if (bee.type === 'princess') group.princesses += bee.count;
    else group.drones += bee.count;
  }
  return [...groups.values()];
}

export function speciesName(content: Content, genome: Genome) {
  const [active, inactive] = genome.species;
  const name = content.species[active]?.label ?? active;
  return active === inactive ? name : `${name} (hybride ${content.species[inactive]?.label ?? inactive})`;
}

export function alleleLabel(content: Content, chromosome: string, allele: string) {
  if (chromosome === 'species') return content.species[allele]?.label ?? allele;
  return content.alleles[chromosome]?.[allele]?.label ?? allele;
}

const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');

/** Vrai si l'abeille correspond à la recherche : espèces, branche, type ou gènes actifs, sans tenir compte des accents. */
export function beeMatches(content: Content, bee: { type: BeeType; genome: Genome }, query: string): boolean {
  const words = plain(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const [active, inactive] = bee.genome.species;
  const text = plain(
    [
      content.species[active]?.label,
      content.species[inactive]?.label,
      content.species[active]?.branch,
      TYPE_LABELS[bee.type],
      ...Object.keys(content.chromosomes).map((c) => (bee.genome[c] ? alleleLabel(content, c, bee.genome[c][0]) : '')),
    ].join(' '),
  );
  return words.every((w) => text.includes(w));
}
