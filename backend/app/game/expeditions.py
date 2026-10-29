"""Expéditions : des équipes d'abeilles partent explorer des régions hostiles depuis le Poste d'expédition.

Chaque abeille est notée sur 100 selon la région : climat toléré (40), pluie (20), obscurité (20),
endurance (20, selon la longévité). La chance de l'équipe combine les notes : 1 − Π(1 − 0,8 × note).
Au retour : butin, parfois un fragment de gène rare, parfois une espèce sauvage (une par région, qu'on
ne trouve nulle part ailleurs). En cas d'échec, chaque abeille a une chance d'être perdue ; sinon elles
reviennent toutes. Règle de compatibilité : les identifiants de région sont stockés dans les sauvegardes.
"""

import random

from . import genetics as G

MINUTE = 60 * 1000

REGIONS = {
    "jungle": {
        "label": "Jungle profonde", "icon": "🌴", "tier": 1, "temp": "warm", "wet": True, "dark": False, "minutes": 30,
        "desc": "Une forêt si dense que la pluie n'en finit jamais de tomber des feuilles.",
        "loot": [("fruit", 4, 10), ("silk", 3, 8), ("coffee", 2, 5), ("slime", 2, 5)],
        "rare": [("emerald", 0.10)], "gene": ("weatherproof", "yes"), "wild": "liana",
    },
    "glacier": {
        "label": "Banquise éternelle", "icon": "🧊", "tier": 1, "temp": "icy", "wet": True, "dark": False, "minutes": 45,
        "desc": "Des plaines de glace balayées de neige, où seules les plus robustes tiennent.",
        "loot": [("ice_shard", 5, 12), ("snowflake", 1, 3), ("quartz", 2, 5)],
        "rare": [("amber", 0.08)], "gene": ("tolerance", "one"), "wild": "floe",
    },
    "glass_desert": {
        "label": "Désert de verre", "icon": "🏜️", "tier": 1, "temp": "hot", "wet": False, "dark": False, "minutes": 60,
        "desc": "Le sable y a fondu en dalles de verre qui renvoient la lumière dans tous les sens.",
        "loot": [("quartz", 5, 12), ("glowstone", 2, 5), ("dye", 2, 4)],
        "rare": [("prism", 0.06)], "gene": ("tolerance", "two"), "wild": "mirage",
    },
    "volcano": {
        "label": "Caldeira", "icon": "🌋", "tier": 2, "temp": "hellish", "wet": False, "dark": False, "minutes": 90,
        "desc": "Le cratère d'un volcan endormi, où la roche brille encore de chaleur.",
        "loot": [("phosphor", 5, 10), ("coal", 5, 10), ("refractory_wax", 3, 6), ("gunpowder", 2, 5)],
        "rare": [("ruby", 0.08), ("sunstone", 0.05)], "gene": ("lifespan", "longer"), "wild": "igneous",
    },
    "abyss": {
        "label": "Fosse abyssale", "icon": "🌊", "tier": 2, "temp": "cold", "wet": True, "dark": True, "minutes": 120,
        "desc": "Des grottes noyées sous la falaise, que seule la marée basse découvre.",
        "loot": [("clay", 5, 10), ("dye", 3, 6), ("oil", 3, 6), ("venom", 1, 3)],
        "rare": [("sapphire", 0.08), ("ender_pearl", 0.06)], "gene": ("activity", "nocturnal"), "wild": "benthic",
    },
    "night_sky": {
        "label": "Ciel nocturne", "icon": "🌌", "tier": 2, "temp": "cold", "wet": False, "dark": True, "minutes": 120,
        "desc": "Au sommet des plus hautes montagnes, là où les étoiles semblent à portée d'aile.",
        "loot": [("stardust", 1, 3), ("energy", 2, 4), ("moonstone", 0, 1)],
        "rare": [("lightning_shard", 0.10)], "gene": ("activity", "cathemeral"), "wild": "noctiluca",
    },
    # Bout du monde : ouvert par le Grand poste
    "sky_isles": {
        "label": "Îles célestes", "icon": "☁️", "tier": 3, "temp": "cold", "wet": True, "dark": False, "minutes": 240,
        "desc": "Des rochers qui flottent au-dessus des nuages, battus par des orages permanents.",
        "loot": [("lightning_shard", 1, 3), ("stardust", 2, 5), ("energy", 4, 8), ("snowflake", 2, 5)],
        "rare": [("diamond", 0.12), ("prism", 0.08)], "gene": ("speed", "fastest"), "wild": "zephyr",
    },
    "world_core": {
        "label": "Cœur du monde", "icon": "⛏️", "tier": 3, "temp": "hellish", "wet": False, "dark": True, "minutes": 300,
        "desc": "Au fond des plus profondes galeries, là où la roche fond et où brillent des métaux inconnus.",
        "loot": [("uranium", 1, 3), ("platinum", 1, 3), ("refractory_wax", 5, 10), ("diamond", 0, 1)],
        "rare": [("primordial_essence", 0.05), ("ruby", 0.15)], "gene": ("lifespan", "longest"), "wild": "magma",
    },
    "sunken_ruins": {
        "label": "Cité engloutie", "icon": "🏛️", "tier": 3, "temp": "normal", "wet": True, "dark": True, "minutes": 360,
        "desc": "Les ruines d'un ancien empire apicole, sous la mer, où dorment encore des ruches de pierre.",
        "loot": [("amber", 2, 5), ("ender_pearl", 1, 3), ("lapis", 4, 8), ("gold", 3, 6)],
        "rare": [("imperial_jelly", 0.05), ("emerald", 0.12)], "gene": ("fertility", "4"), "wild": "atlantean",
    },
}

