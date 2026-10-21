'use client';

import Link from 'next/link';
import { BeeIcon } from '@/components/BeeIcon';
import { Honey, ItemQty } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Content } from '@/lib/types';

export type Mutation = Content['mutations'][number];

export const percent = (chance: number) => `${(chance * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`;

/** Rang d'une espèce : 0 pour les espèces de base, sinon 1 + le rang de son parent le plus avancé. */
export function computeTiers(content: Content): Record<string, number> {
  const tiers: Record<string, number> = {};
  const results = new Set(content.mutations.map((m) => m.result));
  for (const id of Object.keys(content.species)) if (!results.has(id)) tiers[id] = 0;
  for (let changed = true; changed; ) {
    changed = false;
    for (const m of content.mutations) {
      if (tiers[m.a] === undefined || tiers[m.b] === undefined) continue;
      const tier = 1 + Math.max(tiers[m.a], tiers[m.b]);
      if (tiers[m.result] === undefined || tier < tiers[m.result]) {
        tiers[m.result] = tier;
        changed = true;
      }
    }
  }
  for (const id of Object.keys(content.species)) tiers[id] ??= 0;
  return tiers;
}

/** Une ligne par branche : ce qui caractérise la famille. */
export const BRANCH_LORE: Record<string, string> = {
  Mellifères: 'Les mellifères sont le cœur de tout rucher : robustes, dociles et généreuses en miel.',
  Nobles: "Les nobles produisent un miel ruisselant, recherché pour sa douceur, et ne se mêlent pas à n'importe qui.",
  Industrieuses: 'Les industrieuses ne s’arrêtent jamais : leurs rayons filandreux donnent une propolis précieuse.',
  Héroïques: 'Les héroïques sont de grandes abeilles courageuses, réputées pour leur longévité.',
  Frugales: 'Les frugales se contentent de peu et prospèrent là où la chaleur écrase tout.',
  Infernales: 'Les infernales viennent des terres brûlantes ; leurs rayons frémissent encore de chaleur.',
  Tropicales: 'Les tropicales aiment la moiteur des jungles et tissent des rayons soyeux.',
  Glaciales: 'Les glaciales gardent leur ruche dans le froid le plus vif, sous une épaisse fourrure.',
  Marécageuses: 'Les marécageuses butinent dans la vase et les roseaux, sans craindre l’humidité.',
  Agricoles: 'Les agricoles suivent les moissons et rapportent des rayons au parfum de blé.',
  Monastiques: 'Les monastiques vivent retirées, patientes et méthodiques ; leur lignée est d’une grande stabilité.',
  Néant: 'Les abeilles du Néant semblent venir d’ailleurs. Leurs rayons recèlent parfois une perle étrange.',
  Festives: 'Les festives apparaissent quand on s’y attend le moins et apportent toujours une surprise.',
  Vengeresses: 'Les vengeresses ont la rancune tenace et des rayons aussi sombres que leur humeur.',
  Stériles: 'Les stériles survivent dans les terres arides où presque rien ne pousse.',
  Macabres: 'Les macabres rôdent près de ce qui pourrit et en tirent des trésors inattendus.',
  Minérales: 'Les minérales ont la carapace dure comme la roche et des rayons chargés d’argile.',
  Métalliques: 'Les métalliques extraient des traces de métal de la pierre qu’elles butinent.',
  Précieuses: 'Les précieuses ne rapportent que rarement du métal, mais c’est de l’argent, de l’or ou du platine.',
  Gemmes: 'Les gemmes cristallisent la lumière : leurs rayons cachent parfois une pierre précieuse.',
  Nucléaires: 'Les nucléaires luisent dans l’obscurité. Mieux vaut les élever loin de la maison.',
  Aquatiques: 'Les aquatiques nagent presque autant qu’elles volent, et leurs rayons ruissellent d’eau.',
  Gourmandes: 'Les gourmandes ne butinent que les fleurs les plus sucrées.',
  Fermières: 'Les fermières tirent de la ferme bien plus que du miel : lait, café ou hydromel.',
  Volcaniques: 'Les volcaniques nichent au bord des coulées de lave et ne craignent aucune chaleur.',
  Venimeuses: 'Les venimeuses ont un dard redoutable ; leur venin a pourtant ses usages.',
  Gluantes: 'Les gluantes laissent partout un mucus collant, très apprécié des artisans.',
  Caustiques: 'Les caustiques rongent ce qu’elles touchent et produisent un acide puissant.',
  Énergiques: 'Les énergiques vivent vite et fort, crépitantes d’électricité statique.',
  Ténébreuses: 'Les ténébreuses fuient la lumière et teintent leurs rayons d’ombre.',
  Fossiles: 'Les fossiles semblent sorties d’un autre âge ; leurs rayons gardent la trace du passé.',
  Pétrolières: 'Les pétrolières butinent des fleurs huileuses et rapportent un liquide noir et épais.',
  Arcaniques: 'Les arcaniques vibrent d’une magie discrète, qu’on retrouve dans leurs rayons.',
  Enchantées: 'Les enchantées laissent derrière elles une poussière scintillante et une odeur de forêt.',
  Nocturnes: 'Les nocturnes travaillent sous la lune et rapportent parfois un éclat d’étoile.',
  Solaires: 'Les solaires suivent la course du soleil et emmagasinent sa chaleur dans leurs rayons.',
  Célestes: 'Les célestes unissent le jour et la nuit, et brillent des deux à la fois.',
  Aurorales: 'Les aurorales ne sortent qu’à l’aube et au crépuscule, quand la lumière est la plus douce.',
  Pluviales: 'Les pluviales dansent sous l’averse et récoltent la rosée.',
  Orageuses: 'Les orageuses se nourrissent de l’énergie de la foudre.',
  Neigeuses: 'Les neigeuses aiment les tempêtes de neige et figent le froid dans leurs rayons.',
  Terroirs: 'Les abeilles de terroir sont façonnées par leur paysage : dunes, cimes, canopée ou steppe.',
  Florales: 'Les florales vivent au milieu des fleurs et des vergers, dont elles portent le parfum.',
  Sociales: 'Les sociales forment d’immenses colonies et produisent sans relâche.',
  Recluses: 'Les recluses vivent seules et longtemps ; elles transmettent fidèlement leurs caractères.',
  Mécaniques: 'Les mécaniques mêlent l’abeille et l’horlogerie, dans un cliquetis permanent.',
  Chaotiques: 'Les chaotiques mutent à tout va : on ne sait jamais ce que donnera leur descendance.',
  Harmonieuses: 'Les harmonieuses recherchent l’équilibre et transmettent leurs gènes à l’identique.',
  Temporelles: 'Les temporelles jouent avec le temps : certaines vivent un éclair, d’autres une éternité.',
  Légendaires: 'Les légendaires sont l’aboutissement d’une vie d’apiculteur. Peu les ont vues de leurs yeux.',
};

