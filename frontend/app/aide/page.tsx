'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CostView, PageHead, alleleLabel } from '@/components/ui';
import { useGame } from '@/lib/game';
import type { Content } from '@/lib/types';

type Guide = {
  id: string;
  icon: string;
  title: string;
  /** Mots qui aident la recherche, en plus du titre */
  keywords: string;
  page?: { href: string; label: string };
  body: (content: Content, cycle: number) => ReactNode;
};

const pct = (x: number) => `${Math.round(x * 100)} %`;

/** Heures d'activité en plages lisibles : [6..19] -> « 6 h – 20 h ». */
function hourRanges(hours: number[]): string {
  if (hours.length >= 24) return 'à toute heure';
  const set = new Set(hours);
  const ranges: string[] = [];
  for (let h = 0; h < 24; h++) {
    if (!set.has(h) || set.has((h + 23) % 24)) continue;
    let end = h;
    while (set.has((end + 1) % 24) && end - h < 23) end++;
    ranges.push(`${h} h – ${((end + 1) % 24) || 24} h`);
  }
  return ranges.join(' et ');
}

function Tip({ children }: { children: ReactNode }) {
  return <div className="guide-tip">💡 {children}</div>;
}

const GUIDES: Guide[] = [
  {
    id: 'debuter',
    icon: '🌱',
    title: 'Premiers pas',
    keywords: 'début boucle miel secours voisin',
    page: { href: '/', label: 'Rucher' },
    body: (content, cycle) => (
      <>
        <p>
          Le jeu tourne en <b>cycles</b> de {cycle} secondes, même quand vous n'êtes pas là : à votre retour, tout ce qui s'est passé est
          rattrapé. La boucle est simple :
        </p>
        <ol>
          <li>Installez une princesse et un faux-bourdon dans une ruche : ils deviennent une reine.</li>
          <li>La reine produit des rayons pendant sa vie, puis laisse une princesse et des faux-bourdons, parfois mutés.</li>
          <li>Centrifugez les rayons pour obtenir du miel et des ressources.</li>
          <li>Dépensez-les en boutique (ruches, cadres, espèces), au Comptoir, puis dans les grands projets.</li>
        </ol>
        <Tip>
          Plus d'abeilles et plus assez de miel pour en racheter ? Un bandeau « secours » apparaît sur le Rucher : un voisin vous offre
          un couple de Sylvestres.
        </Tip>
      </>
    ),
  },
  {
    id: 'ruches',
    icon: '🏠',
    title: 'Ruches et reines',
    keywords: 'reine princesse faux-bourdon récolter vie longévité rucher alvéaire emplacement vendre',
    page: { href: '/', label: 'Rucher' },
    body: (content) => (
      <>
        <p>
          Une reine vit autant de cycles que l'indique son gène de <b>longévité</b>. À chaque cycle de travail, elle a une chance de
          produire chacun des rayons de son espèce ; son gène de <b>vitesse</b> et les cadres multiplient cette chance. Elle produit aussi,
          à demi-chance, les rayons de son espèce inactive.
        </p>
        <p>
          À sa mort, elle laisse <b>une princesse</b> et autant de <b>faux-bourdons</b> que l'indique sa fertilité. Sans automatisation,
          rayons et abeilles attendent dans la ruche : le bouton <b>Récolter</b> les range dans votre réserve.
        </p>
        <ul>
          {Object.entries(content.hive_types).map(([id, h]) => (
            <li key={id}>
              <b>{h.label}</b> : {h.slots} emplacement{h.slots > 1 ? 's' : ''}
              {h.max_slots > h.slots && ` (jusqu'à ${h.max_slots})`}, production ×{h.production}
              {h.frames_only ? ', cadres seulement.' : ', tous les modules.'}
            </li>
          ))}
        </ul>
        <p>
          Une ruche évolue sans perdre sa reine : rucher, puis alvéaire, puis robo-ruche (voir plus bas). Les abeilles en trop se vendent
          depuis la réserve (
          {content.bee_sell.drone} miel le faux-bourdon, {content.bee_sell.princess} la princesse).
        </p>
      </>
    ),
  },
  {
    id: 'climat',
    icon: '🌦️',
    title: 'Climat, heures et météo',
    keywords: 'biome température tolérance jour nuit pluie neige orage activité diurne nocturne horloge',
    body: (content) => (
      <>
        <p>
          Chaque biome a une température, chaque espèce la sienne. Une reine supporte un écart égal à sa <b>tolérance climatique</b> ;
          au-delà, elle se met en pause : elle ne vieillit plus et ne produit plus, jusqu'à ce qu'on la déplace ou qu'on règle la ruche
          (chauffage, ventilation, serre).
        </p>
        <ul>
          {Object.entries(content.biomes).map(([id, b]) => (
            <li key={id}>
              <b>{b.label}</b> : {content.temp_labels[b.temp]}
            </li>
          ))}
        </ul>
        <p>
          Une journée de jeu dure {Math.round(content.world.day_seconds / 60)} minutes réelles (l'horloge est en haut de l'écran). Les
          abeilles ne travaillent qu'à leurs heures, mais vieillissent tout le temps :
        </p>
        <ul>
          {Object.entries(content.world.activity_hours).map(([id, hours]) => (
            <li key={id}>
              <b>{alleleLabel(content, 'activity', id)}</b> : {hourRanges(hours)}
            </li>
          ))}
        </ul>
        <p>
          Par mauvais temps, seules les abeilles qui <b>résistent aux intempéries</b> continuent. Il pleut dans les biomes tempérés et
          chauds, il neige dans les froids, il ne pleut jamais dans les biomes torrides.
        </p>
        <p>
          Certains biomes n'existent que <b>sous serre</b> (grand projet Serre climatique) : une ruche sous serre peut reproduire l'un
          d'eux au lieu d'une simple température. Des espèces n'y naissent que là :
        </p>
        <ul>
          {Object.values(content.greenhouse_biomes).map((b) => (
            <li key={b.label}>
              <b>{b.label}</b> ({content.temp_labels[b.temp]}, serre étape {b.stage}) : {b.desc}
            </li>
          ))}
        </ul>
        <Tip>La lanterne fait travailler à toute heure, l'abri par tous les temps.</Tip>
      </>
    ),
  },
  {
    id: 'genes',
    icon: '🧬',
    title: 'Les gènes',
    keywords: 'chromosome allèle actif inactif dominant récessif hybride pur génome',
    body: (content) => (
      <>
        <p>
          Chaque abeille porte deux copies de chaque gène : une <b>active</b>, qui décide de ses caractères, et une <b>inactive</b>,
          qu'elle peut transmettre. À la naissance, chaque parent donne une de ses deux copies au hasard ; si l'une est dominante et
          l'autre récessive, la dominante devient active.
        </p>
        <ul>
          {Object.entries(content.chromosomes).map(([id, label]) => (
            <li key={id}>
              <b>{label}</b> : {GENE_ROLES[id] ?? ''}
            </li>
          ))}
        </ul>
        <p>
          Une abeille dont les deux copies d'espèce diffèrent est <b>hybride</b> (pastille 🧬) : sa descendance se disperse. Croisez-la
          avec une abeille pure de la même espèce pour la stabiliser.
        </p>
      </>
    ),
  },
  {
    id: 'mutations',
    icon: '✨',
    title: 'Mutations',
    keywords: 'mutation condition stabilité chance mutateur stabilisateur nouvelle espèce',
    page: { href: '/apidex', label: 'Apidex' },
    body: (content) => (
      <>
        <p>
          Certains couples d'espèces peuvent donner une espèce nouvelle. La chance de mutation (affichée dans l'Apidex) est tirée à la
          mort de la reine, pour la princesse et chaque faux-bourdon, et ne joue que si ses <b>conditions</b> sont réunies à ce moment
          précis : heure, météo, biome, cadre installé, nombre de ruches, espèces découvertes…
        </p>
        <p>
          Le gène de <b>stabilité</b> de la reine multiplie cette chance :{' '}
          {Object.keys(content.alleles.stability ?? {})
            .map((a) => `${alleleLabel(content, 'stability', a)} ×${String(content.alleles.stability[a].value).replace('.', ',')}`)
            .join(', ')}
          . Le Mutateur la double, le Stabilisateur l'annule, et le Grand télescope de l'Observatoire l'augmente encore.
        </p>
        <p>
          Une princesse qui mute naît de <b>race pure</b> : installez-la avec un faux-bourdon de sa nouvelle espèce pour garder la
          lignée. Les faux-bourdons mutants, eux, sont souvent hybrides.
        </p>
        <Tip>La coupole de l'Observatoire affiche, sur chaque ruche, les mutations possibles en ce moment.</Tip>
      </>
    ),
  },
  {
    id: 'modules',
    icon: '🧩',
    title: 'Cadres et modules',
    keywords: 'cadre module usure génération mutateur production chauffage ventilation lanterne abri',
    page: { href: '/boutique', label: 'Boutique' },
    body: (content) => (
      <>
        <p>
          Les cadres se montent dans tous les types de ruche, les autres modules seulement dans un alvéaire. Certains s'usent : ils
          durent un nombre de générations de reine, puis disparaissent. Un module démonté garde son usure.
        </p>
        <table className="guide-table">
          <thead>
            <tr>
              <th>Module</th>
              <th>Effet</th>
              <th>Durée</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(content.modules).map(([id, m]) => (
              <tr key={id}>
                <td>
                  <b>{content.items[id]?.label ?? id}</b>
                  {!m.frame && <span className="muted"> · alvéaire</span>}
                </td>
                <td>{m.desc}</td>
                <td>{m.uses ? `${m.uses} gén.` : 'illimitée'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </>
    ),
  },
  {
    id: 'elevage',
    icon: '🤖',
    title: 'Élevage automatique',
    keywords: 'automatisation récolte automatique réinjecter faux-bourdon lignée conserver surplus',
    page: { href: '/', label: 'Rucher' },
    body: () => (
      <>
        <p>
          Avec un module d'automatisation, la ruche se gère seule : les rayons vont directement dans votre réserve et, à la mort de la
          reine, sa princesse est aussitôt accouplée et réinstallée.
        </p>
        <ul>
          <li>
            <b>Réinjecter le faux-bourdon installé</b> : tant qu'il en reste en réserve, la nouvelle reine est accouplée avec le même
            faux-bourdon que la première. Génération après génération, la lignée se rapproche de l'espèce de ce faux-bourdon.
          </li>
          <li>
            <b>Conserver les faux-bourdons en surplus</b> : les faux-bourdons non utilisés rejoignent la réserve au lieu d'être perdus.
          </li>
        </ul>
        <Tip>Pour fixer une espèce, achetez ou élevez beaucoup de faux-bourdons purs et laissez la ruche réinjecter.</Tip>
      </>
    ),
  },
  {
    id: 'robo',
    icon: '🤖',
    title: 'Robo-ruches',
    keywords: 'robotique microprocesseur robo-ruche configuration cadres rachat automatique marché fin de partie',
    page: { href: '/projets', label: 'Domaine › Grands projets' },
    body: (content) => (
      <>
        <p>
          L'abeille <b>Robotique</b> (Forgeronne × Cybernétique, sous une serre « Forge ») produit des <b>microprocesseurs</b>. Ils servent à
          bâtir le grand projet <b>L'ère de la robotique</b>, qui permet de faire évoluer un alvéaire en robo-ruche.
        </p>
        <p>
          Une robo-ruche a {content.hive_types.robo?.slots} emplacements (jusqu'à {content.hive_types.robo?.max_slots}), produit ×
          {String(content.hive_types.robo?.production ?? 1).replace('.', ',')} et élève toute seule, sans module d'automatisation.
          Dans ses réglages, on choisit les cadres qu'elle doit garder : quand l'un s'use, elle le remplace depuis la réserve, puis
          (étape « Chaîne de montage ») l'achète elle-même au marché.
        </p>
        <Tip>Chaque robo-ruche coûte plus cher que la précédente : réservez-les à vos meilleures lignées.</Tip>
      </>
    ),
  },
  {
    id: 'centrifugeuse',
    icon: '⚙️',
    title: 'Centrifugeuse',
    keywords: 'usine atelier rayon centrifuger automatique arrêt auto maintenir ressources',
    page: { href: '/usine', label: 'Atelier › Centrifugeuse' },
    body: (content, cycle) => (
      <>
        <p>
          Chaque rayon donne du miel et parfois des ressources (le détail est dans l'Apidex, onglet Rayons). À la main, maintenez le
          bouton quelques secondes par rayon. Chaque centrifugeuse automatique traite un rayon par cycle ({cycle} s), même hors ligne.
        </p>
        <p>
          L'interrupteur <b>Automatique</b> arrête ou relance toutes les centrifugeuses ; la case <b>Auto</b> d'un rayon le met de côté.
          Pratique pour garder des rayons qu'une commande du Comptoir réclame.
        </p>
      </>
    ),
  },
  {
    id: 'laboratoire',
    icon: '🔬',
    title: 'Laboratoire',
    keywords: 'génétique extraction fragment dose impression réplication paillasse chaîne verrerie banque',
    page: { href: '/genetique', label: 'Atelier › Laboratoire' },
    body: (content) => (
      <>
        <p>
          <b>Extraire</b> sacrifie une abeille et donne un fragment de son gène actif ({pct(content.lab.extract_fail)} d'échec, 1
          verrerie). Il faut de 2 à 8 fragments selon la rareté du gène ; un gène complet offre {content.lab.doses} doses dans la banque.
        </p>
        <p>
          <b>Imprimer</b> remplace la copie active d'un gène chez une abeille, contre une dose, {content.lab.imprint.labware} verreries et,
          par gène : {content.lab.imprint.costs.common.honey} miel (commun), {content.lab.imprint.costs.medium.honey} (moyen),{' '}
          {content.lab.imprint.costs.rare.honey} (rare) ou {content.lab.imprint.costs.species.honey} (espèce), plus de la propolis, de la
          gelée royale ou des rayons de l'espèce. Il faut ensuite élever pour fixer le caractère. <b>Répliquer</b> refait des doses d'un
          gène déjà dans la banque.
        </p>
        <ul>
          {Object.entries(content.lab.levels).map(([n, l]) => (
            <li key={n}>
              <b>
                Niveau {n} · {l.label}
              </b>{' '}
              ({l.min_species} espèces découvertes) : {l.desc}
            </li>
          ))}
        </ul>
        <p>
          Chaque paillasse mène une opération à la fois ; on en achète d'autres pour travailler en parallèle. Le <b>passeur
          d'échantillons</b> enchaîne les extractions sur les abeilles identiques jusqu'au gène complet ; l'interrupteur 🔁 l'enclenche ou
          le coupe sur une extraction en cours.
        </p>
      </>
    ),
  },
  {
    id: 'boutique',
    icon: '🛒',
    title: 'Boutique',
    keywords: 'acheter prix hausse ruche biome espèce débloquer',
    page: { href: '/boutique', label: 'Marché › Boutique' },
    body: () => (
      <>
        <p>
          Tout se paie en miel, parfois complété par des ressources. Le prix d'une machine augmente à chaque exemplaire possédé, miel et
          ressources ensemble. Pour les ruches, toutes comptent ensemble : chaque ruche possédée, quel que soit son type, renchérit la
          suivante, et un alvéaire compte en plus les alvéaires déjà possédés. Un emplacement ajouté renchérit les emplacements de toutes
          vos ruches.
        </p>
        <p>Les espèces rares ne sont proposées qu'après un certain nombre d'espèces découvertes. Une ruche s'achète dans le biome de votre choix.</p>
      </>
    ),
  },
  {
    id: 'comptoir',
    icon: '📜',
    title: 'Comptoir et réputation',
    keywords: 'commande guilde réputation prestige livrer refuser',
    page: { href: '/comptoir', label: 'Marché › Comptoir' },
    body: (content) => (
      <>
        <p>
          Les guildes passent commande : des ressources, une abeille aux gènes précis, ou un pedigree certifié. Une livraison rapporte du
          miel et de la <b>réputation</b>. Un client repart au bout de {content.orders.lifetime_ms / 3600000} h, et une place libérée se
          remplit {content.orders.refill_ms / 60000} min plus tard. Refuser une commande libère sa place.
        </p>
        <ul>
          {Object.values(content.orders.guilds).map((g) => (
            <li key={g.label}>
              {g.icon} <b>{g.label}</b> : {g.desc}
            </li>
          ))}
        </ul>
        <p>
          Titres de réputation :{' '}
          {content.orders.levels.map((l) => `${l.label} (${l.need})`).join(', ')}. Les titres ouvrent plus de places et une commande de
          prestige chaque semaine.
        </p>
      </>
    ),
  },
  {
    id: 'projets',
    icon: '🏛️',
    title: 'Grands projets',
    keywords: 'observatoire serre poste expédition sanctuaire étape chantier',
    page: { href: '/projets', label: 'Domaine › Grands projets' },
    body: (content) => (
      <>
        <p>
          Des chantiers en trois étapes. Donnez au fur et à mesure : une étape s'achève dès que tout ce qu'elle demande est réuni, et son
          effet s'applique aussitôt.
        </p>
        {Object.entries(content.projects.list).map(([id, p]) => (
          <div key={id} className="guide-project">
            <b>
              {p.icon} {p.label}
            </b>
            <ol>
              {p.stages.map((s) => (
                <li key={s.label}>
                  <b>{s.label}</b> : {s.effect}
                  <CostView cost={s.cost} />
                </li>
              ))}
            </ol>
          </div>
        ))}
      </>
    ),
  },
  {
    id: 'expeditions',
    icon: '🧭',
    title: 'Expéditions',
    keywords: 'équipe région score butin sauvage perte fragment poste',
    page: { href: '/expeditions', label: 'Domaine › Expéditions' },
    body: (content) => (
      <>
        <p>
          Il faut d'abord le Poste d'expédition (grand projet). Envoyez jusqu'à {content.expeditions.team_max} abeilles dans une région :
          chacune est notée selon le climat qu'elle tolère, sa résistance à la pluie, son activité dans l'obscurité et son endurance. Plus
          l'équipe est adaptée, plus la réussite est probable.
        </p>
        <p>
          Au retour : du butin, parfois un fragment de gène rare pour le laboratoire, parfois une <b>espèce sauvage</b> qu'on ne trouve
          nulle part ailleurs. En cas d'échec, chaque abeille a {pct(content.expeditions.loss_chance)} de risque de ne pas revenir.
        </p>
        <ul>
          {Object.values(content.expeditions.regions).map((r) => (
            <li key={r.label}>
              {r.icon} <b>{r.label}</b> ({content.temp_labels[r.temp]}
              {r.wet ? ', humide' : ''}
              {r.dark ? ', obscure' : ''}, {r.minutes} min) : {r.desc}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'apidex',
    icon: '📖',
    title: 'Apidex',
    keywords: 'espèces branches arbre mutations fiche rayons découverte',
    page: { href: '/apidex', label: 'Apidex' },
    body: () => (
      <p>
        Toutes les espèces, rangées par branche. Une fiche par abeille : présentation, ce qu'elle récolte, ses parents et ce qu'elle peut
        donner, avec les chances et les conditions. L'onglet Rayons détaille la centrifugeuse, l'arbre des mutations se parcourt en
        zoomant. Les espèces encore inconnues restent anonymes.
      </p>
    ),
  },
  {
    id: 'trophees',
    icon: '🏆',
    title: 'Trophées et pedigree',
    keywords: 'carnet palier bronze argent or diamant réclamer pedigree certifier pure stable élite champion',
    page: { href: '/carnet', label: 'Carnet › Trophées' },
    body: (content) => (
      <>
        <p>
          Chaque trophée a jusqu'à quatre paliers : bronze, argent, or et diamant. Un palier atteint se <b>réclame</b> dans le Carnet
          (pastille rouge sur le menu) et rapporte du miel, parfois du matériel.
        </p>
        <p>
          Le <b>pedigree</b> récompense la qualité d'une lignée. Sur la fiche d'une abeille du Rucher, « Certifier » présente l'abeille au
          jury sans la consommer : son niveau est acquis pour toute l'espèce s'il est meilleur que le précédent.
        </p>
        <ul>
          {Object.values(content.trophies.pedigree).map((l) => (
            <li key={l.label}>
              {l.icon} <b>{l.label}</b> : {l.desc}
            </li>
          ))}
        </ul>
      </>
    ),
  },
  {
    id: 'communaute',
    icon: '👥',
    title: 'Communauté',
    keywords: 'vitrine exposer like badge autres joueurs',
    page: { href: '/communaute', label: 'Carnet › Communauté' },
    body: (content) => (
      <p>
        Exposez jusqu'à {content.showcase_max_entries} abeilles dans une vitrine et découvrez celles des autres apiculteurs. Une vitrine
        garde une copie de chaque spécimen : elle reste visible même s'il disparaît de votre réserve. Vos branches complètes et vos
        meilleurs trophées s'y affichent en badges.
      </p>
    ),
  },
];

/** Ce que contrôle chaque gène, en une phrase. */
const GENE_ROLES: Record<string, string> = {
  species: 'l’espèce, donc les rayons produits, le climat préféré et les mutations possibles.',
  speed: 'la vitesse de production des rayons.',
  lifespan: 'la durée de vie de la reine, en cycles.',
  fertility: 'le nombre de faux-bourdons laissés à sa mort.',
  tolerance: 'l’écart de température supporté autour du climat de l’espèce.',
  activity: 'les heures de travail : le jour, la nuit, à l’aube et au crépuscule, ou tout le temps.',
  weatherproof: 'le travail sous la pluie, l’orage et la neige.',
  stability: 'la chance de mutation de sa descendance, de « Chaotique » (beaucoup) à « Pure » (aucune).',
};

export default function HelpPage() {
  const { content, state } = useGame();
  const [query, setQuery] = useState('');
  const [hash, setHash] = useState('');

  // Section visée par l'ancre : à l'ouverture (lien des autres pages) et à chaque clic du sommaire
  useEffect(() => {
    const follow = () => {
      const id = window.location.hash.slice(1);
      setHash(id);
      if (id) document.getElementById(id)?.scrollIntoView();
    };
    follow();
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);

  const shown = useMemo(() => {
    const words = query.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').split(/\s+/).filter(Boolean);
    const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    return GUIDES.filter((g) => words.every((w) => plain(`${g.title} ${g.keywords}`).includes(w)));
  }, [query]);

  return (
    <>
      <PageHead title="Aide" />
      <p className="muted">Comment fonctionne chaque mécanisme du jeu. Les chiffres viennent directement des règles en vigueur.</p>
      <div className="guide-layout">
        <aside className="guide-toc">
          <input
            type="search"
            placeholder="Rechercher (mutation, serre, pedigree…)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Rechercher dans l'aide"
          />
          <nav aria-label="Sommaire">
            {shown.map((g) => (
              <a key={g.id} href={`#${g.id}`} className={hash === g.id ? 'active' : ''}>
                <span aria-hidden>{g.icon}</span> {g.title}
              </a>
            ))}
          </nav>
        </aside>
        <div className="guide-sections">
          {shown.length === 0 && <p className="muted">Aucune section ne correspond à « {query} ».</p>}
          {shown.map((g) => (
            <section key={g.id} id={g.id} className={`card guide-section${hash === g.id ? ' focus' : ''}`}>
              <div className="row between">
                <h2>
                  <span aria-hidden>{g.icon}</span> {g.title}
                </h2>
                {g.page && (
                  <Link className="chip" href={g.page.href}>
                    {g.page.label} →
                  </Link>
                )}
              </div>
              {g.body(content, state.cycle_seconds)}
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