TEAM_MAX = 3
LOSS_CHANCE = 0.25
FRAGMENT_CHANCE = 0.30
WILD_CHANCE = {1: 0.12, 2: 0.12, 3: 0.20}
LOOT_BONUS = 1.5  # à la dernière étape du poste
# Équipes simultanées et régions accessibles selon l'étape du Poste d'expédition
SLOTS = {1: 1, 2: 2, 3: 3}
TIERS = {1: 1, 2: 2, 3: 3}
LOG_SIZE = 8


def bee_score(genome: dict, region: dict) -> dict:
    """Note d'une abeille pour une région, détaillée (climat, pluie, obscurité, endurance) et totale."""
    parts = {
        "climate": 40 if G.climate_ok(genome, region["temp"]) else 0,
        "weather": 20 if not region["wet"] or genome["weatherproof"][0] == "yes" else 0,
        "dark": 20 if not region["dark"] or genome["activity"][0] in ("nocturnal", "cathemeral") else 0,
        "endurance": round(20 * min(1.0, G.value(genome, "lifespan") / 40)),
    }
    return {**parts, "total": sum(parts.values())}


def team_chance(scores: list[int]) -> float:
    failure = 1.0
    for s in scores:
        failure *= 1 - 0.8 * s / 100
    return round(min(0.95, 1 - failure), 3)


def resolve(team: dict, rng: random.Random, stage: int) -> dict:
    """Issue d'une expédition terminée : réussite, butin, fragment, espèce sauvage, abeilles perdues."""
    region = REGIONS[team["region"]]
    success = rng.random() < team["chance"]
    loot: dict[str, int] = {}
    lost: list[int] = []
    fragment = None
    wild = None
    if success:
        bonus = LOOT_BONUS if stage >= 3 else 1
        for item, lo, hi in region["loot"]:
            n = round(rng.randint(lo, hi) * bonus)
            if n:
                loot[item] = n
        for item, chance in region["rare"]:
            if rng.random() < chance:
                loot[item] = loot.get(item, 0) + 1
        if rng.random() < FRAGMENT_CHANCE:
            fragment = list(region["gene"])
        if rng.random() < WILD_CHANCE[stage]:
            wild = region["wild"]
    else:
        # Une maigre consolation, et chaque abeille risque de ne pas revenir
        item, lo, hi = rng.choice(region["loot"])
        loot[item] = max(1, lo // 2)
        lost = [i for i in range(len(team["bees"])) if rng.random() < LOSS_CHANCE]
    return {"success": success, "loot": loot, "lost": lost, "fragment": fragment, "wild": wild}


def public_expeditions() -> dict:
    return {
        "regions": {rid: {k: v for k, v in r.items() if k not in ("rare",)} | {"rare": [i for i, _ in r["rare"]]}
                    for rid, r in REGIONS.items()},
        "team_max": TEAM_MAX,
        "slots": {str(k): v for k, v in SLOTS.items()},
        "tiers": {str(k): v for k, v in TIERS.items()},
        "loss_chance": LOSS_CHANCE,
    }
