"""Génétique façon Forestry : chaque chromosome porte un allèle actif et un inactif."""

import hashlib
import json
import math

from . import variants as V
from .content import ALLELES, BIOMES, CHROMOSOMES, HIVE_TYPES, MODULES, MUTATIONS, OVERFLOW, SPECIES, TEMPS


def pure_genome(species_id: str) -> dict:
    return {c: [a, a] for c, a in SPECIES[species_id]["template"].items()}


def normalize(genome: dict) -> dict:
    """Complète un génome enregistré avant l'ajout d'un chromosome (mises à jour du jeu)."""
    species = genome["species"]
    out = {}
    for c in CHROMOSOMES:
        if c in genome:
            out[c] = list(genome[c])
        else:
            out[c] = [SPECIES[species[0]]["template"][c], SPECIES[species[1]]["template"][c]]
    # La variante rare n'est pas un chromosome, mais elle suit l'abeille partout
    if V.KEY in genome:
        out[V.KEY] = list(genome[V.KEY])
    return out


def genome_hash(genome: dict) -> str:
    return hashlib.sha1(json.dumps(genome, sort_keys=True).encode()).hexdigest()


def value(genome: dict, chromosome: str):
    return ALLELES[chromosome][genome[chromosome][0]]["value"]


def is_dominant(chromosome: str, allele: str) -> bool:
    if chromosome == "species":
        return SPECIES[allele]["dominant"]
    return ALLELES[chromosome][allele]["dominant"]


def allele_exists(chromosome: str, allele: str) -> bool:
    return allele in (SPECIES if chromosome == "species" else ALLELES.get(chromosome, {}))


def climate_ok(genome: dict, hive_temp: str) -> bool:
    wanted = TEMPS.index(SPECIES[genome["species"][0]]["temp"])
    return abs(TEMPS.index(hive_temp) - wanted) <= value(genome, "tolerance")


def products(genome: dict) -> list[tuple[str, float]]:
    """Produits de l'espèce active, plus ceux de l'espèce inactive à demi-chance."""
    active, inactive = genome["species"]
    out = list(SPECIES[active]["products"])
    out += [(item, chance / 2) for item, chance in SPECIES[inactive]["products"]]
    return out


def overflow(chance: float, boost: float) -> float:
    """Surplus par cycle d'un produit de chance `chance` (non plafonnée), dont `boost` vient des modules
    "overflow" : seuls les doublements de ces modules au-delà de 100 % comptent."""
    if chance <= 1:
        return 0.0
    return OVERFLOW * (math.log2(chance) - max(0.0, math.log2(chance / boost)))


def scale(rng, n: int, mult: float) -> int:
    """Multiplie une quantité par `mult` ; la partie fractionnaire est tirée au sort, objet par objet."""
    whole = int(mult)
    return n * whole + binomial(rng, n, mult - whole)


def hive_mods(hive_type: str, biome: str, modules: list[str], base_temp: str | None = None) -> dict:
    """Effets d'une ruche ; `base_temp` remplace la température du biome (ruche sous serre)."""
    mods = {
        "production": HIVE_TYPES[hive_type]["production"],
        "lifespan": 1.0,
        "mutation": 1.0,
        "overflow": 1.0,
        "automation": HIVE_TYPES[hive_type].get("automated", False),
        "light": False,
        "shelter": False,
    }
    temp = TEMPS.index(base_temp or BIOMES[biome]["temp"])
    for module in modules:
        effects = MODULES.get(module, {}).get("effects", {})
        for key in ("production", "lifespan", "mutation"):
            mods[key] *= effects.get(key, 1.0)
        if MODULES.get(module, {}).get("overflow"):
            mods["overflow"] *= effects.get("production", 1.0)
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
        elif key == "module":
            ok = val in have
        elif key in ("hives_min", "machines", "discovered", "sanctuary"):
            ok = have >= val
        elif key == "hives_max":
            ok = have <= val
        else:
            ok = have == val
        if not ok:
            return False
    return True


def _mutated_template(g1: dict, g2: dict, rng, mutation_mult: float, ctx: dict) -> dict | None:
    if rng.random() < 0.5:
        a, b = g1["species"][0], g2["species"][1]
    else:
        a, b = g1["species"][1], g2["species"][0]
    candidates = [m for m in MUTATIONS if {m["a"], m["b"]} == {a, b}]
    rng.shuffle(candidates)
    for m in candidates:
        if not cond_ok(m.get("cond") or {}, ctx):
            continue
        if rng.random() < m["chance"] * mutation_mult:
            return SPECIES[m["result"]]["template"]
    return None


def breed(queen: dict, mate: dict, rng, mutation_mult: float = 1.0, hive_temp: str = "normal",
          ctx: dict | None = None, pure_mutation: bool = False) -> dict:
    """Croise deux génomes. `ctx` décrit la ruche au moment de la naissance (conditions de mutation).

    Avec `pure_mutation`, un descendant qui mute naît de race pure (les deux copies de chaque gène
    sont celles de la nouvelle espèce) : c'est le cas des princesses, pour qu'une mutation se fixe.
    """
    ctx = {**(ctx or {}), "temp": hive_temp, "queen": queen}
    if "stability" in queen:
        mutation_mult *= value(queen, "stability")
    set1 = _mutated_template(queen, mate, rng, mutation_mult, ctx)
    set2 = _mutated_template(mate, queen, rng, mutation_mult, ctx)
    if pure_mutation and (set1 or set2):
        template = set1 or set2
        return {c: [template[c], template[c]] for c in CHROMOSOMES}
    child = {}
    for c in CHROMOSOMES:
        first = set1[c] if set1 else rng.choice(queen[c])
        second = set2[c] if set2 else rng.choice(mate[c])
        if rng.random() < 0.5:
            first, second = second, first
        if not is_dominant(c, first) and is_dominant(c, second):
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
