"""Fin de partie : Musée du miel, Ruche-monde et Distillerie.

Les trois puisent dans les ressources de toutes les branches : le Musée récompense la diversité (une
collection par branche), la Ruche-monde absorbe les surplus (des niveaux sans fin) et la Distillerie les
transforme en élixirs aux effets temporaires.
"""

import math
import random

from . import content as C

# ---- Musée du miel ----------------------------------------------------------

# Une branche complète produit davantage
MUSEUM_BONUS = 1.10
# Quantité demandée pour un objet : les rayons en gros, les ressources selon leur prix de vente
MUSEUM_COMB_NEED = 10000
MUSEUM_VALUE_BUDGET = 60000
MUSEUM_MIN, MUSEUM_MAX = 100, 10000


def _need(item: str) -> int:
    if C.ITEMS[item]["category"] == "comb":
        return MUSEUM_COMB_NEED
    return max(MUSEUM_MIN, min(MUSEUM_MAX, round(MUSEUM_VALUE_BUDGET / max(1, C.ITEMS[item]["sell"]))))


def _collections() -> dict[str, dict[str, int]]:
    """Une collection par branche : tout ce que ses espèces produisent."""
    out: dict[str, dict[str, int]] = {}
    for spec in C.SPECIES.values():
        items = out.setdefault(spec["branch"], {})
        for item, _ in spec["products"]:
            items[item] = _need(item)
    return {branch: dict(sorted(items.items())) for branch, items in out.items()}


MUSEUM = _collections()


def museum_complete(museum: dict, branch: str) -> bool:
    given = museum.get(branch, {})
    return all(given.get(item, 0) >= need for item, need in MUSEUM[branch].items())


# Œuf de Pâques : une fois toutes les collections complètes, le Bocal commun attend un million de chaque
# rayon. Ses dons sont rangés dans le musée sous la clé JAR, à côté des branches.
JAR = "_jar"
JAR_NEED = 1_000_000
JAR_ITEMS = {item: JAR_NEED for item, spec in sorted(C.ITEMS.items()) if spec["category"] == "comb"}


def jar_full(museum: dict) -> bool:
    given = museum.get(JAR, {})
    return all(given.get(item, 0) >= need for item, need in JAR_ITEMS.items())


# ---- Ruche-monde ------------------------------------------------------------

# Chaque niveau achevé : +2 % de production dans toutes les ruches
WORLD_HIVE_BONUS = 0.02
WORLD_HONEY, WORLD_HONEY_SCALE = 25000, 1.3
WORLD_ITEM_BUDGET, WORLD_ITEM_SCALE = 600, 1.25
WORLD_MAX_ITEMS = 8


def world_request(level: int, discovered: set[str], rng: random.Random) -> dict:
    """Panier du niveau `level` : des produits de branches différentes, parmi les espèces découvertes."""
    by_branch: dict[str, set[str]] = {}
    for sid in discovered:
        spec = C.SPECIES.get(sid)
        if spec:
            by_branch.setdefault(spec["branch"], set()).update(item for item, _ in spec["products"])
    branches = sorted(by_branch)
    rng.shuffle(branches)
    budget = WORLD_ITEM_BUDGET * WORLD_ITEM_SCALE ** level
    items: dict[str, int] = {}
    for branch in branches:
        if len(items) >= min(WORLD_MAX_ITEMS, 3 + level // 2):
            break
        choices = sorted(by_branch[branch] - set(items))
        if choices:
            item = rng.choice(choices)
            value = C.ITEMS[item]["sell"] or 2
            items[item] = max(1, math.ceil(budget / value))
    return {"honey": round(WORLD_HONEY * WORLD_HONEY_SCALE ** level), "items": items}


def world_multiplier(level: int) -> float:
    return 1 + WORLD_HIVE_BONUS * level


# ---- Distillerie ------------------------------------------------------------

# Effets : "harvest" multiplie la récolte après le plafond, "mutation" les chances de mutation, "variant" les
# chances de variante rare, "lifespan" la vie des reines couronnées pendant l'effet, "no_wear" arrête l'usure des
# modules, "expedition" ajoute des points de chance ; "instant" fait vivre d'un coup ce nombre de minutes aux ruches.
ELIXIRS = {
    "elixir_vigor": {
        "effects": {"harvest": 1.5}, "minutes": 60,
        "desc": "Récolte ×1,5 dans toutes les ruches pendant 1 h, même pour celles déjà au maximum.",
        "cost": {"honey": 6000, "items": {"honeydew": 40, "pollen": 20, "fruit": 15, "petal": 15}},
    },
    "elixir_mutation": {
        "effects": {"mutation": 2.0}, "minutes": 60,
        "desc": "Chances de mutation ×2 dans toutes les ruches pendant 1 h.",
        "cost": {"honey": 5000, "items": {"mana": 5, "phosphor": 10, "slime": 10, "dew": 15}},
    },
    "elixir_scout": {
        "effects": {"expedition": 0.2}, "minutes": 60,
        "desc": "Les expéditions lancées pendant 1 h gagnent 20 points de chance de réussite.",
        "cost": {"honey": 4000, "items": {"silk": 15, "coal": 15, "ice_shard": 15, "stardust": 3}},
    },
    "elixir_youth": {
        "effects": {"lifespan": 0.5}, "minutes": 60,
        "desc": "Les reines couronnées pendant 1 h vivent deux fois moins longtemps : les générations s'enchaînent pour l'élevage.",
        "cost": {"honey": 5000, "items": {"royal_jelly": 8, "pollen": 30, "dew": 20}},
    },
    "elixir_wax": {
        "effects": {"no_wear": True}, "minutes": 120,
        "desc": "Pendant 2 h, les cadres et modules ne s'usent plus.",
        "cost": {"honey": 6000, "items": {"wax": 200, "propolis": 40, "resin": 20}},
    },
    "elixir_fortune": {
        "effects": {"variant": 5.0}, "minutes": 60,
        "desc": "Chances de naissance d'une variante rare ×5 dans toutes les ruches pendant 1 h.",
        "cost": {"honey": 15000, "items": {"royal_jelly": 15, "stardust": 6, "petal": 30, "prism": 1}},
    },
    "elixir_time": {
        "effects": {}, "instant": 30, "minutes": 0,
        "desc": "Les ruches et les centrifugeuses vivent d'un coup 30 minutes de plus.",
        "cost": {"honey": 25000, "items": {"amber": 5, "energy": 20, "lightning_shard": 2, "moonstone": 1}},
    },
    "elixir_grand": {
        "effects": {"harvest": 1.5, "mutation": 2.0, "variant": 3.0, "expedition": 0.2}, "minutes": 60,
        "desc": "Vigueur, mutation et éclaireur à la fois pendant 1 h, et variantes rares ×3.",
        "cost": {"honey": 30000, "items": {"royal_jelly": 25, "energy": 10, "ender_pearl": 3, "amber": 3, "dye": 10}},
    },
}
EXPEDITION_MAX_CHANCE = 0.98


def public_late() -> dict:
    return {
        "museum": {"collections": MUSEUM, "bonus": MUSEUM_BONUS, "comb_need": MUSEUM_COMB_NEED, "jar": JAR_ITEMS},
        "world_hive": {"bonus": WORLD_HIVE_BONUS},
        "elixirs": ELIXIRS,
    }
