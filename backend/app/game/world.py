"""Horloge et météo du monde, inspirées d'APICO.

Le monde est le même pour tous les joueurs et se calcule à partir de l'heure réelle :
pas de stockage, pas de tâche de fond. Une journée de jeu dure 24 minutes réelles
(une heure de jeu = une minute), la météo change toutes les 6 heures de jeu.
"""

import hashlib

DAY_SECONDS = 1440
HOUR_MS = DAY_SECONDS * 1000 // 24
WEATHER_HOURS = 6

PHASES = {
    "dawn": "Aube",
    "day": "Jour",
    "dusk": "Crépuscule",
    "night": "Nuit",
}
WEATHERS = {
    "clear": "Beau temps",
    "rain": "Pluie",
    "storm": "Orage",
    "snow": "Neige",
}

# Heures de travail selon le gène d'activité
ACTIVITY_HOURS = {
    "diurnal": set(range(6, 20)),
    "nocturnal": set(range(18, 24)) | set(range(0, 8)),
    "crepuscular": set(range(4, 10)) | set(range(16, 22)),
    "cathemeral": set(range(24)),
}
# Bonus de production pendant les heures de travail (compense les heures de repos)
ACTIVE_BONUS = 2.0


def hour(t_ms: int) -> int:
    return (t_ms // HOUR_MS) % 24


def phase(t_ms: int) -> str:
    h = hour(t_ms)
    if h in (5, 6):
        return "dawn"
    if 7 <= h <= 17:
        return "day"
    if h in (18, 19):
        return "dusk"
    return "night"


def _roll(period: int) -> float:
    digest = hashlib.sha1(f"apis-weather-{period}".encode()).digest()
    return int.from_bytes(digest[:4], "big") / 2**32


def weather(t_ms: int, biome_temp: str) -> str:
    """Météo d'un biome. Pas de pluie dans les biomes chauds ; elle tombe en neige dans les froids."""
    roll = _roll(t_ms // (HOUR_MS * WEATHER_HOURS))
    if biome_temp in ("hot", "hellish") or roll >= 0.3:
        return "clear"
    if biome_temp in ("icy", "cold"):
        return "snow"
    return "storm" if roll < 0.08 else "rain"


def working_cycles(start_ms: int, cycles: int, cycle_ms: int, activity: str, sheltered: bool,
                   biome_temp: str, always_lit: bool = False) -> int:
    """Nombre de cycles, parmi `cycles` à partir de `start_ms`, où l'abeille travaille.

    On avance heure de jeu par heure de jeu : l'heure et la météo y sont constantes.
    """
    hours = set(range(24)) if always_lit else ACTIVITY_HOURS.get(activity, ACTIVITY_HOURS["diurnal"])
    end = start_ms + cycles * cycle_ms
    t = start_ms
    total = 0
    while t < end:
        boundary = min(end, (t // HOUR_MS + 1) * HOUR_MS)
        # Cycles dont le début tombe dans [t, boundary)
        first = -(-(t - start_ms) // cycle_ms)
        last = -(-(boundary - start_ms) // cycle_ms)
        n = last - first
        if n > 0 and hour(t) in hours and (sheltered or weather(t, biome_temp) == "clear"):
            total += n
        t = boundary
    return total


def snapshot(t_ms: int, biomes: dict) -> dict:
    """État du monde envoyé à l'interface."""
    return {
        "hour": hour(t_ms),
        "minute": (t_ms % HOUR_MS) * 60 // HOUR_MS,
        "phase": phase(t_ms),
        "weather": {b: weather(t_ms, spec["temp"]) for b, spec in biomes.items()},
        "next_weather_ms": (t_ms // (HOUR_MS * WEATHER_HOURS) + 1) * HOUR_MS * WEATHER_HOURS - t_ms,
    }


def public_world() -> dict:
    return {
        "day_seconds": DAY_SECONDS,
        "phases": PHASES,
        "weathers": WEATHERS,
        "activity_hours": {k: sorted(v) for k, v in ACTIVITY_HOURS.items()},
    }
