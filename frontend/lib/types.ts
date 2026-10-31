export type Genome = Record<string, [string, string]>;
export type BeeType = 'princess' | 'drone' | 'queen';
export type Cost = { honey: number; items: Record<string, number> };

export type Allele = { label: string; value: number; dominant: boolean };
export type Species = {
  label: string;
  branch: string;
  color: string;
  secondary: string;
  dominant: boolean;
  temp: string;
  products: [string, number][];
  template: Record<string, string>;
  /** Espèce sauvage : région d'expédition où on la trouve */
  wild?: string;
};
export type Item = { label: string; category: 'comb' | 'resource' | 'consumable' | 'module' | 'elixir'; color: string; sell: number };
export type Offer = {
  id: string;
  kind: 'bee' | 'hive' | 'item' | 'machine' | 'unlock' | 'sapling' | 'plot';
  species?: string;
  type?: BeeType;
  hive_type?: string;
  item?: string;
  machine?: string;
  min_species?: number;
};

/** Effets : multiplicateurs (récolte, mutation, variante, vie des reines), points d'expédition, usure arrêtée */
export type Elixir = {
  effects: Partial<Record<'harvest' | 'mutation' | 'variant' | 'lifespan' | 'expedition', number>> & { no_wear?: boolean };
  minutes: number;
  /** Minutes vécues d'un coup par les ruches (élixir à effet immédiat) */
  instant?: number;
  desc: string;
  cost: Cost;
};

/** chance : probabilité qu'une princesse née d'une reine ordinaire porte la variante */
export type Variant = { label: string; icon: string; chance: number; color: string; secondary: string; desc: string };

export type Content = {
  temps: string[];
  temp_labels: Record<string, string>;
  biomes: Record<string, { label: string; temp: string; color: string }>;
  /** Biomes qu'on ne trouve que sous serre ; stage : étape de la serre qui les ouvre */
  greenhouse_biomes: Record<string, { label: string; temp: string; color: string; stage: number; desc: string }>;
  /** Type de ruche obtenu en faisant évoluer chaque type */
  evolutions: Record<string, string>;
  chromosomes: Record<string, string>;
  alleles: Record<string, Record<string, Allele>>;
  species: Record<string, Species>;
  mutations: {
    a: string;
    b: string;
    result: string;
    chance: number;
    temp?: string | null;
    cond: Record<string, unknown>;
    cond_text: string;
  }[];
  items: Record<string, Item>;
  recipes: Record<string, [string, number, number][]>;
  manual_batch: number;
  /** Rayons par geste à la main, selon le niveau de la manivelle renforcée */
  manual_batches: number[];
  /** uses : générations avant usure (absent = inusable) */
  modules: Record<string, { frame: boolean; desc: string; uses?: number }>;
  hive_types: Record<string, { label: string; slots: number; max_slots: number; frames_only: boolean; production: number; automated?: boolean }>;
  machines: Record<string, { label: string; desc: string }>;
  offers: Offer[];
  bee_sell: Record<string, number>;
  showcase_max_entries: number;
  world: {
    day_seconds: number;
    phases: Record<string, string>;
    weathers: Record<string, string>;
    activity_hours: Record<string, number[]>;
  };
  achievements: Achievement[];
  lab: {
    levels: Record<string, { label: string; desc: string; cost: Cost; min_species: number; extract: string[]; imprint: boolean }>;
    extract_seconds: number;
    imprint_seconds: number;
    replicate_seconds: number;
    extract_fail: number;
    doses: number;
    fragments: Record<string, Record<string, number>>;
    rarity: Record<string, Record<string, 'common' | 'medium' | 'rare'>>;
    imprint: { costs: Record<'common' | 'medium' | 'rare' | 'species', Cost>; labware: number; species_combs: number };
  };
  trophies: {
    categories: Record<string, string>;
    list: Trophy[];
    pedigree: Record<string, { label: string; icon: string; desc: string }>;
  };
  orders: {
    guilds: Record<string, { label: string; icon: string; desc: string }>;
    levels: { need: number; label: string }[];
    lifetime_ms: number;
    refill_ms: number;
  };
  projects: {
    list: Record<string, Project>;
    greenhouse_temps: Record<string, string[]>;
    greenhouse_slots: Record<string, number>;
    /** Grand télescope : météos qu'on peut imposer, et leur prix */
    sky: { stage: number; minutes: number; weathers: Record<string, { items: Record<string, number> }> };
  };
  late: {
    museum: { collections: Record<string, Record<string, number>>; bonus: number; comb_need: number; jar: Record<string, number> };
    world_hive: { bonus: number };
    elixirs: Record<string, Elixir>;
  };
  /** Variantes rares : robe, pouvoir de reine, chance de naissance et d'héritage */
  variants: Record<string, Variant>;
  /** Une princesse variante se vend ce multiple du prix normal */
  variant_sell_mult: number;
  profiles: { stats: Record<string, { label: string; icon: string }>; bio_max: number; max_featured: number };
  expeditions: {
    regions: Record<string, Region>;
    team_max: number;
    slots: Record<string, number>;
    tiers: Record<string, number>;
    loss_chance: number;
  };
};

