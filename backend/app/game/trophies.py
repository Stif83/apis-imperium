"""Trophées du Carnet et pedigree des espèces.

Un trophée suit une mesure (espèces découvertes, rayons récoltés, espèces certifiées…) et compte
jusqu'à quatre paliers : bronze, argent, or, diamant. Chaque palier atteint se réclame dans le Carnet
et rapporte du miel, parfois du matériel. Les trophées remplacent les objectifs et la récompense des
succès : un succès n'est plus qu'un événement que les trophées comptent.

Le pedigree certifie la lignée d'une espèce, à partir d'une abeille présentée au jury (elle n'est pas
consommée) : on garde le meilleur niveau obtenu.

Règle de compatibilité : les identifiants de trophées sont stockés dans les sauvegardes, on ne les
renomme pas.
"""

from . import content as C
from .achievements import ACHIEVEMENTS
from .variants import VARIANTS

METALS = ["bronze", "silver", "gold", "diamond"]

CATEGORIES = {
    "collection": "Collection",
    "apiary": "Rucher",
    "breeding": "Élevage",
    "lab": "Laboratoire",
    "pedigree": "Pedigree",
    "trade": "Comptoir",
    "projects": "Grands projets",
    "expeditions": "Expéditions",
    "community": "Communauté",
    "secret": "Secrets",
}

FIRSTS = ("first_install", "first_harvest", "first_mutation", "first_manual", "first_extract", "first_imprint")
CURIOSITIES = ("hybrid", "pure_stability", "chaotic_stability", "full_alveary", "first_robo")
ELEMENTS = ("night_worker", "storm_worker", "snow_worker")


def _branches() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for sid, spec in C.SPECIES.items():
        out.setdefault(spec["branch"], []).append(sid)
    return out


BRANCHES = _branches()
N_SPECIES = len(C.SPECIES)
WILD = [sid for sid, s in C.SPECIES.items() if s.get("wild")]
MYTHIC = [sid for sid, s in C.SPECIES.items() if s["branch"] == "Mythiques"]


def _t(tid, category, label, icon, desc, metric, tiers, metals=None, secret=False):
    """tiers : [(seuil, miel, objets)] ; les métaux suivent l'ordre, sauf liste fournie."""
    metals = metals or METALS[: len(tiers)]
    return {
        "id": tid,
        "category": category,
        "label": label,
        "icon": icon,
        "desc": desc,
        "metric": metric,
        "secret": secret,
        "tiers": [{"need": n, "metal": m, "reward": {"honey": h, "items": items or {}}} for (n, h, items), m in zip(tiers, metals)],
    }


