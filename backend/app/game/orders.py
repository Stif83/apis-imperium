"""Comptoir : commandes des guildes et réputation.

Le tableau compte 3 commandes ouvertes (4 puis 5 avec la réputation) et, à partir du premier niveau
de réputation, une commande de prestige par semaine. Les clients arrivent un par un : une place libre
se remplit REFILL_DELAY après l'arrivée du client précédent, quelle que soit la place libérée. Une commande demande des ressources, une abeille
aux gènes imposés (elle est livrée, donc consommée) ou un pedigree minimum (simple vérification).

Tout est tiré de ce que le joueur peut déjà produire : les ressources viennent de ses espèces découvertes,
les gènes imposés de ceux qu'il possède déjà quelque part. Le tirage est reproductible (graine = joueur
et numéro de commande). Règle de compatibilité : les identifiants de guilde sont stockés dans les sauvegardes.
"""

import datetime
import random

from . import content as C

HOUR = 3600 * 1000
ORDER_LIFETIME = 8 * HOUR
REFILL_DELAY = 20 * 60 * 1000
BASE_SLOTS = 3

# Réputation : (points requis, titre)
LEVELS = [
    (0, "Inconnu"),
    (100, "Fournisseur"),
    (300, "Fournisseur apprécié"),
    (700, "Fournisseur réputé"),
    (1500, "Maison de confiance"),
    (3000, "Fournisseur impérial"),
]

GUILDS = {
    "herbalists": {
        "label": "Herboristerie du Val", "icon": "🌿",
        "desc": "Les herboristes préparent onguents et tisanes ; ils aiment ce qui pousse et ce qui soigne.",
        "items": ["pollen", "honeydew", "propolis", "petal", "resin", "maple_syrup", "lemon", "dew", "wax", "comb_floral", "comb_sweet"],
        "genes": ["speed", "fertility", "activity"],
    },
    "forge": {
        "label": "Forge des Trois Enclumes", "icon": "⚒️",
        "desc": "Les forgerons fondent tout ce qui brille et réclament de quoi entretenir le feu.",
        "items": ["copper", "tin", "iron", "lead", "nickel", "silver", "gold", "coal", "clay", "refractory_wax", "phosphor", "comb_rocky"],
        "genes": ["lifespan", "tolerance"],
    },
    "monastery": {
        "label": "Monastère de Saint-Ambroise", "icon": "🕯️",
        "desc": "Les moines coulent des cierges, brassent l'hydromel et prisent les lignées paisibles.",
        "items": ["wax", "honeydew", "quartz", "royal_jelly", "mead", "sugar", "propolis", "comb_mellow"],
        "genes": ["stability", "lifespan", "activity"],
    },
    "court": {
        "label": "Cour impériale", "icon": "👑",
        "desc": "La cour ne veut que le meilleur : gelée royale, pierres précieuses et abeilles d'exception.",
        "items": ["royal_jelly", "gold", "silver", "emerald", "ruby", "sapphire", "lapis", "silk", "dye", "stardust", "sunstone", "moonstone", "comb_dripping"],
        "genes": ["speed", "lifespan", "fertility"],
    },
    "explorers": {
        "label": "Guilde des Explorateurs", "icon": "🧭",
        "desc": "Les explorateurs partent au bout du monde et veulent des abeilles qui tiennent le coup.",
        "items": ["ice_shard", "snowflake", "amber", "fuel", "oil", "energy", "glowstone", "slime", "venom", "acid", "coffee", "comb_frozen", "comb_parched"],
        "genes": ["tolerance", "weatherproof", "activity"],
    },
}

# Valeurs recherchées par les clients, de la plus accessible à la plus rare
WANTED = {
    "speed": ["fast", "faster", "fastest"],
    "lifespan": ["elongated", "long", "longer", "longest"],
    "fertility": ["3", "4"],
    "tolerance": ["one", "two"],
    "activity": ["crepuscular", "nocturnal", "cathemeral"],
    "weatherproof": ["yes"],
    "stability": ["stable", "ordered", "pure"],
}

def _better(chromosome: str, allele: str, base: str) -> bool:
    """Une valeur recherchée améliore-t-elle celle de l'espèce ? (stabilité : plus basse est meilleure)"""
    if chromosome in ("activity", "weatherproof"):
        return allele != base
    values = C.ALLELES[chromosome]
    if chromosome == "stability":
        return values[allele]["value"] < values[base]["value"]
    return values[allele]["value"] > values[base]["value"]


# Valeur d'un rayon (il ne se vend pas) pour doser les quantités demandées
COMB_VALUE = 6


def level_of(points: int) -> int:
    return max(i for i, (need, _) in enumerate(LEVELS) if points >= need)


def slots_for(level: int) -> int:
    return BASE_SLOTS + (level >= 2) + (level >= 4)


def schedule(slots: list[dict], next_ms: int | None) -> None:
    """Heure d'arrivée affichée sur chaque place libre : les clients se suivent à REFILL_DELAY d'intervalle."""
    k = 0
    for slot in slots:
        if slot.get("order"):
            slot.pop("ready_ms", None)
        else:
            slot["ready_ms"] = (next_ms or 0) + k * REFILL_DELAY
            k += 1


def item_value(item: str) -> int:
    spec = C.ITEMS.get(item, {})
    return COMB_VALUE if spec.get("category") == "comb" else max(1, spec.get("sell", 1))


