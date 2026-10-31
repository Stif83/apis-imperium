"""Variantes rares : de temps en temps, une princesse naît avec une robe et un pouvoir hors du commun.

La variante n'est pas un gène : elle est rangée dans le génome sous la clé "variant" (une paire, comme
un chromosome, pour que les génomes gardent la même forme partout) et ne passe pas par les croisements.
Elle se transmet de reine en princesse, toujours : une lignée variante le reste. Les faux-bourdons ne le
sont jamais et ne peuvent pas la donner : une princesse ordinaire n'a que la chance "chance" de chaque
variante de naître variante. Le pouvoir agit sur la ruche de la reine.
Règle de compatibilité : les identifiants de variantes sont stockés dans les sauvegardes.
"""

KEY = "variant"

# "chance" : probabilité qu'une princesse née d'une reine ordinaire porte cette variante.
# Pouvoirs : "harvest" multiplie la récolte (après le plafond), "lifespan" la durée de vie de la reine,
# "mutation" les chances de mutation ; "tireless" fait travailler à toute heure et par tous les temps,
# "drones" ajoute des faux-bourdons.
VARIANTS = {
    "golden": {
        "label": "Dorée", "icon": "✨", "chance": 1 / 4096, "color": "ffc107", "secondary": "fff59d",
        "power": {"harvest": 1.5},
        "desc": "Sa ruche récolte ×1,5, même quand elle est déjà au maximum.",
    },
    "albino": {
        "label": "Albinos", "icon": "🤍", "chance": 1 / 1600, "color": "f5f5f5", "secondary": "d6d6d6",
        "power": {"tireless": True},
        "desc": "Elle travaille à toute heure et par tous les temps, sans lanterne ni abri.",
    },
    "ancient": {
        "label": "Millénaire", "icon": "⏳", "chance": 1 / 2400, "color": "8d6e63", "secondary": "e0c9a6",
        "power": {"lifespan": 2.0},
        "desc": "Elle vit deux fois plus longtemps : les modules de sa ruche s'usent deux fois moins vite.",
    },
    "iridescent": {
        "label": "Irisée", "icon": "🌈", "chance": 1 / 2400, "color": "b388ff", "secondary": "80deea",
        "power": {"mutation": 3.0},
        "desc": "Chances de mutation ×3 dans sa ruche.",
    },
    "matriarch": {
        "label": "Matriarche", "icon": "👑", "chance": 1 / 4800, "color": "7b1fa2", "secondary": "ffd54f",
        "power": {"drones": 3},
        "desc": "Trois faux-bourdons de plus à chaque génération.",
    },
}
# Prix de vente d'une princesse variante, en multiple du prix normal
SELL_MULT = 50


def of(genome: dict | None) -> str | None:
    """Variante d'un génome, ou None."""
    pair = (genome or {}).get(KEY)
    return pair[0] if pair and pair[0] in VARIANTS else None


def power(genome: dict | None, key: str, neutral=1.0):
    variant = of(genome)
    return VARIANTS[variant]["power"].get(key, neutral) if variant else neutral


def roll(rng, queen: dict, chance_mult: float = 1.0) -> str | None:
    """Variante de la princesse d'une reine : celle de sa mère, sinon tirée au sort (un seul tirage), ou aucune."""
    inherited = of(queen)
    if inherited:
        return inherited
    pick = rng.random()
    for variant, spec in VARIANTS.items():
        pick -= spec["chance"] * chance_mult
        if pick < 0:
            return variant
    return None


def apply(genome: dict, variant: str) -> dict:
    """Génome portant la variante donnée."""
    return {**genome, KEY: [variant, variant]}


def public_variants() -> dict:
    return VARIANTS