export type Region = {
  label: string;
  icon: string;
  desc: string;
  tier: number;
  temp: string;
  wet: boolean;
  dark: boolean;
  minutes: number;
  loot: [string, number, number][];
  rare: string[];
  gene: [string, string];
  wild: string;
};

export type ExpeditionReport = {
  id: string;
  region: string;
  end_ms: number;
  chance: number;
  bees: string[];
  success: boolean;
  loot: Record<string, number>;
  lost: number[];
  fragment: [string, string] | null;
  wild: string | null;
};

export type Project = {
  label: string;
  icon: string;
  desc: string;
  stages: { label: string; effect: string; cost: Cost }[];
};

export type Order = {
  id: string;
  guild: string;
  kind: 'goods' | 'bee' | 'pedigree';
  prestige: boolean;
  items?: Record<string, number>;
  bee?: { species: string; type: BeeType; alleles: Record<string, string> };
  pedigree?: { species: string; level: number };
  reward: Cost;
  rep: number;
  created_ms: number;
  expires_ms: number;
};

export type Metal = 'bronze' | 'silver' | 'gold' | 'diamond';
export type Trophy = {
  id: string;
  category: string;
  label: string;
  icon: string;
  desc: string;
  secret: boolean;
  tiers: { need: number; metal: Metal; reward: Cost }[];
};

export type Achievement = { id: string; label: string; desc: string; icon: string; secret: boolean; honey: number };

export type Bee = { id: string; type: BeeType; genome: Genome; count: number; hive_id: string | null };
export type Queen = { genome: Genome; mate: Genome; health: number; max_health: number; generation: number };
export type Hive = {
  id: string;
  name: string;
  hive_type: string;
  biome: string;
  slots: number;
  slot_cost: number | null;
  upgrade_cost: Cost | null;
  modules: string[];
  /** Générations restantes de chaque module monté (null = inusable) */
  wear: (number | null)[];
  /** Réglage de la serre : une température ou un biome de serre (null hors serre) */
  greenhouse: string | null;
  /** Robo-ruche : cadres à garder montés (null pour les autres ruches) */
  loadout: string[] | null;
  /** Mutations possibles en ce moment (Observatoire, étape 2) ; null si non disponible */
  mutations_now: { result: string; chance: number }[] | null;
  queen: Queen | null;
  output: Record<string, number>;
  keep_drones: boolean;
  reuse_drone: boolean;
  /** Réserve du faux-bourdon installé ; genome est nul quand la réserve est épuisée */
  line_drone: { genome: Genome | null; count: number } | null;
  mods: { production: number; lifespan: number; mutation: number; automation: boolean; light: boolean; shelter: boolean; temp: string };
  status: 'empty' | 'working' | 'climate' | 'resting' | 'weather';
};

