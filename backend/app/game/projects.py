"""Grands projets : chantiers en plusieurs étapes, qui consomment beaucoup de ressources variées.

On y contribue petit à petit ; une étape s'achève dès que tout ce qu'elle demande a été donné, et
son effet s'applique aussitôt. Règle de compatibilité : les identifiants sont stockés dans les sauvegardes.
"""

from . import content as C

PROJECTS = {
    "observatory": {
        "label": "Observatoire",
        "icon": "🔭",
        "desc": "Une tour d'astronome au bout du rucher, pour lire le ciel et les humeurs des abeilles.",
        "stages": [
            {"label": "Lunette", "effect": "Prévisions météo des prochaines périodes, pour chaque biome.",
             "cost": {"honey": 5000, "items": {"wax": 200, "quartz": 30, "glowstone": 20}}},
            {"label": "Coupole", "effect": "Sur chaque ruche, les mutations possibles en ce moment (conditions réunies).",
             "cost": {"honey": 15000, "items": {"copper": 60, "tin": 60, "lapis": 10, "moonstone": 3}}},
            {"label": "Grand télescope", "effect": "Chances de mutation ×1,15 dans toutes les ruches.",
             "cost": {"honey": 40000, "items": {"silver": 40, "gold": 25, "stardust": 15, "sunstone": 5}}},
        ],
    },
    "greenhouse": {
        "label": "Serre climatique",
        "icon": "🌡️",
        "desc": "Des verrières chauffées ou refroidies : sous serre, une ruche choisit sa température et ne craint plus la pluie.",
        "stages": [
            {"label": "Châssis", "effect": "Une ruche sous serre, réglable de Froid à Torride ; biomes de serre Mangrove et Jardins suspendus.",
             "cost": {"honey": 6000, "items": {"wax": 300, "quartz": 40, "clay": 80, "silk": 40}}},
            {"label": "Verrière", "effect": "Trois ruches sous serre, toutes les températures (Glacial à Infernal) ; biomes Grotte de cristal et Forge.",
             "cost": {"honey": 18000, "items": {"iron": 80, "ice_shard": 60, "refractory_wax": 60, "glowstone": 30}}},
            {"label": "Jardin d'hiver", "effect": "Toutes les ruches peuvent passer sous serre ; production ×1,25 sous serre ; biome Dôme étoilé.",
             "cost": {"honey": 45000, "items": {"platinum": 10, "emerald": 10, "energy": 40, "royal_jelly": 40}}},
        ],
    },
}

PROJECTS["outpost"] = {
    "label": "Poste d'expédition",
    "icon": "🧭",
    "desc": "Un camp au bord du monde connu, d'où partent les équipes d'abeilles exploratrices.",
    "stages": [
        {"label": "Camp de base", "effect": "Une équipe en expédition à la fois, vers les régions proches.",
         "cost": {"honey": 8000, "items": {"wax": 250, "propolis": 60, "honeydew": 60, "silk": 30}}},
        {"label": "Relais", "effect": "Deux équipes à la fois ; les régions lointaines s'ouvrent.",
         "cost": {"honey": 20000, "items": {"iron": 60, "coal": 80, "ice_shard": 40, "fuel": 20}}},
        {"label": "Grand poste", "effect": "Trois équipes à la fois, butin ×1,5 et plus d'espèces sauvages.",
         "cost": {"honey": 50000, "items": {"gold": 20, "amber": 10, "energy": 40, "royal_jelly": 30}}},
    ],
}

PROJECTS["sanctuary"] = {
    "label": "Sanctuaire",
    "icon": "⛩️",
    "desc": "Un temple où les abeilles sauvages rencontrent les plus anciennes lignées, et d'où naissent les mythes.",
    "stages": [
        {"label": "Autel", "effect": "Premier cercle : quatre mutations mythiques, des sauvages croisées à des espèces avancées.",
         "cost": {"honey": 25000, "items": {"amber": 15, "mana": 20, "sapphire": 5, "ruby": 5, "stardust": 10}}},
        {"label": "Nef", "effect": "Second cercle : deux mutations mythiques de plus.",
         "cost": {"honey": 60000, "items": {"emerald": 15, "diamond": 3, "prism": 2, "chaos_shard": 3, "lightning_shard": 3}}},
        {"label": "Reliquaire", "effect": "L'ultime mutation devient possible ; les reines légendaires et mythiques produisent ×1,5.",
         "cost": {"honey": 150000, "items": {"imperial_jelly": 2, "primordial_essence": 2, "diamond": 8, "moonstone": 10, "sunstone": 10}}},
    ],
}

PROJECTS["robotics"] = {
    "label": "L'ère de la robotique",
    "icon": "🤖",
    "desc": "Des ateliers où les abeilles robotiques assemblent des ruches qui se règlent et s'entretiennent seules.",
    "stages": [
        {"label": "Atelier d'assemblage",
         "effect": "Les alvéaires peuvent évoluer en robo-ruches : élevage automatique intégré, cadres configurés et remplacés depuis la réserve.",
         "cost": {"honey": 100000, "items": {"microprocessor": 40, "circuit": 40, "gear": 80, "iron": 200}}},
        {"label": "Chaîne de montage",
         "effect": "Quand la réserve est vide, les robo-ruches rachètent elles-mêmes au marché les cadres de leur configuration.",
         "cost": {"honey": 200000, "items": {"microprocessor": 120, "energy": 100, "gold": 60, "copper": 300}}},
        {"label": "Conscience de ruche", "effect": "Production des robo-ruches ×1,3.",
         "cost": {"honey": 400000, "items": {"microprocessor": 300, "diamond": 12, "platinum": 25, "prism": 4}}},
    ],
}

ROBO_PRODUCTION = 1.3
SANCTUARY_PRODUCTION = 1.5
SANCTUARY_BRANCHES = ("Légendaires", "Mythiques")

OBSERVATORY_MUTATION = 1.15
GREENHOUSE_PRODUCTION = 1.25
# Ruches sous serre et températures permises, selon l'étape atteinte
GREENHOUSE_SLOTS = {1: 1, 2: 3, 3: 999}
GREENHOUSE_TEMPS = {1: C.TEMPS[1:5], 2: C.TEMPS, 3: C.TEMPS}
FORECAST_PERIODS = 4


def stage_cost(project_id: str, stage: int) -> dict | None:
    stages = PROJECTS[project_id]["stages"]
    return stages[stage]["cost"] if stage < len(stages) else None


def public_projects() -> dict:
    return {
        "list": {pid: p for pid, p in PROJECTS.items()},
        "greenhouse_temps": {str(k): v for k, v in GREENHOUSE_TEMPS.items()},
        "greenhouse_slots": {str(k): v for k, v in GREENHOUSE_SLOTS.items()},
    }
