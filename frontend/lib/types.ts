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
export type Item = { label: string; category: 'comb' | 'resource' | 'consumable' | 'module'; color: string; sell: number };
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

export type Content = {
  temps: string[];
  temp_labels: Record<string, string>;
  biomes: Record<string, { label: string; temp: string; color: string }>;
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
  /** uses : générations avant usure (absent = inusable) */
  modules: Record<string, { frame: boolean; desc: string; uses?: number }>;
  hive_types: Record<string, { label: string; slots: number; max_slots: number; frames_only: boolean; production: number }>;
  machines: Record<string, { label: string; desc: string }>;
  offers: Offer[];
  bee_sell: Record<string, number>;
  imprint_honey_per_gene: number;
  showcase_max_entries: number;
  garden: {
    chromosomes: Record<string, string>;
    alleles: Record<string, Record<string, Allele>>;
    trees: Record<string, Omit<Species, 'temp'>>;
    mutations: { a: string; b: string; result: string; chance: number }[];
    butterflies: Record<string, { label: string; color: string; secondary: string; chance: number; hosts: string[]; sell: number }>;
    sapling_sell: number;
  };
  world: {
    day_seconds: number;
    phases: Record<string, string>;
    weathers: Record<string, string>;
    activity_hours: Record<string, number[]>;
  };
  garden_enabled: boolean;
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
  };
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

export type Plot = {
  id: string;
  tree: { genome: Genome; mate: Genome; health: number; max_health: number } | null;
  status: 'empty' | 'growing' | 'mature';
};

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
  /** Température choisie si la ruche est sous serre */
  greenhouse: string | null;
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
  player: { id: string; username: string; honey: number; genetics_unlocked: boolean };
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
    jobs: { op: 'extract' | 'imprint' | 'replicate'; chromosome?: string; allele?: string; chain?: boolean; start_ms: number; ready_ms: number }[];
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
  discovered: string[];
  genes: Record<string, string[]>;
  offers: Record<string, { cost: Cost; lock: string | null }>;
  rescue_available: boolean;
  garden: {
    plots: Plot[];
    saplings: { id: string; genome: Genome; count: number }[];
    butterflies: { id: string; species: string; count: number }[];
    found_trees: string[];
    found_butterflies: string[];
  };
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

export type Showcase = {
  id: string;
  title: string;
  description: string;
  author: string;
  badges: PlayerBadges;
  mine: boolean;
  entries: { kind: string; type: string; genome: Genome }[];
  likes: number;
  liked: boolean;
  created_at: string | null;
};
