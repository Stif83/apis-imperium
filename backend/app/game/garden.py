"""Contenu du jardin : arbres à croiser et papillons à collectionner (inspiré de Forestry).

Même règle que pour les abeilles : on ajoute des identifiants, on n'en renomme ni n'en supprime.
"""

TREE_CHROMOSOMES = {
    "species": "Espèce",
    "growth": "Croissance",
    "yield": "Rendement",
    "saplings": "Pousses",
}


def _alleles(rows):
    return {i: {"label": label, "value": value, "dominant": dom} for i, label, value, dom in rows}


# growth : durée de vie de l'arbre en cycles avant la récolte
TREE_ALLELES = {
    "growth": _alleles([
        ("fastest", "Très rapide", 12, False),
        ("fast", "Rapide", 20, False),
        ("normal", "Normale", 30, True),
        ("slow", "Lente", 45, True),
        ("slowest", "Très lente", 60, True),
    ]),
    "yield": _alleles([
        ("lowest", "Très faible", 0.5, True),
        ("low", "Faible", 0.75, True),
        ("average", "Moyen", 1.0, False),
        ("high", "Élevé", 1.5, False),
        ("highest", "Très élevé", 2.0, False),
    ]),
    "saplings": _alleles([
        ("2", "2 pousses", 2, True),
        ("3", "3 pousses", 3, False),
        ("4", "4 pousses", 4, False),
    ]),
}


def _trees(rows):
    out = {}
    for tid, label, branch, leaf, trunk, growth, yld, saplings, products, dominant in rows:
        out[tid] = {
            "label": label,
            "branch": branch,
            "color": leaf,
            "secondary": trunk,
            "dominant": dominant,
            "products": products,
            "template": {"species": tid, "growth": growth, "yield": yld, "saplings": saplings},
        }
    return out


# id, nom, famille, feuillage, tronc, croissance, rendement, pousses, produits [(objet, chance par cycle)], dominant
TREE_SPECIES = _trees([
    ("oak", "Chêne", "Feuillus", "4c7a2a", "6b4a2b", "normal", "average", "2", [("wood", 0.30), ("apple", 0.08)], True),
    ("birch", "Bouleau", "Feuillus", "80a755", "e8e8e0", "fast", "low", "2", [("wood", 0.25)], True),
    ("spruce", "Épicéa", "Conifères", "3d6b4a", "4a3320", "normal", "average", "2", [("wood", 0.30)], True),
    ("jungle", "Arbre de jungle", "Tropicaux", "2f8f2f", "5a4520", "slow", "average", "2", [("wood", 0.30), ("cocoa", 0.08)], True),
    ("acacia", "Acacia", "Savane", "9aa83a", "8a5a3a", "normal", "low", "2", [("wood", 0.25)], True),
    ("dark_oak", "Chêne noir", "Feuillus", "2f5a1f", "3a2a18", "slow", "average", "2", [("wood", 0.35)], True),
    ("lime", "Tilleul", "Feuillus", "5ea107", "5a4a32", "fast", "low", "3", [("wood", 0.25)], True),
    ("willow", "Saule", "Feuillus", "a3b850", "5a5a3a", "fast", "average", "3", [("wood", 0.30)], True),
    ("cherry", "Cerisier", "Fruitiers", "e691da", "6b3a2b", "normal", "average", "2", [("wood", 0.20), ("cherry", 0.20)], True),
    ("walnut", "Noyer", "Fruitiers", "798c55", "4a3a28", "slow", "average", "2", [("wood", 0.30), ("nut", 0.15)], False),
    ("chestnut", "Châtaignier", "Fruitiers", "5ea107", "5a3d20", "slow", "high", "2", [("wood", 0.30), ("chestnut", 0.20)], False),
    ("lemon", "Citronnier", "Fruitiers", "88af54", "7a6a3a", "normal", "average", "2", [("wood", 0.15), ("lemon", 0.20)], False),
    ("plum", "Prunier", "Fruitiers", "589246", "5a3a4a", "normal", "high", "2", [("wood", 0.15), ("plum", 0.20)], False),
    ("maple", "Érable", "Feuillus", "d4541e", "6b4a2b", "normal", "average", "3", [("wood", 0.30), ("maple_syrup", 0.12)], False),
    ("larch", "Mélèze", "Conifères", "698f90", "5a3d2a", "normal", "average", "2", [("wood", 0.35)], True),
    ("pine", "Pin", "Conifères", "5a8a3a", "7a4a2a", "normal", "high", "2", [("wood", 0.35), ("amber", 0.03)], False),
    ("sequoia", "Séquoia", "Conifères", "418e71", "8a3a2a", "slowest", "highest", "2", [("wood", 0.60)], False),
    ("teak", "Teck", "Tropicaux", "8a9a4a", "7a6a4a", "slow", "average", "2", [("wood", 0.20), ("precious_wood", 0.15)], True),
    ("kapok", "Kapokier", "Tropicaux", "89987b", "6a6a4a", "slow", "average", "3", [("wood", 0.30), ("silk", 0.10)], True),
    ("ebony", "Ébénier", "Tropicaux", "a2d24a", "2a2420", "slow", "average", "2", [("precious_wood", 0.25)], False),
    ("mahogany", "Acajou", "Tropicaux", "8ab154", "6a2a1a", "slowest", "high", "2", [("precious_wood", 0.35)], False),
    ("balsa", "Balsa", "Savane", "59ac00", "d8c8a0", "fastest", "low", "4", [("wood", 0.40)], True),
    ("wenge", "Wengé", "Savane", "ada157", "3a2a20", "slow", "average", "2", [("precious_wood", 0.25)], False),
    ("baobab", "Baobab", "Savane", "feff8f", "8a7a5a", "slowest", "high", "2", [("wood", 0.50), ("fruit", 0.10)], False),
    ("papaya", "Papayer", "Fruitiers", "6d9f58", "8a7a4a", "normal", "average", "2", [("wood", 0.10), ("papaya", 0.20)], False),
    ("date", "Dattier", "Fruitiers", "cbcd79", "8a6a3a", "slow", "high", "2", [("wood", 0.10), ("dates", 0.20)], False),
])