def _trophies() -> list[dict]:
    out = [
        # Collection
        _t("collector", "collection", "Collectionneur", "📖", "Espèces d'abeilles découvertes", "species",
           [(10, 200, {"frame_untreated": 2}), (40, 1500, {"frame_impregnated": 2}), (100, 6000, {"frame_proven": 2}),
            (N_SPECIES, 25000, {"imperial_jelly": 1})]),
        _t("naturalist", "collection", "Naturaliste", "🌿", "Branches de l'Apidex complètes", "branches",
           [(3, 300, None), (10, 1500, {"royal_jelly": 5}), (25, 5000, {"royal_jelly": 15}), (len(BRANCHES), 20000, {"imperial_jelly": 1})]),
        _t("rarities", "collection", "Chasseur de raretés", "✨", "Variantes rares trouvées (une par espèce et par variante)",
           "variants", [(1, 1000, None), (5, 5000, {"royal_jelly": 10}), (20, 20000, {"imperial_jelly": 1}),
                        (60, 60000, {"imperial_jelly": 3})]),
        _t("prism", "collection", "Prisme vivant", "🌈", "Sortes de variantes rares trouvées", "variant_kinds",
           [(3, 3000, None), (len(VARIANTS), 15000, {"imperial_jelly": 1})], metals=["gold", "diamond"]),
        # Rucher
        _t("builder", "apiary", "Bâtisseur", "🏠", "Ruches possédées", "hives",
           [(3, 150, None), (5, 400, None), (8, 1000, {"frame_impregnated": 2}), (12, 2500, {"alveary_production": 1})]),
        _t("traveler", "apiary", "Globe-trotteuse", "🗺️", "Biomes où vous avez une ruche", "biomes",
           [(2, 100, None), (3, 250, None), (4, 500, None), (len(C.BIOMES), 1000, {"hive_shelter": 1})]),
        _t("harvester", "apiary", "Récoltant", "⬢", "Rayons récoltés", "combs",
           [(100, 100, None), (1000, 500, None), (10000, 3000, None), (100000, 15000, {"royal_jelly": 10})]),
        _t("fortune", "apiary", "Fortune", "💰", "Miel gagné au total", "honey",
           [(10000, 500, None), (100000, 3000, None), (1000000, 15000, None), (10000000, 50000, {"imperial_jelly": 1})]),
        _t("handy", "apiary", "Mains en or", "🖐️", "Rayons centrifugés à la main", "manual",
           [(10, 20, None), (100, 300, None), (1000, 1500, None), (5000, 5000, None)]),
        _t("merchant", "apiary", "Marchand", "🛒", "Faux-bourdons vendus", "drones_sold",
           [(10, 30, None), (100, 150, None), (1000, 1000, None), (5000, 4000, None)]),
        # Élevage
        _t("firsts", "breeding", "Premiers pas", "👣", "Premières fois : reine, récolte, mutation, centrifugeuse, extraction, impression",
           "events:firsts", [(1, 20, None), (3, 60, None), (5, 150, None), (len(FIRSTS), 300, None)]),
        _t("dynasty", "breeding", "Dynastie", "🏰", "Génération de reine la plus haute atteinte", "generation",
           [(5, 50, None), (10, 200, None), (25, 800, None), (50, 2000, {"royal_jelly": 5})]),
        _t("curious", "breeding", "Curiosités", "🔀", "Hybride, lignée pure, lignée chaotique, alvéaire au maximum, robo-ruche",
           "events:curiosities", [(1, 50, None), (2, 300, None), (3, 800, None), (len(CURIOSITIES), 1500, None)]),
        _t("elements", "breeding", "Brave les éléments", "⛈️", "Ruche au travail la nuit, sous l'orage, sous la neige",
           "events:elements", [(1, 100, None), (2, 200, None), (len(ELEMENTS), 400, None)]),
        # Laboratoire
        _t("geneticist", "lab", "Généticien", "🧬", "Gènes différents dans la banque", "genes",
           [(3, 300, {"labware": 5}), (10, 1000, {"labware": 10}), (20, 3000, {"royal_jelly": 10}), (35, 8000, {"royal_jelly": 25})]),
        _t("extractor", "lab", "Échantillonneur", "🧪", "Extractions menées à terme", "extracts",
           [(10, 100, None), (50, 500, None), (200, 2000, None), (1000, 6000, None)]),
        _t("surgeon", "lab", "Docteur Abeille", "🔬", "Impressions de gènes réalisées", "imprints",
           [(1, 100, None), (10, 500, None), (50, 2000, None), (200, 6000, None)]),
        # Pedigree
        _t("pedigree_pure", "pedigree", "Sang pur", "🥉", "Espèces certifiées « Pure » ou mieux", "pedigree:1",
           [(5, 200, None), (25, 1000, None), (80, 4000, None), (N_SPECIES, 15000, {"imperial_jelly": 1})]),
        _t("pedigree_stable", "pedigree", "Lignées stables", "🥈", "Espèces certifiées « Stable » ou mieux", "pedigree:2",
           [(3, 300, None), (15, 1500, None), (50, 5000, {"royal_jelly": 10}), (120, 15000, {"imperial_jelly": 1})]),
        _t("pedigree_elite", "pedigree", "Élite", "🥇", "Espèces certifiées « Élite » ou mieux", "pedigree:3",
           [(1, 500, None), (5, 2000, None), (20, 6000, {"royal_jelly": 15}), (60, 20000, {"imperial_jelly": 2})]),
        _t("pedigree_champion", "pedigree", "Champions", "💎", "Espèces certifiées « Champion »", "pedigree:4",
           [(1, 1500, None), (3, 4000, None), (10, 10000, {"royal_jelly": 25}), (25, 30000, {"imperial_jelly": 3})]),
        # Comptoir
        _t("trader", "trade", "Négociant", "📦", "Commandes livrées", "orders",
           [(1, 50, None), (10, 400, None), (50, 2000, {"royal_jelly": 5}), (200, 8000, {"imperial_jelly": 1})]),
        _t("renown", "trade", "Renommée", "🎖️", "Niveau de réputation au Comptoir", "reputation_level",
           [(1, 200, None), (2, 600, None), (4, 3000, None), (5, 10000, {"imperial_jelly": 1})]),
        _t("prestige", "trade", "Prestige", "🏆", "Commandes de prestige honorées", "prestige_orders",
           [(1, 500, None), (5, 3000, None), (15, 10000, None), (40, 30000, {"imperial_jelly": 2})]),
        _t("wonders", "projects", "Bâtisseur de merveilles", "🏛️", "Étapes de grands projets achevées", "project_stages",
           [(1, 500, None), (3, 3000, None), (6, 12000, {"imperial_jelly": 1})]),
        _t("conservator", "projects", "Conservateur", "🏺", "Collections complètes au Musée du miel", "museum_branches",
           [(1, 1000, None), (5, 5000, {"royal_jelly": 10}), (20, 20000, {"royal_jelly": 30}), (len(BRANCHES), 100000, {"imperial_jelly": 1})]),
        _t("world_builder", "projects", "Bâtisseur de la Ruche-monde", "🌍", "Niveaux de la Ruche-monde achevés", "world_hive_level",
           [(3, 2000, None), (10, 10000, {"royal_jelly": 20}), (25, 50000, {"imperial_jelly": 1}), (50, 200000, {"imperial_jelly": 3})]),
        _t("distiller", "projects", "Maître distillateur", "⚗️", "Élixirs distillés", "elixirs",
           [(5, 1000, None), (25, 5000, None), (100, 20000, {"royal_jelly": 20})]),
        _t("explorer", "expeditions", "Explorateur", "🧭", "Expéditions menées à terme", "expeditions",
           [(1, 100, None), (10, 800, None), (50, 4000, {"royal_jelly": 10}), (200, 15000, {"imperial_jelly": 1})]),
        _t("pioneer", "expeditions", "Pionnier", "🦋", "Espèces sauvages découvertes", "wild_species",
           [(1, 500, None), (2, 1500, None), (4, 5000, None), (len(WILD), 15000, {"imperial_jelly": 1})]),
        _t("mythologist", "projects", "Mythologue", "⛩️", "Espèces mythiques découvertes", "mythic_species",
           [(1, 2000, None), (3, 6000, None), (6, 15000, {"imperial_jelly": 1}), (len(MYTHIC), 40000, {"primordial_essence": 1})]),
        # Communauté
        _t("curator", "community", "Vernissage", "🖼️", "Vitrines publiées", "showcases", [(1, 50, None)], metals=["silver"]),
        _t("loved", "community", "Coup de cœur", "💛", "« J'aime » reçus sur vos vitrines", "likes",
           [(1, 30, None), (10, 300, None), (50, 1000, None), (200, 3000, None)]),
    ]
    # Secrets : un seul palier, cachés tant qu'ils ne sont pas trouvés
    for aid, (label, desc, icon, secret, honey) in ACHIEVEMENTS.items():
        if secret:
            out.append(_t(f"secret:{aid}", "secret", label, icon, desc, f"event:{aid}", [(1, honey, None)], metals=["gold"], secret=True))
    return out


