"""Badges affichés sur les vitrines : rang de l'Apidex, trophées du Carnet, branches complètes.

Rien n'est stocké : les badges se recalculent à partir des découvertes et des paliers de trophées réclamés.
"""

from . import content as C
from .trophies import TROPHIES

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


def _branches() -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for sid, spec in C.SPECIES.items():
        out.setdefault(spec["branch"], []).append(sid)
    return out


BRANCHES = _branches()


def player_badges(discovered: set[str], trophies: dict | None = None) -> dict:
    count = len(discovered & set(C.SPECIES))
    rank = None
    next_rank = None
    for rid, label, need in RANKS:
        if count >= need:
            rank = {"id": f"rank:{rid}", "label": label, "need": need}
        elif next_rank is None:
            next_rank = {"label": label, "need": need}

    # Une médaille par trophée, au métal du plus haut palier réclamé
    badges = []
    for tid, n in (trophies or {}).items():
        trophy = TROPHIES.get(tid)
        if not trophy or n <= 0:
            continue
        tier = trophy["tiers"][min(n, len(trophy["tiers"])) - 1]
        badges.append({"id": f"{tid}:{tier['metal']}", "kind": "achievement", "label": trophy["label"], "icon": trophy["icon"],
                       "metal": tier["metal"], "desc": f"{trophy['desc']} : {tier['need']}"})

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