/** Ce que donne un rayon à la centrifugeuse. */
export function Outputs({ comb }: { comb: string }) {
  const { content } = useGame();
  return (
    <div className="comb-out">
      {content.recipes[comb].map(([out, chance, qty]) => (
        <span key={out} className="row" style={{ gap: 4 }}>
          {out === 'honey' ? (
            <span className="chip">
              <Honey amount={qty} /> miel
            </span>
          ) : (
            <ItemQty id={out} qty={qty} />
          )}
          <span className="muted">{percent(chance)}</span>
        </span>
      ))}
    </div>
  );
}

/** Vignette d'espèce qui ouvre sa fiche ; anonyme tant qu'elle est inconnue. */
export function MiniBee({ id, size = 28 }: { id: string; size?: number }) {
  const { content, state } = useGame();
  const species = content.species[id];
  const known = state.discovered.includes(id);
  return (
    <Link className="mini" href={`/apidex/${id}`}>
      <BeeIcon species={id} color={species.color} secondary={species.secondary} type="queen" size={size} unknown={!known} />
      {known ? species.label : '???'}
    </Link>
  );
}

/** Une mutation : parent + parent → résultat, avec sa chance et sa condition ; « wide » occupe toute la largeur. */
export function Family({ m, wide = false }: { m: Mutation; wide?: boolean }) {
  const size = wide ? 44 : 28;
  return (
    <div className={`family${wide ? ' wide' : ''}`}>
      <MiniBee id={m.a} size={size} />
      <span className="op">+</span>
      <MiniBee id={m.b} size={size} />
      <span className="op">→</span>
      <MiniBee id={m.result} size={size} />
      <span className="family-odds">
        <span className="chance">{percent(m.chance)}</span>
        {m.cond_text ? <span className="cond">{m.cond_text}</span> : wide && <span className="muted">sans condition</span>}
      </span>
    </div>
  );
}
