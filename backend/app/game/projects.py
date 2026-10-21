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
            {"label": "Châssis", "effect": "Une ruche sous serre, réglable de Froid à Torride.",
             "cost": {"honey": 6000, "items": {"wax": 300, "quartz": 40, "clay": 80, "silk": 40}}},
            {"label": "Verrière", "effect": "Trois ruches sous serre, toutes les températures (Glacial à Infernal).",
             "cost": {"honey": 18000, "items": {"iron": 80, "ice_shard": 60, "refractory_wax": 60, "glowstone": 30}}},
            {"label": "Jardin d'hiver", "effect": "Toutes les ruches peuvent passer sous serre ; production ×1,25 sous serre.",
             "cost": {"honey": 45000, "items": {"platinum": 10, "emerald": 10, "energy": 40, "royal_jelly": 40}}},
        ],
    },
}

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
