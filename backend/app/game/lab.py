"""Laboratoire de génétique : niveaux, fragments, doses et opérations qui prennent du temps.

Inspiré de Gendustry : rien n'est instantané ni gratuit. Un gène s'obtient en réunissant
plusieurs fragments (chaque extraction sacrifie une abeille et peut échouer), puis offre un
nombre limité de doses d'impression. L'impression ne remplace que la copie active du gène :
il faut ensuite élever pour fixer le caractère.
"""

from . import content as C

# Niveau : nom, ce qu'il permet, prix, espèces découvertes exigées
LEVELS = {
    1: {
        "label": "Paillasse",
        "desc": "Extraction des gènes de vitesse, de longévité et de fertilité.",
        "cost": {"honey": 2000, "items": {"wax": 30, "propolis": 15}},
        "min_species": 15,
        "extract": ["speed", "lifespan", "fertility"],
        "imprint": False,
    },
    2: {
        "label": "Séquenceur",
        "desc": "Extraction de tous les gènes sauf l'espèce ; impression et réplication des gènes.",
        "cost": {"honey": 8000, "items": {"royal_jelly": 10, "honeydew": 40}},
        "min_species": 40,
        "extract": ["speed", "lifespan", "fertility", "tolerance", "activity", "weatherproof", "stability"],
        "imprint": True,
    },
    3: {
        "label": "Synthétiseur",
        "desc": "Extraction et impression du gène d'espèce.",
        "cost": {"honey": 30000, "items": {"mana": 10, "amber": 10}},
        "min_species": 100,
        "extract": list(C.CHROMOSOMES),
        "imprint": True,
    },
}

EXTRACT_SECONDS = 120
IMPRINT_SECONDS = 300
REPLICATE_SECONDS = 240
EXTRACT_FAIL = 0.30
DOSES = 3
LOG_SIZE = 6

# Rareté des allèles : nombre de fragments à réunir
RARE = {
    "speed": {"faster", "fastest"},
    "lifespan": {"longer", "longest"},
    "fertility": {"4"},
    "tolerance": {"two"},
    "activity": {"cathemeral"},
    "weatherproof": {"yes"},
    "stability": {"pure", "chaotic", "ordered"},
}
MEDIUM = {
    "speed": {"fast"},
    "lifespan": {"long", "elongated", "shortest"},
    "fertility": {"3"},
    "tolerance": {"one"},
    "activity": {"nocturnal", "crepuscular"},
    "stability": {"stable", "unstable", "erratic"},
}


def _species_tiers() -> dict[str, int]:
    results = {m["result"] for m in C.MUTATIONS}
    tiers = {s: 0 for s in C.SPECIES if s not in results}
    changed = True
    while changed:
        changed = False
        for m in C.MUTATIONS:
            if m["a"] in tiers and m["b"] in tiers:
                tier = 1 + max(tiers[m["a"]], tiers[m["b"]])
                if m["result"] not in tiers or tier < tiers[m["result"]]:
                    tiers[m["result"]] = tier
                    changed = True
    return {s: tiers.get(s, 0) for s in C.SPECIES}


SPECIES_TIERS = _species_tiers()


def rarity(chromosome: str, allele: str) -> str:
    if chromosome == "species":
        return "species"
    if allele in RARE.get(chromosome, ()):
        return "rare"
    if allele in MEDIUM.get(chromosome, ()):
        return "medium"
    return "common"


def fragments_needed(chromosome: str, allele: str) -> int:
    if chromosome == "species":
        return min(8, 3 + SPECIES_TIERS.get(allele, 0) // 2)
    return {"common": 2, "medium": 4, "rare": 6}[rarity(chromosome, allele)]


def imprint_cost(genes: dict[str, str]) -> dict:
    """Prix d'une impression : verrerie, miel par gène, ressources selon la rareté."""
    items: dict[str, int] = {"labware": 1}
    for chromosome, allele in genes.items():
        kind = rarity(chromosome, allele)
        extra: dict[str, int] = {}
        if kind == "medium":
            extra = {"propolis": 2}
        elif kind == "rare":
            extra = {"royal_jelly": 2}
        elif kind == "species":
            extra = {"royal_jelly": 3}
            comb = next((item for item, _ in C.SPECIES[allele]["products"] if C.ITEMS[item]["category"] == "comb"), None)
            if comb:
                extra[comb] = 5
        for item, n in extra.items():
            items[item] = items.get(item, 0) + n
    return {"honey": 50 * len(genes), "items": items}


def replicate_cost(chromosome: str, allele: str) -> dict:
    return {"honey": 100 * fragments_needed(chromosome, allele), "items": {"labware": 2, "royal_jelly": 1}}


def can_extract(level: int, chromosome: str) -> bool:
    return level >= 1 and chromosome in LEVELS[min(level, 3)]["extract"]


def can_imprint(level: int, chromosome: str) -> bool:
    return level >= 2 and LEVELS[min(level, 3)]["imprint"] and chromosome in LEVELS[min(level, 3)]["extract"]


def public_lab() -> dict:
    return {
        "levels": LEVELS,
        "extract_seconds": EXTRACT_SECONDS,
        "imprint_seconds": IMPRINT_SECONDS,
        "replicate_seconds": REPLICATE_SECONDS,
        "extract_fail": EXTRACT_FAIL,
        "doses": DOSES,
        "fragments": {
            c: {a: fragments_needed(c, a) for a in (C.SPECIES if c == "species" else C.ALLELES[c])}
            for c in C.CHROMOSOMES
        },
        "rarity": {c: {a: rarity(c, a) for a in C.ALLELES[c]} for c in C.ALLELES},
    }