def producible(discovered: set[str]) -> set[str]:
    """Objets que les espèces découvertes peuvent fournir : leurs produits, et ce qu'en tire la centrifugeuse."""
    out: set[str] = set()
    for sid in discovered:
        for item, _ in C.SPECIES.get(sid, {}).get("products", []):
            out.add(item)
            for res, _, _ in C.RECIPES.get(item, []):
                if res != "honey":
                    out.add(res)
    return out


def _utc(t_ms: int) -> datetime.datetime:
    return datetime.datetime.fromtimestamp(t_ms / 1000, tz=datetime.timezone.utc)


def week_key(t_ms: int) -> str:
    year, week, _ = _utc(t_ms).isocalendar()
    return f"{year}-W{week:02d}"


def week_end(t_ms: int) -> int:
    """Fin de la semaine ISO en cours : lundi suivant, minuit UTC."""
    d = _utc(t_ms)
    monday = (d - datetime.timedelta(days=d.weekday())).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((monday + datetime.timedelta(days=7)).timestamp() * 1000)


def _goods(rng: random.Random, guild: dict, pool: set[str], budget: float, count: int) -> dict[str, int]:
    preferred = [i for i in guild["items"] if i in pool]
    choices = preferred or sorted(pool)
    picked = rng.sample(choices, min(count, len(choices)))
    return {item: max(1, min(500, round(budget / count / item_value(item)))) for item in picked}


def generate(rng: random.Random, ctx: dict, t_ms: int, prestige: bool = False) -> dict | None:
    """Tire une commande. ctx : discovered, alleles (chromosome -> allèles possédés), pedigree, level."""
    level = ctx["level"]
    pool = producible(ctx["discovered"])
    if not pool:
        return None
    guild_id = rng.choice(list(GUILDS))
    guild = GUILDS[guild_id]
    budget = 120 * 1.6 ** level * (4 if prestige else 1)
    kind = "goods" if prestige else rng.choice(["goods", "goods", "bee", "pedigree"])
    want = 2 if level < 3 else 3
    candidates = sorted(s for s in ctx["discovered"] if ctx["pedigree"].get(s, 0) < want)
    if kind == "pedigree" and not candidates:
        kind = "goods"
    order: dict = {"guild": guild_id, "kind": kind, "created_ms": t_ms, "prestige": prestige}

    if kind == "goods" or prestige:
        count = 3 if prestige else (2 if level >= 2 and rng.random() < 0.5 else 1)
        order["items"] = _goods(rng, guild, pool, budget, count)
        value = sum(item_value(i) * n for i, n in order["items"].items())
        honey = round(value * 1.8 + 50)
        rep = 15 + 5 * (count - 1)

    if kind == "bee" or prestige:
        # Au début, plutôt une espèce que le joueur a déjà en réserve
        reserve = sorted(ctx.get("reserve", set()) & ctx["discovered"])
        pool_species = reserve if reserve and level < 2 and rng.random() < 0.7 else sorted(ctx["discovered"])
        species = rng.choice(pool_species)
        template = C.SPECIES[species]["template"]
        n_genes = 3 if prestige else (1 if level < 2 else rng.choice([1, 2]))
        alleles = {}
        for c in rng.sample(guild["genes"], min(n_genes, len(guild["genes"]))):
            # Une valeur recherchée, meilleure que celle de l'espèce : d'abord parmi celles que le joueur
            # possède déjà (abeille ou banque), sinon la plus accessible, mais seulement à haut niveau
            better = [a for a in WANTED[c] if _better(c, a, template[c])]
            owned = [a for a in better if a in ctx["alleles"].get(c, set())]
            if owned:
                alleles[c] = rng.choice(owned)
            elif better and (level >= 3 or prestige):
                alleles[c] = better[0]
        # Au niveau 0, seulement des faux-bourdons : un débutant ne doit pas livrer sa seule princesse
        kind_of_bee = rng.choice(["princess", "drone"]) if level >= 1 or prestige else "drone"
        order["bee"] = {"species": species, "type": kind_of_bee, "alleles": alleles}
        bee_honey = round(250 * (1 + 0.5 * level) * (1 + sum(a != template[c] for c, a in alleles.items())))
        honey = (honey + bee_honey) if prestige else bee_honey
        rep = (rep + 25) if prestige else 25

    if kind == "pedigree":
        order["pedigree"] = {"species": rng.choice(candidates), "level": want}
        honey = 400 * want * (1 + level // 2)
        rep = 30

    if prestige:
        honey = round(honey * 1.5 + 2000 * (1 + level))
        rep = 150
        bonus = {"imperial_jelly": 1} if level >= 4 else {"royal_jelly": 5 + 2 * level}
    else:
        bonus = {}
        if rng.random() < 0.25 + 0.05 * level:
            bonus = rng.choice([{"labware": 5}, {"royal_jelly": 2}, {"propolis": 10}, {"frame_impregnated": 1}][: 2 + level // 2])
    order["reward"] = {"honey": honey, "items": bonus}
    order["rep"] = rep
    return order


def public_orders() -> dict:
    return {
        "guilds": {gid: {k: g[k] for k in ("label", "icon", "desc")} for gid, g in GUILDS.items()},
        "levels": [{"need": need, "label": label} for need, label in LEVELS],
        "lifetime_ms": ORDER_LIFETIME,
        "refill_ms": REFILL_DELAY,
    }
