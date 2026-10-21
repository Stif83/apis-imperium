// Petit lore de chaque espèce, affiché sur sa fiche dans l'Apidex.
// Une espèce sans texte ici retombe sur la phrase de sa branche (BRANCH_LORE).

export const LORE: Record<string, string> = {
  // Mellifères
  forest:
    "On raconte que la première ruche du monde était un vieux chêne creux, et que la Sylvestre y vivait déjà. Elle ne se presse jamais : elle a vu passer tant de saisons qu'elle sait que les fleurs reviennent toujours.",
  meadows:
    "La Des prés suit le vent qui couche les herbes hautes. Les enfants des villages l'appellent « l'abeille des goûters », car elle se pose sans crainte sur les tartines de miel.",
  common:
    "Née de la rencontre des abeilles des bois et des prés, la Commune n'a rien d'extraordinaire, et c'est sa force : on la trouve partout, et partout elle se rend utile.",
  cultivated:
    "Élevée depuis des générations par les apiculteurs, la Cultivée a appris à vivre vite et à produire beaucoup. Elle s'impatiente quand la ruche est vide de travail.",

  // Nobles
  noble:
    "La Noble ne se pose que sur les fleurs les plus parfaites. Son miel coule lentement, épais comme du velours, et les anciens rois le gardaient pour les jours de fête.",
  majestic:
    "Quand une Majestueuse entre dans la ruche, les ouvrières s'écartent sur son passage. Personne ne sait vraiment pourquoi : elle ne donne jamais d'ordre.",
  imperial:
    "L'Impériale porte une couronne de duvet doré et ne quitte presque jamais le cœur de la ruche. C'est elle qui sécrète la gelée royale dont on nourrit les futures reines.",

  // Industrieuses
  diligent:
    "La Diligente commence sa journée avant l'aube et range chaque alvéole au millimètre. Elle tisse des fils de cire si fins qu'on les croirait de soie.",
  unweary:
    "On dit que l'Infatigable ne dort jamais. En réalité elle se repose en vol, entre deux fleurs, les yeux grands ouverts.",
  industrious:
    "L'Industrieuse a transformé la ruche en atelier. Elle ramène de la propolis pour colmater chaque fissure et du pollen en réserve pour l'hiver, toujours un peu plus que nécessaire.",

  // Héroïques
  steadfast:
    "L'Inébranlable monte la garde à l'entrée de la ruche, par tous les temps. Les frelons ont appris à faire un détour.",
  valiant:
    "La Vaillante est la première à partir explorer les terres inconnues et la dernière à rentrer. Elle rapporte toujours un peu de sucre, comme pour se faire pardonner son retard.",
  heroic:
    "Les chansons de ruche parlent d'une Héroïque qui aurait repoussé seule un essaim de guêpes. Depuis, toutes portent fièrement leur carapace brune comme une armure.",

  // Frugales
  modest:
    "La Modeste vit dans les terres chaudes où rien ne pousse longtemps. Elle se contente d'une fleur de cactus par jour et en tire un miel sec et parfumé.",
  frugal:
    "La Frugale ne gaspille rien : pas une goutte de nectar, pas un brin de cire. Elle vit longtemps, comme si l'économie était une affaire de patience.",
  austere:
    "L'Austère a fait vœu de simplicité. Ses rayons poudreux sentent la pierre chaude, et l'on y trouve parfois un peu de poudre noire, sans que personne sache d'où elle vient.",

  // Infernales
  sinister:
    "La Sinistre est apparue le jour où une Modeste s'est aventurée trop près d'une fissure brûlante. Elle en est revenue changée, les yeux rougeoyants.",
  fiendish:
    "La Diabolique adore la chaleur des forges et le crépitement des braises. Ses rayons frémissent encore plusieurs jours après la récolte.",
  demonic:
    "On n'approche une Démoniaque qu'avec des gants épais. Elle luit doucement dans le noir et laisse derrière elle une poussière lumineuse qui ne s'éteint pas.",

  // Tropicales
  tropical:
    "La Tropicale vit dans la moiteur des grandes forêts, au milieu des orchidées. Ses rayons ont la douceur d'un tissu de soie.",
  exotic:
    "L'Exotique est arrivée un jour sur un navire marchand, cachée dans une caisse de fruits. Elle ne s'est jamais réhabituée au froid.",
  edenic:
    "Les vieux apiculteurs parlent d'un jardin perdu où toutes les fleurs s'ouvraient à la fois. L'Édénique en serait la dernière gardienne.",

  // Glaciales
  wintry:
    "L'Hivernale sort quand toutes les autres abeilles dorment. Sa fourrure épaisse garde la chaleur, et elle butine les fleurs de givre au petit matin.",
  icy:
    "La Givrée laisse sur son passage une fine pellicule de glace. Ses rayons renferment parfois un éclat si froid qu'il brûle les doigts.",
  glacial:
    "La Polaire vit au bord des banquises, là où le soleil ne se couche pas en été. Elle construit ses alvéoles dans la glace même.",

  // Marécageuses
  marshy:
    "La Des marais vole au ras de l'eau, entre les roseaux et les nénuphars. Elle ne craint ni la boue ni la pluie, et son miel a un goût de mousse.",
  miry:
    "La Fangeuse plonge ses pattes dans la vase pour y trouver des fleurs que personne ne voit. Elle revient toujours crottée, et toujours chargée.",
  boggy:
    "La Tourbeuse vit dans les tourbières millénaires. On dit que la mousse de ses rayons conserve tout ce qu'elle touche.",

  // Agricoles
  rural:
    "La Rurale suit les paysans aux champs dès le printemps. Elle connaît chaque haie, chaque chemin creux, et salue les vaches au passage.",
  farmerly:
    "La Fermière s'est installée dans la grange et ne l'a plus quittée. Elle butine le trèfle et le blé en fleur, et ses rayons sentent le pain chaud.",
  agrarian:
    "L'Agraire travaille au rythme des moissons. Quand les épis sont lourds, elle redouble d'efforts, comme si elle aussi devait rentrer la récolte avant l'orage.",

  // Monastiques
  monastic:
    "La Monastique vit en silence dans les ruches des vieux cloîtres. Les moines disaient qu'elle bourdonne à l'heure exacte des prières.",
  secluded:
    "La Recluse s'est retirée au fond de la forêt pour méditer. Elle ne sort que rarement, mais chacune de ses sorties rapporte un miel d'une rare douceur.",
  hermitic:
    "L'Ermite a passé tant d'années seule qu'elle en a perdu l'habitude de la ruche. On trouve parfois du quartz dans ses rayons, comme des pensées cristallisées.",

  // Néant
  ended:
    "La Du Néant est sortie un jour d'une fissure dans le ciel nocturne. Elle n'a pas d'ombre, et ses ailes ne font aucun bruit.",
  spectral:
    "La Spectrale passe à travers les feuilles sans les toucher. Certains apiculteurs jurent l'avoir vue traverser les parois de la ruche.",
  phantasmal:
    "Personne n'a jamais vu une Fantasmagorique naître ni mourir. Ses rayons contiennent parfois une perle qui reflète un autre monde.",

  // Festives
  leporine:
    "La Léporine apparaît au printemps, cachée dans les herbes comme un lapin. Elle laisse dans les nids des œufs de cire colorée que les enfants cherchent pendant des heures.",
  merry:
    "La Joyeuse bourdonne des airs de fête sous la neige. Les jours de grand froid, sa ruche est la plus animée de tout le rucher.",
  tipsy:
    "La Pompette a goûté au nectar fermenté et y a pris goût. Elle vole en zigzag, chante faux, et rapporte un hydromel étonnamment bon.",
  tricky:
    "La Farceuse adore les tours : elle cache le sucre, échange les rayons, et rit sous cape quand l'apiculteur se gratte la tête.",

  // Vengeresses
  vindictive:
    "La Rancunière n'oublie jamais un affront. Une main qui a bousculé sa ruche sera piquée, même des années plus tard.",
  vengeful:
    "La Vengeresse s'est juré de protéger les ruches abandonnées. Ses rayons sombres sentent l'orage qui gronde.",
  avenging:
    "La Justicière ne frappe que les coupables, dit-on. Son dard luit faiblement dans le noir, et personne n'ose vérifier pourquoi.",

  // Stériles
  arid:
    "L'Aride a appris à vivre là où il ne pleut jamais. Elle boit la rosée sur les pierres et butine les rares fleurs qui percent le sable.",
  barren:
    "La Stérile parcourt les terres mortes à la recherche de la moindre trace de vie. Elle en rapporte un miel maigre, mais précieux.",
  desolate:
    "La Désolée vit au milieu des ruines et des champs brûlés. Elle bourdonne bas, comme si elle chantait pour ce qui a disparu.",

  // Macabres
  decaying:
    "La Putréfiée s'attarde là où les fruits pourrissent et où les feuilles se décomposent. Elle rend à la terre ce que la terre a donné.",
  skeletal:
    "On aperçoit les côtes blanches de la Squelettique à travers sa carapace. Elle rôde dans les vieux cimetières et rapporte des os polis comme de l'ivoire.",
  creepy:
    "La Rampante préfère marcher que voler. Elle se faufile dans les mines abandonnées et en ressort couverte de poudre noire.",

  // Minérales
  rock:
    "La Rocheuse vit dans les falaises et butine les lichens. Sa carapace grise se confond si bien avec la pierre qu'on lui marche dessus sans la voir.",
  stone:
    "La De pierre bâtit ses alvéoles avec un mortier de cire et de gravier. Sa ruche résiste à tout, même aux éboulements.",
  granite:
    "La De granit est lourde, lente et obstinée. Elle peut mettre une journée entière à traverser un champ, mais elle n'abandonne jamais.",
  mineral:
    "La Minérale entend chanter les veines de la roche. C'est elle qui a appris aux autres abeilles à chercher le métal dans la pierre.",

  // Métalliques
  copper:
    "La Cuivrée prend une teinte orangée au soleil couchant. Ses rayons ont un goût de pièce de monnaie, et l'on y trouve de fines paillettes de cuivre.",
  tin:
    "La Stannifère fait tinter ses ailes comme une clochette. Les mineurs disaient qu'elle annonçait les filons d'étain.",
  iron:
    "La Ferreuse a des pattes solides et une carapace qui rouille sous la pluie. Elle est fière de ses taches rousses.",
  lead:
    "La Plombée vole lourdement, à ras du sol. Elle passe des heures immobile, à écouter la terre.",
  nickel:
    "La Nickelée brille d'un éclat terne et froid. Elle est la plus discrète des abeilles de métal, et la plus difficile à trouver.",

  // Précieuses
  silver:
    "L'Argentée scintille à la lumière de la lune. Les orfèvres d'autrefois la suivaient pendant des jours dans l'espoir de trouver sa ruche.",
  gold:
    "La Dorée est la fierté de tout apiculteur. Elle n'en rapporte que quelques grains, mais chaque grain est de l'or pur.",
  platinum:
    "La Platinée est si rare que bien des apiculteurs n'y croient pas. Son vol laisse derrière lui un reflet blanc, comme une étoile filante.",

  // Gemmes
  lapis:
    "La Lazuli a la couleur du ciel nocturne, pailleté d'or. Les peintres broyaient autrefois les pierres de ses rayons pour en faire du bleu.",
  emerald:
    "L'Émeraude vit au cœur des forêts profondes, là où la lumière devient verte. Ses yeux brillent comme deux gemmes.",
  ruby:
    "La Rubis bat des ailes si vite qu'elles rougeoient. On dit qu'une seule de ses pierres suffit à réchauffer une ruche en hiver.",
  sapphire:
    "La Saphir est née d'un croisement avec l'océan. Ses rayons ont la fraîcheur de l'eau profonde, et parfois une pierre bleue y dort.",
  diamond:
    "La Diamant est la plus dure des abeilles : rien ne raye sa carapace. Elle met une vie entière à faire naître une seule pierre.",

  // Nucléaires
  unstable:
    "L'Instable change de couleur selon son humeur et grésille quand on l'approche. Les compteurs s'affolent autour de sa ruche.",
  nuclear:
    "La Nucléaire luit d'un vert inquiétant. Elle ne semble pas en souffrir, mais l'herbe ne repousse jamais tout à fait autour de son rucher.",
  radioactive:
    "La Radioactive éclaire la nuit à elle seule. Ses rayons sont si chauds qu'il faut les laisser refroidir avant de les centrifuger.",

  // Aquatiques
  water:
    "L'Aquatique nage presque aussi bien qu'elle vole. Elle butine les fleurs de nénuphar en se laissant porter par le courant.",
  river:
    "La Fluviale suit le cours des rivières, de la source jusqu'à la mer. Elle rapporte de l'argile fine, ramassée sur les berges.",
  ocean:
    "L'Océanique vit au large, sur les îles où seuls les oiseaux se posent. Ses rayons ont le goût du sel et de l'écume.",
  ink:
    "L'Encrée a croisé le chemin d'une pieuvre et en a gardé l'encre. Les scribes la recherchaient pour ses pigments d'un noir profond.",

  // Gourmandes
  sweet:
    "La Sucrée ne butine que les fleurs les plus parfumées. Son miel est si doux qu'on en met une seule goutte dans le thé.",
  sugary:
    "La Mielleuse est toujours collante, toujours souriante. Elle rapporte de petits cristaux de sucre qu'elle cache dans les coins de la ruche.",
  ripening:
    "La Mûrissante attend que les fruits soient à point pour les butiner. Elle sait, mieux que personne, quand une pêche est prête.",
  fruity:
    "La Fruitée sent la fraise et la framboise. Les vergers où elle passe donnent les fruits les plus juteux de la région.",

  // Fermières
  alcohol:
    "La Fermentée a découvert qu'un miel oublié au soleil devient hydromel. Depuis, elle en prépare dans des alvéoles secrètes.",
  milk:
    "La Laitière tourne autour des vaches au pré. Personne ne comprend comment, mais ses rayons donnent un lait doux et crémeux.",
  coffee:
    "La Caféière vit dans les plantations des collines chaudes. Elle ne tient pas en place et réveille toute la ruche dès l'aube.",

  // Volcaniques
  basalt:
    "La Basaltique est née dans les coulées de lave refroidies. Sa carapace noire et granuleuse ne craint aucune chaleur.",
  tempered:
    "La Trempée a été forgée par le feu, dit-on, comme une lame. Elle rapporte du charbon des flancs du volcan.",
  volcanic:
    "La Volcanique danse au-dessus des cratères en éruption. Ses rayons brillent d'une lueur qui ne s'éteint jamais tout à fait.",

  // Venimeuses
  malicious:
    "La Malveillante cache son dard sous un air innocent. Les autres abeilles évitent de la contrarier.",
  infectious:
    "L'Infectieuse laisse sur les fleurs une trace pourpre. Les plantes qu'elle touche se défendent mieux contre les parasites, étrangement.",
  virulent:
    "La Virulente porte le venin le plus puissant de toutes les abeilles. Les guérisseurs le recueillent goutte à goutte pour en faire des remèdes.",

  // Gluantes
  viscous:
    "La Visqueuse laisse partout derrière elle une traînée brillante. Ses rayons collent aux doigts pendant des heures.",
  glutinous:
    "La Glutineuse colle tout ce qu'elle touche, y compris ses sœurs. La ruche n'a jamais eu besoin de propolis.",
  sticky:
    "La Collante produit un mucus si résistant que les artisans s'en servent comme de la colle. Elle-même ne s'y prend jamais les pattes.",

  // Caustiques
  corrosive:
    "La Corrosive ronge la cire de ses propres alvéoles et doit les reconstruire sans cesse. Ses rayons sentent le citron brûlé.",
  caustic:
    "La Caustique a quitté les forêts humides pour les terres brûlantes. Là où elle se pose, la pierre fume.",
  acidic:
    "L'Acide est la plus corrosive de sa lignée. Il faut des centrifugeuses spéciales pour traiter ses rayons sans les percer.",

  // Énergiques
  excited:
    "L'Excitée ne tient pas en place : elle vole, revient, repart, et fait vibrer l'air autour d'elle.",
  energetic:
    "L'Énergique crépite d'électricité statique. Ses sœurs ont les poils qui se dressent quand elle passe.",
  ecstatic:
    "L'Extatique vit si vite qu'elle semble partout à la fois. Elle rapporte de petits éclats d'énergie qui illuminent la ruche.",

  // Ténébreuses
  shadowed:
    "L'Ombrée vit dans l'ombre des grands rochers. Elle fuit le soleil de midi et ne sort qu'à l'heure où les ombres s'allongent.",
  darkened:
    "L'Assombrie a les ailes teintées de suie. On ne la voit qu'à ses yeux, deux points pâles dans la pénombre.",
  abyssal:
    "L'Abyssale vient des grottes les plus profondes, là où la lumière n'est jamais arrivée. Elle trouve son chemin au toucher.",

  // Fossiles
  ancient:
    "L'Ancienne a vu naître les premières fleurs. Ses ailes portent des nervures que plus aucune abeille ne possède aujourd'hui.",
  primeval:
    "La Primitive semble sortie d'un livre d'histoire naturelle. Elle bourdonne plus grave que les autres, comme un écho venu du fond des âges.",
  prehistoric:
    "La Préhistorique est restée figée dans l'ambre pendant des millénaires, raconte la légende, avant de se réveiller un printemps.",
  relic:
    "La Relique est la gardienne de la mémoire des abeilles. Ses rayons renferment parfois une goutte d'ambre où dort un insecte disparu.",

  // Pétrolières
  oily:
    "L'Huileuse butine des fleurs noires et luisantes qui poussent près des sources de bitume. Elle sent la terre et le goudron.",
  distilled:
    "La Distillée a appris à raffiner ce que rapporte l'Huileuse. Ses rayons donnent un carburant clair qui fait tourner les machines.",

  // Arcaniques
  mystical:
    "La Mystique trace dans l'air des figures que personne ne sait lire. Les sorciers la gardaient près d'eux pour qu'elle porte chance à leurs sortilèges.",
  sorcerous:
    "L'Ensorceleuse vit dans les déserts où les mirages dansent. On dit qu'elle en crée elle-même pour égarer ses ennemis.",
  eldritch:
    "L'Occulte bourdonne des syllabes étranges, à la limite de l'audible. Les livres qui en parlent sont tous écrits à l'encre violette.",
  esoteric:
    "L'Ésotérique ne révèle ses secrets qu'à ceux qui savent attendre. Ses rayons changent de couleur selon les phases de la lune.",
  arcane:
    "L'Arcanique concentre dans son miel une magie pure. Une seule goutte de son essence suffit à faire briller un grimoire entier.",

  // Enchantées
  charmed:
    "La Charmée a reçu la bénédiction d'une fée des bois, dit-on. Les fleurs s'ouvrent quand elle approche.",
  enchanted:
    "L'Enchantée laisse dans son sillage une poussière scintillante. Les enfants qui la suivent finissent toujours par trouver un trésor.",
  supernatural:
    "La Surnaturelle vit entre deux mondes. Ses rayons sentent la forêt après la pluie, et la mousse y pousse en une nuit.",

  // Nocturnes
  noctule:
    "La Noctambule butine les fleurs qui s'ouvrent la nuit. Ses grands yeux voient dans le noir comme en plein jour.",
  lunar:
    "La Lunaire danse sous la pleine lune. Ses rayons renferment parfois une pierre pâle qui brille comme un clair de lune.",
  astral:
    "L'Astrale vole si haut la nuit qu'elle frôle les étoiles. Elle en rapporte une poussière dorée qui scintille dans les alvéoles.",
  stellar:
    "La Stellaire est un fragment de ciel tombé dans la ruche. Elle dessine des constellations en vol, et les astronomes les recopient.",

  // Solaires
  solar:
    "La Solaire se nourrit de la lumière autant que du nectar. Elle s'endort au coucher du soleil et se réveille avec lui.",
  radiant:
    "La Radieuse brille tant que les autres abeilles plissent les yeux. Elle rapporte une pierre chaude qui garde la chaleur du jour.",
  zenith:
    "La Zénithale n'est jamais aussi vive qu'à midi, quand le soleil est au plus haut. Elle ne projette alors aucune ombre.",

  // Célestes
  eclipse:
    "L'Éclipse est née le jour où le soleil et la lune se sont croisés. Elle porte en elle le jour et la nuit, et ses rayons mêlent les deux lumières.",

  // Aurorales
  dawn:
    "L'Aurorale sort au premier rayon du jour, quand le ciel est encore rose. Elle butine les fleurs encore fermées et les réveille doucement.",
  dewy:
    "La Rosée recueille les gouttes qui perlent sur les pétales au petit matin. Ses rayons sont si frais qu'ils embuent les vitres.",
  vesper:
    "La Vespérale ne sort qu'à la tombée du jour. Elle chante le coucher du soleil d'un bourdonnement grave et mélancolique.",

  // Pluviales
  rainy:
    "La Pluviale adore les averses. Quand toutes les autres se réfugient dans la ruche, elle sort danser sous les gouttes.",
  misty:
    "La Brumeuse se cache dans le brouillard du matin. On l'entend souvent avant de la voir, comme un murmure dans la brume.",
  rainbow:
    "L'Irisée apparaît après la pluie, quand le soleil revient. Ses ailes décomposent la lumière, et ses rayons cachent parfois un prisme.",

  // Orageuses
  stormy:
    "L'Orageuse vole au-devant des nuages noirs. Elle se nourrit de l'électricité de l'air et rentre les poils hérissés.",
  thunder:
    "La Fulgurante suit les éclairs. Les rares apiculteurs qui l'ont vue disent qu'elle frappe aussi vite que la foudre.",

  // Neigeuses
  snowy:
    "La Neigeuse naît avec les premiers flocons. Chaque hiver, elle construit une ruche de neige qui fond au printemps.",
  crystalline:
    "La Cristalline façonne des alvéoles de glace aux facettes parfaites. Ses rayons contiennent des flocons qui ne fondent jamais.",
  blizzard:
    "Le Blizzard arrive avec la tempête et repart avec elle. Il travaille jour et nuit tant que la neige tombe.",
  aurora:
    "La Boréale vit sous les aurores du grand nord. Ses ailes ondulent de vert et de violet, comme le ciel des nuits polaires.",

  // Terroirs
  dune:
    "La Des dunes suit les vents de sable. Elle bâtit sa ruche à l'abri des dunes, et l'on trouve du quartz dans ses rayons.",
  canopy:
    "La De canopée ne descend jamais au sol. Elle vit tout en haut des grands arbres, là où les fruits mûrissent au soleil.",
  summit:
    "La Des cimes vit sur les sommets, au-dessus des nuages. Elle butine les fleurs alpines et rapporte une résine parfumée de pin.",
  permafrost:
    "La Pergélisol vit dans la terre gelée du grand nord. Elle a creusé jusqu'à de l'ambre vieux de mille hivers.",
  steppe:
    "La Des steppes parcourt les herbes infinies, portée par le vent. Elle connaît chaque fleur de la plaine.",

  // Florales
  blossom:
    "La Fleurie porte sur sa tête une petite fleur qu'elle change chaque matin. Elle connaît le nom de toutes les plantes du jardin.",
  resinous:
    "La Résineuse vit dans les forêts de conifères. Elle rapporte une résine dorée qui sent le sapin et la montagne.",
  syrupy:
    "La Sirupeuse attend le dégel pour recueillir la sève des érables. Ses rayons donnent un sirop sombre et parfumé.",
  citrus:
    "L'Agrumière vit dans les vergers d'orangers et de citronniers. Ses rayons sentent le zeste et le soleil.",
  orchard:
    "La Vergère passe de pommier en cerisier, de prunier en poirier. Les vergers où elle vit donnent deux fois plus de fruits.",
  sylvan:
    "La Sylvaine est l'esprit de la forêt. Elle soigne les arbres malades et rapporte un bois rare, au grain fin comme de la soie.",
  ebon:
    "L'Ébène vit dans les forêts sombres où poussent les arbres au bois noir. Elle ne sort que la nuit, invisible dans l'obscurité.",
  pollinator:
    "La Pollinisatrice ne s'arrête jamais. Elle porte le pollen de fleur en fleur, et les jardins refleurissent sur son passage.",
  papillon:
    "La Papillonne a les ailes d'un papillon et le cœur d'une abeille. Elle voltige plus qu'elle ne vole, et laisse des pétales derrière elle.",

  // Sociales
  gregarious:
    "La Grégaire ne supporte pas la solitude. Elle vit en colonies serrées et partage tout avec ses sœurs, jusqu'à la cire.",
  colonial:
    "La Coloniale bâtit des ruches immenses, reliées entre elles par des galeries. Une seule colonie peut couvrir une colline entière.",
  swarm:
    "L'Essaim n'est pas une abeille, mais mille. Quand il se déplace, le ciel s'assombrit et le bourdonnement couvre tous les autres bruits.",

  // Recluses
  solitary:
    "La Solitaire vit seule, dans un trou de mur ou une tige creuse. Elle ne fait confiance à personne, et sa lignée ne change jamais.",
  anchorite:
    "L'Anachorète s'est murée dans une alvéole pour méditer. Elle ne sort que la nuit, et laisse du quartz là où elle a médité.",

  // Mécaniques
  mechanical:
    "La Mécanique est née dans un atelier, entre une Industrieuse et une Cuivrée. Elle cliquette en vol, et ses ailes tournent comme des hélices.",
  clockwork:
    "L'Horlogère ne se trompe jamais d'une seconde. Elle sort à heure fixe, rentre à heure fixe, et rapporte de minuscules engrenages.",
  steam:
    "L'À vapeur laisse un petit nuage blanc derrière elle. Elle carbure au charbon et siffle quand elle est contente.",
  electric:
    "L'Électrique a un cœur de pile et des ailes de cuivre. Elle recharge ses batteries pendant les orages.",
  cyber:
    "La Cybernétique pense plus vite que toutes les autres. Elle communique avec ses sœurs par des signaux lumineux et rapporte des circuits gravés.",

  // Chaotiques
  erratic:
    "L'Erratique ne suit aucun plan. Elle change de direction à chaque battement d'ailes, et ses enfants ne lui ressemblent jamais.",
  mutant:
    "La Mutante n'a jamais deux fois la même couleur. Les apiculteurs l'adorent et la redoutent : avec elle, tout peut arriver.",
  chimera:
    "La Chimère a pris un peu de chaque abeille qu'elle a croisée. Elle a le dard d'une Virulente, les yeux d'une Mutante et l'humeur d'un orage.",

  // Harmonieuses
  ordered:
    "L'Ordonnée range chaque chose à sa place, et chaque place a sa chose. Sa lignée reste fidèle à elle-même pendant des générations.",
  immaculate:
    "L'Immaculée est d'un blanc parfait, sans une tache. On dit qu'elle n'a jamais muté, et qu'elle ne mutera jamais.",

  // Temporelles
  eternal:
    "L'Éternelle était déjà vieille quand les montagnes étaient jeunes. Elle ne semble jamais vieillir, et ses rayons gardent la trace du temps dans l'ambre.",
  ephemeral:
    "L'Éphémère ne vit qu'une journée, mais quelle journée ! Elle butine plus de fleurs en un jour que d'autres en une vie.",
  fecund:
    "La Féconde donne naissance à tant de petits que sa ruche déborde chaque printemps. Elle partage son pollen avec toutes les ruches voisines.",

  // Sauvages
  liana:
    "La Lianeuse vit accrochée aux lianes de la jungle profonde, où il pleut sans fin. Elle n'avait jamais vu une ruche avant qu'une équipe ne la ramène.",
  floe:
    "La Banquisienne dérive sur les plaques de glace de la banquise éternelle. Elle se nourrit de fleurs de givre et ne craint ni le vent ni la neige.",
  mirage:
    "On ne voit la Mirage qu'à travers les reflets du désert de verre. Les explorateurs qui la rapportent jurent parfois en avoir vu trois, pour une seule capturée.",
  igneous:
    "L'Ignée niche dans les fissures de la caldeira, là où la roche brille encore. Elle traverse les flammes sans y laisser une aile.",
  benthic:
    "La Benthique vit dans les grottes noyées de la fosse abyssale. Elle ne connaît que le noir et le bruit des vagues, et luit faiblement pour retrouver ses sœurs.",
  noctiluca:
    "La Noctiluque danse au sommet des montagnes, au plus près des étoiles. Ses ailes laissent une traînée de lumière que les bergers prennent pour des comètes.",

  // Légendaires
  primordial:
    "La Primordiale existait avant toutes les autres abeilles. Les légendes disent que chaque espèce descend d'elle, et qu'elle en garde l'essence au fond de ses rayons.",
  celestial:
    "La Céleste est descendue des étoiles pour visiter le monde des fleurs. Elle brille de jour comme de nuit, et ne se pose que sur les plus hauts sommets.",
  imperatrix:
    "Apis Imperatrix est la reine de toutes les reines. Les apiculteurs qui l'ont vue n'en parlent qu'à voix basse. Sa gelée impériale serait la plus précieuse substance du monde.",
};
