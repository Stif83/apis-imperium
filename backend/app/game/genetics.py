"""Génétique façon Forestry : chaque chromosome porte un allèle actif et un inactif.

Le même moteur sert aux abeilles ("bee") et aux arbres ("tree").
"""

import hashlib
import json
import math

from . import content as C
from . import garden as GD
from .content import ALLELES, BIOMES, HIVE_TYPES, MODULES, SPECIES, TEMPS

KINDS = {
    "bee": {"species": C.SPECIES, "chromosomes": C.CHROMOSOMES, "alleles": C.ALLELES, "mutations": C.MUTATIONS},
    "tree": {"species": GD.TREE_SPECIES, "chromosomes": GD.TREE_CHROMOSOMES, "alleles": GD.TREE_ALLELES, "mutations": GD.TREE_MUTATIONS},
}


def pure_genome(species_id: str, kind: str = "bee") -> dict:
    return {c: [a, a] for c, a in KINDS[kind]["species"][species_id]["template"].items()}


def normalize(genome: dict, kind: str = "bee") -> dict:
    """Complète un génome enregistré avant l'ajout d'un chromosome (mises à jour du jeu)."""
    table = KINDS[kind]
    species = genome["species"]
    out = {}
    for c in table["chromosomes"]:
        if c in genome:
            out[c] = list(genome[c])
        else:
            out[c] = [table["species"][species[0]]["template"][c], table["species"][species[1]]["template"][c]]
    return out


def genome_hash(genome: dict) -> str:
    return hashlib.sha1(json.dumps(genome, sort_keys=True).encode()).hexdigest()


def value(genome: dict, chromosome: str, kind: str = "bee"):
    return KINDS[kind]["alleles"][chromosome][genome[chromosome][0]]["value"]


def is_dominant(chromosome: str, allele: str, kind: str = "bee") -> bool:
    if chromosome == "species":
        return KINDS[kind]["species"][allele]["dominant"]
    return KINDS[kind]["alleles"][chromosome][allele]["dominant"]


def allele_exists(chromosome: str, allele: str, kind: str = "bee") -> bool:
    table = KINDS[kind]
    return allele in (table["species"] if chromosome == "species" else table["alleles"].get(chromosome, {}))


def climate_ok(genome: dict, hive_temp: str) -> bool:
    wanted = TEMPS.index(SPECIES[genome["species"][0]]["temp"])
    return abs(TEMPS.index(hive_temp) - wanted) <= value(genome, "tolerance")


def products(genome: dict, kind: str = "bee") -> list[tuple[str, float]]:
    """Produits de l'espèce active, plus ceux de l'espèce inactive à demi-chance."""
    species = KINDS[kind]["species"]
    active, inactive = genome["species"]
    out = list(species[active]["products"])
    out += [(item, chance / 2) for item, chance in species[inactive]["products"]]
    return out


def hive_mods(hive_type: str, biome: str, modules: list[str]) -> dict:
    mods = {
        "production": HIVE_TYPES[hive_type]["production"],
        "lifespan": 1.0,
        "mutation": 1.0,
        "automation": False,
        "light": False,
        "shelter": False,
    }
    temp = TEMPS.index(BIOMES[biome]["temp"])
    for module in modules:
        effects = MODULES.get(module, {}).get("effects", {})
        for key in ("production", "lifespan", "mutation"):
            mods[key] *= effects.get(key, 1.0)
        temp += effects.get("temp", 0)
        for flag in ("automation", "light", "shelter"):
            mods[flag] = mods[flag] or effects.get(flag, False)
    mods["temp"] = TEMPS[max(0, min(len(TEMPS) - 1, temp))]
    return mods


def cond_ok(cond: dict, ctx: dict) -> bool:
    """Vérifie les conditions d'une mutation dans le contexte de la ruche (voir content.MUTATION_CONDITIONS)."""
    for key, val in cond.items():
        if key == "trait":
            queen = ctx.get("queen")
            if not queen or any(queen.get(c, [None])[0] != a for c, a in val.items()):
                return False
            continue
        if key not in ctx:
            return False
        have = ctx[key]
        if key == "phase":
            ok = have in ("dawn", "dusk") if val == "dawn_dusk" else have == val
        elif key == "hours":
            ok = val[0] <= have < val[1]
        elif key == "weather":
            ok = have in ("rain", "storm") if val == "rain" else have == val
        elif key in ("module", "tree"):
            ok = val in have
        elif key in ("butterflies", "hives_min", "machines", "discovered"):
            ok = have >= val
        elif key == "hives_max":
            ok = have <= val
        else:
            ok = have == val
        if not ok:
            return False
    return True


def _mutated_template(g1: dict, g2: dict, rng, mutation_mult: float, ctx: dict, kind: str) -> dict | None:
    if rng.random() < 0.5:
        a, b = g1["species"][0], g2["species"][1]
    else:
        a, b = g1["species"][1], g2["species"][0]
    candidates = [m for m in KINDS[kind]["mutations"] if {m["a"], m["b"]} == {a, b}]
    rng.shuffle(candidates)
    for m in candidates:
        if not cond_ok(m.get("cond") or {}, ctx):
            continue
        if rng.random() < m["chance"] * mutation_mult:
            return KINDS[kind]["species"][m["result"]]["template"]
    return None


def breed(queen: dict, mate: dict, rng, mutation_mult: float = 1.0, hive_temp: str = "normal", kind: str = "bee",
          ctx: dict | None = None) -> dict:
    """Croise deux génomes. `ctx` décrit la ruche au moment de la naissance (conditions de mutation)."""
    ctx = {**(ctx or {}), "temp": hive_temp, "queen": queen}
    if kind == "bee" and "stability" in queen:
        mutation_mult *= value(queen, "stability")
    set1 = _mutated_template(queen, mate, rng, mutation_mult, ctx, kind)
    set2 = _mutated_template(mate, queen, rng, mutation_mult, ctx, kind)
    child = {}
    for c in KINDS[kind]["chromosomes"]:
        first = set1[c] if set1 else rng.choice(queen[c])
        second = set2[c] if set2 else rng.choice(mate[c])
        if rng.random() < 0.5:
            first, second = second, first
        if not is_dominant(c, first, kind) and is_dominant(c, second, kind):
            first, second = second, first
        child[c] = [first, second]
    return child


def binomial(rng, n: int, p: float) -> int:
    if n <= 0 or p <= 0:
        return 0
    if p >= 1:
        return n
    if n <= 64:
        return sum(1 for _ in range(n) if rng.random() < p)
    drawn = round(rng.gauss(n * p, math.sqrt(n * p * (1 - p))))
    return max(0, min(n, drawn))