BASE_TREES = ["oak", "birch", "spruce", "jungle", "acacia", "dark_oak"]

TREE_MUTATIONS = [
    {"a": a, "b": b, "result": result, "chance": chance, "temp": None}
    for a, b, result, chance in [
        ("oak", "birch", "lime", 0.15),
        ("oak", "lime", "willow", 0.10),
        ("lime", "birch", "cherry", 0.10),
        ("cherry", "lime", "walnut", 0.10),
        ("walnut", "lime", "chestnut", 0.10),
        ("lime", "cherry", "lemon", 0.05),
        ("lemon", "cherry", "plum", 0.05),
        ("lime", "larch", "maple", 0.05),
        ("birch", "spruce", "larch", 0.10),
        ("spruce", "larch", "pine", 0.10),
        ("larch", "pine", "sequoia", 0.05),
        ("dark_oak", "jungle", "teak", 0.10),
        ("jungle", "teak", "kapok", 0.10),
        ("kapok", "teak", "ebony", 0.10),
        ("kapok", "ebony", "mahogany", 0.10),
        ("teak", "acacia", "balsa", 0.10),
        ("dark_oak", "balsa", "wenge", 0.10),
        ("balsa", "wenge", "baobab", 0.10),
        ("jungle", "cherry", "papaya", 0.05),
        ("jungle", "papaya", "date", 0.05),
    ]
]

# chance : probabilité d'en trouver un à la récolte d'un arbre hôte
BUTTERFLIES = {
    bid: {"label": label, "color": color, "secondary": secondary, "chance": chance, "hosts": hosts, "sell": sell}
    for bid, label, color, secondary, chance, hosts, sell in [
        ("cabbage_white", "Piéride du chou", "ffffff", "c8c8c8", 0.30, ["oak", "birch", "lime"], 3),
        ("brimstone", "Citron", "f0ee38", "c8c020", 0.25, ["birch", "lime", "willow"], 4),
        ("speckled_wood", "Tircis", "947245", "e8d8a0", 0.25, ["oak", "dark_oak", "chestnut", "walnut"], 4),
        ("aurora", "Aurore", "ffffff", "ffa500", 0.20, ["oak", "cherry", "plum"], 5),
        ("postillion", "Souci", "f5a623", "5a3a10", 0.20, ["acacia", "lemon"], 5),
        ("reseda", "Marbré-de-vert", "a8c256", "ffffff", 0.20, ["spruce", "larch"], 5),
        ("spring_azure", "Azuré printanier", "b8cae2", "6a8ad0", 0.20, ["cherry", "plum", "maple"], 6),
        ("white_admiral", "Petit sylvain", "333333", "ffffff", 0.15, ["spruce", "pine", "larch"], 8),
        ("swallowtail", "Machaon", "f7e04a", "111111", 0.15, ["acacia", "date", "lemon"], 8),
        ("monarch", "Monarque", "ff8c1a", "111111", 0.12, ["maple", "willow", "lime"], 12),
        ("glassy_tiger", "Tigre translucide", "cfe8e0", "3a3a3a", 0.12, ["acacia", "teak", "balsa"], 12),
        ("glasswing", "Aile de verre", "e8f6ff", "8a5a3a", 0.10, ["jungle", "kapok"], 15),
        ("zebra", "Voilier zébré", "f0f0f0", "111111", 0.10, ["papaya", "date", "balsa"], 15),
        ("postman", "Facteur", "d21f1f", "111111", 0.10, ["kapok", "ebony", "wenge"], 15),
        ("blue_wing", "Morpho bleu", "2f6fed", "0a1a4a", 0.08, ["jungle", "teak", "mahogany"], 20),
        ("emerald", "Machaon émeraude", "12b06a", "0a2a1a", 0.08, ["lemon", "papaya"], 20),
        ("diana", "Diane", "2b2b6b", "e8a020", 0.06, ["pine", "sequoia"], 25),
        ("purple_emperor", "Grand mars changeant", "5a2d8f", "ffffff", 0.06, ["willow", "chestnut", "walnut"], 25),
        ("atlas", "Atlas", "b5651d", "f0d0a0", 0.05, ["baobab", "mahogany", "sequoia"], 40),
        ("death_head", "Sphinx tête-de-mort", "4a4030", "e0c040", 0.05, ["dark_oak", "ebony"], 40),
    ]
}

SAPLING_SELL = 3
STARTER_PLOTS = 2
STARTER_SAPLINGS = {"oak": 2, "birch": 2}


def public_garden() -> dict:
    return {
        "chromosomes": TREE_CHROMOSOMES,
        "alleles": TREE_ALLELES,
        "trees": TREE_SPECIES,
        "mutations": TREE_MUTATIONS,
        "butterflies": BUTTERFLIES,
        "sapling_sell": SAPLING_SELL,
    }