export type GameState = {
  player: { id: string; username: string; honey: number };
  server_time: number;
  cycle_seconds: number;
  world: { hour: number; minute: number; phase: string; weather: Record<string, string>; next_weather_ms: number };
  /** Valeur actuelle de la mesure et nombre de paliers déjà réclamés */
  trophies: Record<string, { progress: number; claimed: number }>;
  /** Meilleur niveau de pedigree certifié par espèce (1 Pure à 4 Champion) */
  pedigree: Record<string, number>;
  projects: Record<string, { stage: number; given: Record<string, number> }>;
  /** Météo des prochaines périodes par biome (Observatoire construit) */
  forecast: { in_ms: number; weather: Record<string, string> }[] | null;
  /** Météos imposées par le Grand télescope, par biome */
  sky: Record<string, { weather: string; from: number; until: number }>;
  /** Rayons traités par geste à la main */
  manual_batch: number;
  expeditions: {
    stage: number;
    teams: { id: string; region: string; bees: { type: BeeType; genome: Genome }[]; scores: number[]; chance: number; start_ms: number; end_ms: number }[];
    log: ExpeditionReport[];
  };
  orders: {
    slots: { order: Order | null; ready_ms: number }[];
    prestige: { week: string; done: boolean; order: Order | null } | null;
    reputation: number;
    level: number;
  };
  badges: PlayerBadges;
  achievements: Record<string, number>;
  stats: Record<string, number>;
  lab: {
    level: number;
    /** Une opération par paillasse occupée ; chain = extraction en chaîne */
    jobs: {
      id: string;
      op: 'extract' | 'imprint' | 'replicate';
      chromosome?: string;
      allele?: string;
      chain?: boolean;
      /** Abeille reprise par la chaîne ; absente sur les extractions d'avant l'interrupteur */
      bee_hash?: string;
      start_ms: number;
      ready_ms: number;
    }[];
    benches: number;
    chain: boolean;
    fragments: Record<string, number>;
    log: string[];
  };
  gene_bank: Record<string, Record<string, number>>;
  inventory: Record<string, number>;
  /** Exemplaires démontés entamés : générations restantes */
  worn_modules: Record<string, number[]>;
  bees: Bee[];
  hives: Hive[];
  machines: Record<string, number>;
  /** Centrifugeuses automatiques : en marche ou non, et rayons qu'elles laissent de côté */
  factory: { on: boolean; skip: string[] };
  /** Musée du miel : ce qui a été donné à chaque collection (et au Bocal commun, clé « _jar »), les branches complètes */
  museum: { given: Record<string, Record<string, number>>; complete: string[]; jar_full: boolean };
  /** Ruche-monde : niveaux achevés, panier en cours et multiplicateur de production obtenu */
  world_hive: { level: number; request: Cost; given: Record<string, number>; multiplier: number };
  /** Élixirs en cours : fin de chaque effet (ms) */
  effects: Record<string, number>;
  discovered: string[];
  genes: Record<string, string[]>;
  offers: Record<string, { cost: Cost; lock: string | null }>;
  rescue_available: boolean;
};

export type Badge = {
  id: string;
  kind: 'achievement' | 'branch';
  label: string;
  desc: string;
  icon?: string;
  metal?: 'bronze' | 'silver' | 'gold' | 'diamond';
  color?: string;
  secondary?: string;
};
export type PlayerBadges = {
  rank: { id: string; label: string; need: number } | null;
  next_rank: { label: string; need: number } | null;
  species: number;
  badges: Badge[];
};

/** Profil d'apiculteur : réglages choisis par le joueur, statistiques calculées à la lecture */
export type ProfileSettings = {
  bio: string;
  biome: string;
  phase: string;
  favorite: { type: string; genome: Genome } | null;
  featured: string[];
};
export type Profile = {
  id: string;
  name: string;
  since: string | null;
  badges: PlayerBadges;
  settings: ProfileSettings;
  stats: Record<string, number>;
  mine: boolean;
  showcases: Showcase[];
};
export type ProfileSummary = {
  id: string;
  name: string;
  badges: PlayerBadges;
  favorite: ProfileSettings['favorite'];
  biome: string;
  mine: boolean;
};

export type Showcase = {
  id: string;
  title: string;
  description: string;
  author: string;
  author_id: string;
  badges: PlayerBadges;
  mine: boolean;
  entries: { type: string; genome: Genome }[];
  likes: number;
  liked: boolean;
  created_at: string | null;
};