TROPHIES = {t["id"]: t for t in _trophies()}
EVENT_SETS = {"firsts": FIRSTS, "curiosities": CURIOSITIES, "elements": ELEMENTS}


def reached(trophy: dict, value: int) -> int:
    """Nombre de paliers atteints pour une valeur de la mesure."""
    return sum(1 for tier in trophy["tiers"] if value >= tier["need"])


# ---- Pedigree -------------------------------------------------------------

PEDIGREE_LEVELS = {
    1: {"label": "Pure", "icon": "🥉", "desc": "Les deux copies du gène d'espèce sont identiques."},
    2: {"label": "Stable", "icon": "🥈", "desc": "Les deux copies sont identiques sur tous les chromosomes."},
    3: {"label": "Élite", "icon": "🥇", "desc": "Stable, avec vitesse au moins Rapide, longévité au moins Longue et fertilité d'au moins 3."},
    4: {"label": "Champion", "icon": "💎", "desc": "Élite, avec tolérance ± 2 paliers, résistance aux intempéries et activité jour et nuit."},
}
ELITE = {
    "speed": {"fast", "faster", "fastest"},
    "lifespan": {"long", "longer", "longest"},
    "fertility": {"3", "4"},
}
CHAMPION = {"tolerance": {"two"}, "weatherproof": {"yes"}, "activity": {"cathemeral"}}


def pedigree_level(genome: dict) -> int:
    """Niveau de pedigree d'un génome normalisé : 0 (rien) à 4 (Champion)."""
    if genome["species"][0] != genome["species"][1]:
        return 0
    if any(pair[0] != pair[1] for pair in genome.values()):
        return 1
    if any(genome[c][0] not in ok for c, ok in ELITE.items()):
        return 2
    if any(genome[c][0] not in ok for c, ok in CHAMPION.items()):
        return 3
    return 4


def pedigree_missing(genome: dict) -> list[str]:
    """Ce qui manque à un génome pour monter d'un niveau (libellés lisibles)."""
    level = pedigree_level(genome)
    if level == 0:
        return ["Les deux copies du gène d'espèce doivent être identiques"]
    if level == 1:
        return [f"{C.CHROMOSOMES[c]} : copies différentes" for c, pair in genome.items() if pair[0] != pair[1]]
    if level == 2:
        return [C.CHROMOSOMES[c] for c, ok in ELITE.items() if genome[c][0] not in ok]
    if level == 3:
        return [C.CHROMOSOMES[c] for c, ok in CHAMPION.items() if genome[c][0] not in ok]
    return []


def public_trophies() -> dict:
    return {
        "categories": CATEGORIES,
        "list": list(TROPHIES.values()),
        "pedigree": PEDIGREE_LEVELS,
    }
