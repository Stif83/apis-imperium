"""Badges affichés sur les vitrines : rang de l'Apidex, branches complètes, succès du Carnet.

Rien n'est stocké : les badges se recalculent à partir des découvertes et des objectifs réclamés.
"""

from . import content as C
from .achievements import ACHIEVEMENTS as ALL_ACHIEVEMENTS

# Rang : le plus haut atteint selon le nombre d'espèces découvertes
RANKS = [
    ("novice", "Apprenti apiculteur", 5),
    ("keeper", "Apiculteur", 20),
    ("breeder", "Éleveur", 50),
    ("master", "Maître éleveur", 100),
    ("grandmaster", "Grand maître", 150),
    ("imperator", "Apis Imperator", len(C.SPECIES)),
]

METALS = ["bronze", "silver", "gold", "diamond"]

# Succès : une médaille par famille d'objectifs, dont le métal monte avec le nombre d'objectifs réclamés
ACHIEVEMENTS = [
    ("builder", "Bâtisseur", "🏠", lambda o: o["kind"] == "hives", "Objectifs de ruches réclamés"),
    ("geneticist", "Généticien", "🧬", lambda o: o["kind"] == "genes", "Objectifs de génétique réclamés"),
    ("collector", "Collectionneur", "📖", lambda o: o["kind"] == "species", "Paliers de découverte réclamés"),
    ("archivist", "Archiviste", "📜", lambda o: True, "Objectifs du Carnet réclamés"),
]
# Seuils des métaux pour l'Archiviste (les autres familles comptent leurs objectifs un par un)
ARCHIVIST_STEPS = [5, 15, 35, 60]
ADVENTURER_STEPS = [5, 12, 22, len(ALL_ACHIEVEMENTS)]


def _branches() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for sid, spec in C.SPECIES.items():
        out.setdefault(spec["branch"], []).append(sid)
    return out


BRANCHES = _branches()


def _metal_steps(family: str, members: list[dict]) -> list[int]:
    """Nombre d'objectifs réclamés pour obtenir bronze, argent, or, diamant."""
    if family == "archivist":
        return [min(n, len(members)) for n in ARCHIVIST_STEPS]
    total = len(members)
    # Réparti sur les objectifs de la famille : le diamant exige de tous les réclamer
    return [max(1, -(-total * k // 4)) for k in (1, 2, 3, 4)]


def player_badges(discovered: set[str], claimed: set[str], achievements: int = 0) -> dict:
    count = len(discovered & set(C.SPECIES))
    rank = None
    next_rank = None
    for rid, label, need in RANKS:
        if count >= need:
            rank = {"id": f"rank:{rid}", "label": label, "need": need}
        elif next_rank is None:
            next_rank = {"label": label, "need": need}

    badges = []
    for family, label, icon, match, desc in ACHIEVEMENTS:
        members = [o for o in C.OBJECTIVES.values() if match(o)]
        done = sum(1 for o in members if o["id"] in claimed)
        steps = _metal_steps(family, members)
        level = sum(1 for n in steps if done >= n)
        if level:
            metal = METALS[min(level, len(METALS)) - 1]
            badges.append({"id": f"{family}:{metal}", "kind": "achievement", "label": label, "icon": icon,
                           "metal": metal, "desc": f"{desc} : {done}"})

    # Aventurier : nombre de succès débloqués
    level = sum(1 for n in ADVENTURER_STEPS if achievements >= n)
    if level:
        metal = METALS[level - 1]
        badges.append({"id": f"adventurer:{metal}", "kind": "achievement", "label": "Aventurier", "icon": "🧭",
                       "metal": metal, "desc": f"Succès débloqués : {achievements}"})

    for branch, members in BRANCHES.items():
        if len(members) >= 2 and all(s in discovered for s in members):
            first = C.SPECIES[members[0]]
            badges.append({"id": f"branch:{members[0]}", "kind": "branch", "label": branch,
                           "color": first["color"], "secondary": first["secondary"],
                           "desc": f"Branche « {branch} » complète ({len(members)} espèces)"})

    # Les plus prestigieux d'abord : métaux du plus rare au plus courant, puis les branches
    order = {m: i for i, m in enumerate(reversed(METALS))}
    badges.sort(key=lambda b: (b["kind"] != "achievement", order.get(b.get("metal"), 9)))
    return {"rank": rank, "next_rank": next_rank, "species": count, "badges": badges}
