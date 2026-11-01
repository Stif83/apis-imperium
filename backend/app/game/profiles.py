"""Profils d'apiculteur : une page publique par joueur, que chacun décore à son goût.

Le joueur choisit sa présentation, le décor de sa bannière (un paysage de biome au moment de la journée
choisi, ou un décor débloqué : l'arbre-monde, les régions d'expédition), son avatar (une espèce découverte,
éventuellement dans la robe d'une variante déjà vue) et jusqu'à MAX_FEATURED statistiques mises en avant. Les
statistiques elles-mêmes se calculent à la lecture : le profil est toujours à jour.
Règle de compatibilité : les identifiants de statistiques sont stockés dans les profils.
"""

from . import content as C
from . import expeditions as E

BIO_MAX = 300
MAX_FEATURED = 4
PHASES = ("dawn", "day", "dusk", "night")

# id : (libellé, icône, mesure des trophées qui donne sa valeur)
STATS = {
    "species": ("Espèces découvertes", "📖", "species"),
    "branches": ("Branches complètes", "🌿", "branches"),
    "mythic": ("Espèces mythiques", "⛩️", "mythic_species"),
    "combs": ("Rayons récoltés", "⬢", "combs"),
    "honey": ("Miel gagné", "💰", "honey"),
    "generation": ("Plus haute génération de reine", "👑", "generation"),
    "hives": ("Ruches", "🏠", "hives"),
    "trophies": ("Paliers de trophées", "🏆", None),
    "champions": ("Lignées championnes", "💎", "pedigree:4"),
    "variants": ("Variantes rares trouvées", "✨", "variants"),
    "museum": ("Collections du Musée", "🏺", "museum_branches"),
    "world": ("Niveau de la Ruche-monde", "🌍", "world_hive_level"),
    "expeditions": ("Expéditions menées", "🧭", "expeditions"),
    "orders": ("Commandes livrées", "📜", "orders"),
    "elixirs": ("Élixirs distillés", "⚗️", "elixirs"),
}
DEFAULT = {"bio": "", "biome": "plains", "phase": "day", "decor": "scene", "favorite": None,
           "featured": ["species", "combs", "generation", "trophies"]}


def decors(discovered: set[str], world_level: int) -> list[str]:
    """Décors de bannière débloqués : le paysage de biome, l'arbre-monde (un niveau achevé), et chaque région
    d'expédition dont l'espèce sauvage est découverte."""
    out = ["scene"]
    if world_level >= 1:
        out.append("world")
    out += [f"region:{r}" for r, spec in E.REGIONS.items() if spec.get("wild") in discovered]
    return out


def settings_of(player) -> dict:
    """Réglages du profil, complétés par les valeurs par défaut."""
    return {**DEFAULT, **(player.profile or {})}


def validate(bio: str, biome: str, phase: str, featured: list[str]) -> str | None:
    """Message d'erreur, ou None si les réglages sont valides."""
    if len(bio) > BIO_MAX:
        return f"La présentation fait au plus {BIO_MAX} caractères."
    if biome not in C.BIOMES:
        return "Biome inconnu."
    if phase not in PHASES:
        return "Moment de la journée inconnu."
    if len(featured) > MAX_FEATURED or len(set(featured)) != len(featured) or any(s not in STATS for s in featured):
        return f"Choisissez jusqu'à {MAX_FEATURED} statistiques différentes."
    return None


def public_profiles() -> dict:
    return {
        "stats": {sid: {"label": label, "icon": icon} for sid, (label, icon, _) in STATS.items()},
        "bio_max": BIO_MAX,
        "max_featured": MAX_FEATURED,
    }
