"""Contenu du jeu (espèces, mutations, objets, boutique), inspiré de Forestry et Gendustry.

Règle de compatibilité : les identifiants (espèces, allèles, objets, modules) sont
stockés dans les sauvegardes. On peut en ajouter librement, mais on ne renomme ni ne
supprime jamais un identifiant existant.
"""

from .garden import BASE_TREES, STARTER_PLOTS, public_garden

TEMPS = ["icy", "cold", "normal", "warm", "hot", "hellish"]
TEMP_LABELS = {
    "icy": "Glacial",
    "cold": "Froid",
    "normal": "Tempéré",
    "warm": "Chaud",
    "hot": "Torride",
    "hellish": "Infernal",
}

BIOMES = {
    "plains": {"label": "Prairie", "temp": "normal", "color": "8bc34a"},
    "taiga": {"label": "Taïga", "temp": "cold", "color": "3f8f7b"},
    "tundra": {"label": "Toundra", "temp": "icy", "color": "9fd8f5"},
    "jungle": {"label": "Jungle", "temp": "warm", "color": "2e9e4f"},
    "desert": {"label": "Désert", "temp": "hot", "color": "e0b75a"},
}
# Ruches offertes au départ ; les autres biomes s'achètent en boutique
STARTER_BIOMES = ["plains", "plains"]

CHROMOSOMES = {
    "species": "Espèce",
    "speed": "Vitesse",
    "lifespan": "Longévité",
    "fertility": "Fertilité",
    "tolerance": "Tolérance climatique",
}


def _alleles(rows):
    return {i: {"label": label, "value": value, "dominant": dom} for i, label, value, dom in rows}


ALLELES = {
    "speed": _alleles([
        ("slowest", "Très lente", 0.3, True),
        ("slower", "Plus lente", 0.6, True),
        ("slow", "Lente", 0.8, True),
        ("normal", "Normale", 1.0, False),
        ("fast", "Rapide", 1.2, False),
        ("faster", "Plus rapide", 1.4, False),
        ("fastest", "Très rapide", 1.7, False),
    ]),
    "lifespan": _alleles([
        ("shortest", "Très courte", 10, False),
        ("shorter", "Plus courte", 20, True),
        ("short", "Courte", 30, True),
        ("shortened", "Raccourcie", 35, True),
        ("normal", "Normale", 40, False),
        ("elongated", "Allongée", 45, True),
        ("long", "Longue", 50, False),
        ("longer", "Plus longue", 60, False),
        ("longest", "Très longue", 70, False),
    ]),
    "fertility": _alleles([
        ("1", "1 faux-bourdon", 1, False),
        ("2", "2 faux-bourdons", 2, True),
        ("3", "3 faux-bourdons", 3, False),
        ("4", "4 faux-bourdons", 4, False),
    ]),
    "tolerance": _alleles([
        ("none", "Aucune", 0, True),
        ("one", "± 1 palier", 1, False),
        ("two", "± 2 paliers", 2, False),
    ]),
}

DEFAULT_SECONDARY = "ffdc16"


def _species(rows):
    out = {}
    for row in rows:
        sid, label, branch, color, temp, speed, lifespan, products, extra = row
        out[sid] = {
            "label": label,
            "branch": branch,
            "color": color,
            "secondary": extra.get("secondary", DEFAULT_SECONDARY),
            "dominant": extra.get("dominant", True),
            "temp": temp,
            "products": products,
            "template": {
                "species": sid,
                "speed": speed,
                "lifespan": lifespan,
                "fertility": extra.get("fertility", "2"),
                "tolerance": extra.get("tolerance", "none"),
            },
        }
    return out


# id, nom, branche, couleur, climat, vitesse, longévité, produits [(objet, chance par cycle)], options
SPECIES = _species([
    ("forest", "Sylvestre", "Mellifères", "19d0ec", "normal", "slowest", "shorter", [("comb_honey", 0.30)], {"fertility": "3"}),
    ("meadows", "Des prés", "Mellifères", "ef131e", "normal", "slowest", "shorter", [("comb_honey", 0.30)], {}),
    ("common", "Commune", "Mellifères", "b2b2b2", "normal", "slower", "shorter", [("comb_honey", 0.35)], {}),
    ("cultivated", "Cultivée", "Mellifères", "5734ec", "normal", "fast", "shortest", [("comb_honey", 0.40)], {}),
    ("noble", "Noble", "Nobles", "ec9a19", "normal", "slow", "short", [("comb_dripping", 0.20)], {"dominant": False}),
    ("majestic", "Majestueuse", "Nobles", "7f0000", "normal", "normal", "shortened", [("comb_dripping", 0.30)], {"fertility": "4"}),
    ("imperial", "Impériale", "Nobles", "a3e02f", "normal", "slower", "normal", [("comb_dripping", 0.20), ("royal_jelly", 0.15)], {"dominant": False}),
    ("diligent", "Diligente", "Industrieuses", "c219ec", "normal", "slow", "short", [("comb_stringy", 0.20)], {"dominant": False}),
    ("unweary", "Infatigable", "Industrieuses", "19ec5a", "normal", "normal", "shortened", [("comb_stringy", 0.30)], {}),
    ("industrious", "Industrieuse", "Industrieuses", "ffffff", "normal", "slower", "normal", [("comb_stringy", 0.20), ("pollen", 0.15)], {"dominant": False}),
    ("steadfast", "Inébranlable", "Héroïques", "4d2b15", "normal", "slowest", "normal", [("comb_cocoa", 0.20)], {"dominant": False}),
    ("heroic", "Héroïque", "Héroïques", "b3d5e4", "normal", "slow", "long", [("comb_cocoa", 0.40)], {"dominant": False}),
    ("modest", "Modeste", "Frugales", "c5be86", "hot", "slower", "shorter", [("comb_parched", 0.20)], {"tolerance": "one"}),
    ("frugal", "Frugale", "Frugales", "e8dcb1", "hot", "slower", "longer", [("comb_parched", 0.30)], {"tolerance": "one"}),
    ("austere", "Austère", "Frugales", "fffac2", "hot", "slow", "longer", [("comb_parched", 0.20), ("comb_powdery", 0.50)], {"dominant": False, "tolerance": "one"}),
    ("sinister", "Sinistre", "Infernales", "b3d5e4", "hellish", "slower", "normal", [("comb_simmering", 0.45)], {"secondary": "9a2323"}),
    ("fiendish", "Diabolique", "Infernales", "d7bee5", "hellish", "normal", "long", [("comb_simmering", 0.55)], {"secondary": "9a2323"}),
    ("demonic", "Démoniaque", "Infernales", "f4e400", "hellish", "slower", "longer", [("comb_simmering", 0.45), ("glowstone", 0.15)], {"secondary": "9a2323", "dominant": False}),
    ("tropical", "Tropicale", "Tropicales", "378020", "warm", "slower", "shorter", [("comb_silky", 0.20)], {}),
    ("exotic", "Exotique", "Tropicales", "304903", "warm", "normal", "shorter", [("comb_silky", 0.30)], {}),
    ("edenic", "Édénique", "Tropicales", "393d0d", "warm", "slower", "longer", [("comb_silky", 0.40)], {"dominant": False}),
    ("wintry", "Hivernale", "Glaciales", "a0ffc8", "icy", "slower", "shorter", [("comb_frozen", 0.30)], {"secondary": "daf5f3", "fertility": "4", "tolerance": "one"}),
    ("icy", "Givrée", "Glaciales", "a0ffff", "icy", "slow", "shorter", [("comb_frozen", 0.20), ("ice_shard", 0.20)], {"secondary": "daf5f3"}),
    ("glacial", "Polaire", "Glaciales", "efffff", "icy", "slower", "short", [("comb_frozen", 0.20), ("ice_shard", 0.40)], {"secondary": "daf5f3", "dominant": False}),
    ("marshy", "Des marais", "Marécageuses", "546626", "normal", "slower", "shorter", [("comb_mossy", 0.30)], {}),
    ("miry", "Fangeuse", "Marécageuses", "92af42", "normal", "slow", "long", [("comb_mossy", 0.36)], {}),
    ("boggy", "Tourbeuse", "Marécageuses", "698948", "normal", "normal", "long", [("comb_mossy", 0.39)], {}),
    ("rural", "Rurale", "Agricoles", "feff8f", "normal", "slow", "short", [("comb_wheaten", 0.20)], {}),
    ("farmerly", "Fermière", "Agricoles", "d39728", "normal", "normal", "short", [("comb_wheaten", 0.27)], {}),
    ("agrarian", "Agraire", "Agricoles", "ffca75", "normal", "fast", "short", [("comb_wheaten", 0.35)], {}),
    ("monastic", "Monastique", "Monastiques", "42371c", "normal", "slower", "long", [("comb_mellow", 0.20)], {"secondary": "fff7b6", "dominant": False}),
    ("secluded", "Recluse", "Monastiques", "7b6634", "normal", "fast", "long", [("comb_mellow", 0.30)], {"secondary": "fff7b6"}),
    ("hermitic", "Ermite", "Monastiques", "ffd46c", "normal", "faster", "long", [("comb_mellow", 0.40)], {"secondary": "fff7b6", "dominant": False}),
    # Forestry (suite)
    ("valiant", "Vaillante", "Héroïques", "626bdd", "normal", "slow", "long", [("comb_cocoa", 0.30), ("sugar", 0.15)], {}),
    ("ended", "Du Néant", "Néant", "e079fa", "cold", "slower", "longer", [("comb_mysterious", 0.30)], {"secondary": "d9de9e"}),
    ("spectral", "Spectrale", "Néant", "a98bed", "cold", "slower", "longer", [("comb_mysterious", 0.50)], {"secondary": "d9de9e"}),
    ("phantasmal", "Fantasmagorique", "Néant", "cc00fa", "cold", "slowest", "longest", [("comb_mysterious", 0.40), ("ender_pearl", 0.05)], {"secondary": "d9de9e", "dominant": False}),
    ("leporine", "Léporine", "Festives", "feff8f", "normal", "slow", "shortest", [("comb_silky", 0.30)], {"secondary": "3cd757"}),
    ("merry", "Joyeuse", "Festives", "ffffff", "icy", "slow", "shortest", [("comb_frozen", 0.30)], {"secondary": "d40000", "tolerance": "one"}),
    ("tipsy", "Pompette", "Festives", "ffffff", "icy", "slow", "shortest", [("comb_frozen", 0.30), ("mead", 0.10)], {"secondary": "c219ec", "tolerance": "one"}),
    ("tricky", "Farceuse", "Festives", "49413b", "normal", "slow", "shortest", [("comb_honey", 0.40), ("sugar", 0.20)], {"secondary": "ff6600"}),
    ("vindictive", "Rancunière", "Vengeresses", "eafff3", "normal", "slowest", "normal", [("comb_shadow", 0.25)], {"secondary": "9a2323", "dominant": False}),
    ("vengeful", "Vengeresse", "Vengeresses", "c2de00", "normal", "slowest", "longer", [("comb_shadow", 0.40)], {"secondary": "9a2323"}),
    ("avenging", "Justicière", "Vengeresses", "ddff00", "normal", "slowest", "longest", [("comb_shadow", 0.40), ("uranium", 0.03)], {"secondary": "9a2323", "dominant": False}),
    # Inspirées d'ExtraBees
    ("arid", "Aride", "Stériles", "bee854", "hot", "slower", "short", [("comb_barren", 0.30)], {}),
    ("barren", "Stérile", "Stériles", "e0d263", "hot", "slower", "short", [("comb_barren", 0.35)], {}),
    ("desolate", "Désolée", "Stériles", "d1b890", "hot", "slower", "short", [("comb_barren", 0.40)], {"dominant": False}),
    ("decaying", "Putréfiée", "Macabres", "bfe0b6", "normal", "slower", "short", [("comb_barren", 0.30), ("comb_rotten", 0.15)], {"secondary": "5a6b3a"}),
    ("skeletal", "Squelettique", "Macabres", "e9ede8", "normal", "slower", "short", [("comb_barren", 0.30), ("bone", 0.15)], {"secondary": "5a6b3a"}),
    ("creepy", "Rampante", "Macabres", "2ce615", "normal", "slower", "short", [("comb_barren", 0.30), ("gunpowder", 0.15)], {"secondary": "5a6b3a"}),
    ("rock", "Rocheuse", "Minérales", "a8a8a8", "normal", "slower", "short", [("comb_rocky", 0.30)], {"secondary": "999999"}),
    ("stone", "De pierre", "Minérales", "757575", "normal", "slow", "short", [("comb_rocky", 0.40)], {"secondary": "999999", "dominant": False}),
    ("granite", "De granit", "Minérales", "695555", "normal", "slow", "normal", [("comb_rocky", 0.50)], {"secondary": "999999"}),
    ("mineral", "Minérale", "Minérales", "6e757d", "normal", "slow", "normal", [("comb_rocky", 0.60)], {"secondary": "999999", "dominant": False}),
    ("copper", "Cuivrée", "Métalliques", "d16308", "normal", "slower", "normal", [("comb_rocky", 0.20), ("copper", 0.10)], {"secondary": "999999"}),
    ("tin", "Stannifère", "Métalliques", "bdb1bd", "normal", "slower", "normal", [("comb_rocky", 0.20), ("tin", 0.10)], {"secondary": "999999"}),
    ("iron", "Ferreuse", "Métalliques", "a87058", "normal", "slower", "normal", [("comb_rocky", 0.20), ("iron", 0.10)], {"secondary": "999999"}),
    ("lead", "Plombée", "Métalliques", "ad8bab", "normal", "slower", "normal", [("comb_rocky", 0.20), ("lead", 0.10)], {"secondary": "999999"}),
    ("nickel", "Nickelée", "Métalliques", "ffdefc", "normal", "slower", "normal", [("comb_rocky", 0.20), ("nickel", 0.10)], {"secondary": "999999"}),
    ("silver", "Argentée", "Précieuses", "dbdbdb", "normal", "slower", "long", [("comb_rocky", 0.20), ("silver", 0.06)], {"secondary": "999999", "dominant": False}),
    ("gold", "Dorée", "Précieuses", "e6cc0b", "normal", "slower", "long", [("comb_rocky", 0.20), ("gold", 0.06)], {"secondary": "999999", "dominant": False}),
    ("platinum", "Platinée", "Précieuses", "dbdbdb", "normal", "slowest", "longer", [("comb_rocky", 0.20), ("platinum", 0.04)], {"secondary": "e6cc0b", "dominant": False}),
    ("lapis", "Lazuli", "Gemmes", "3d2cdb", "normal", "slower", "long", [("comb_rocky", 0.20), ("lapis", 0.05)], {"secondary": "999999"}),
    ("emerald", "Émeraude", "Gemmes", "1cff03", "normal", "slower", "long", [("comb_rocky", 0.20), ("emerald", 0.05)], {"secondary": "999999", "dominant": False}),
    ("ruby", "Rubis", "Gemmes", "d60000", "normal", "slower", "long", [("comb_rocky", 0.20), ("ruby", 0.05)], {"secondary": "999999", "dominant": False}),
    ("sapphire", "Saphir", "Gemmes", "0a47ff", "normal", "slower", "long", [("comb_rocky", 0.20), ("sapphire", 0.05)], {"secondary": "999999", "dominant": False}),
    ("diamond", "Diamant", "Gemmes", "7fbdfa", "normal", "slowest", "longest", [("comb_rocky", 0.20), ("diamond", 0.03)], {"secondary": "999999", "dominant": False}),
    ("unstable", "Instable", "Nucléaires", "3e8c34", "hot", "slower", "shortest", [("comb_barren", 0.20), ("uranium", 0.03)], {"secondary": "999999"}),
    ("nuclear", "Nucléaire", "Nucléaires", "41cc2f", "hot", "slower", "shortest", [("comb_barren", 0.20), ("uranium", 0.06)], {"secondary": "999999"}),
    ("radioactive", "Radioactive", "Nucléaires", "1eff00", "hot", "slowest", "shortest", [("comb_barren", 0.20), ("uranium", 0.10)], {"secondary": "999999", "dominant": False}),
    ("water", "Aquatique", "Aquatiques", "94a2ff", "normal", "slower", "short", [("comb_water", 0.30)], {"secondary": "4d6bff"}),
    ("river", "Fluviale", "Aquatiques", "83b3d4", "normal", "slower", "short", [("comb_water", 0.30), ("clay", 0.20)], {"secondary": "4d6bff"}),
    ("ocean", "Océanique", "Aquatiques", "1d2ead", "normal", "slow", "normal", [("comb_water", 0.45)], {"secondary": "4d6bff", "dominant": False}),
    ("ink", "Encrée", "Aquatiques", "0e1340", "normal", "slow", "normal", [("comb_water", 0.30), ("dye", 0.25)], {"secondary": "4d6bff"}),
    ("sweet", "Sucrée", "Gourmandes", "fc51f1", "normal", "normal", "short", [("comb_sweet", 0.40)], {}),
    ("sugary", "Mielleuse", "Gourmandes", "e6d3e0", "normal", "normal", "short", [("comb_sweet", 0.40), ("sugar", 0.20)], {}),
    ("ripening", "Mûrissante", "Gourmandes", "b2c75d", "normal", "normal", "normal", [("comb_sweet", 0.30), ("fruit", 0.10)], {}),
    ("fruity", "Fruitée", "Gourmandes", "db5876", "normal", "normal", "normal", [("comb_sweet", 0.30), ("fruit", 0.30)], {"dominant": False}),
    ("alcohol", "Fermentée", "Fermières", "e88a61", "normal", "slow", "short", [("comb_wheaten", 0.30), ("mead", 0.20)], {}),
    ("milk", "Laitière", "Fermières", "e3e8e8", "normal", "slow", "short", [("comb_wheaten", 0.30), ("milk", 0.25)], {}),
    ("coffee", "Caféière", "Fermières", "8c5e30", "warm", "fast", "short", [("comb_sweet", 0.20), ("coffee", 0.25)], {}),
    ("basalt", "Basaltique", "Volcaniques", "8c6969", "hellish", "slower", "normal", [("comb_simmering", 0.25)], {"secondary": "9a2323"}),
    ("tempered", "Trempée", "Volcaniques", "8a4848", "hellish", "slow", "long", [("comb_simmering", 0.35), ("coal", 0.15)], {"secondary": "9a2323"}),
    ("volcanic", "Volcanique", "Volcaniques", "4d0c0c", "hellish", "normal", "longer", [("comb_simmering", 0.45), ("glowstone", 0.20)], {"secondary": "9a2323", "dominant": False}),
    ("malicious", "Malveillante", "Venimeuses", "782a77", "warm", "slower", "short", [("comb_venomous", 0.25)], {"secondary": "069764"}),
    ("infectious", "Infectieuse", "Venimeuses", "b82eb5", "warm", "slower", "short", [("comb_venomous", 0.35)], {"secondary": "069764"}),
    ("virulent", "Virulente", "Venimeuses", "f013ec", "warm", "slow", "normal", [("comb_venomous", 0.40), ("venom", 0.10)], {"secondary": "069764", "dominant": False}),
    ("viscous", "Visqueuse", "Gluantes", "094a02", "warm", "slower", "short", [("comb_silky", 0.20), ("slime", 0.20)], {"secondary": "069764"}),
    ("glutinous", "Glutineuse", "Gluantes", "1d8c27", "warm", "slower", "normal", [("comb_silky", 0.20), ("slime", 0.35)], {"secondary": "069764"}),
    ("sticky", "Collante", "Gluantes", "17e328", "warm", "slow", "normal", [("comb_silky", 0.20), ("slime", 0.50)], {"secondary": "069764", "dominant": False}),
    ("corrosive", "Corrosive", "Caustiques", "4a5c0b", "warm", "slower", "short", [("comb_venomous", 0.20), ("acid", 0.10)], {"secondary": "069764"}),
    ("caustic", "Caustique", "Caustiques", "84a11d", "hellish", "slower", "normal", [("comb_venomous", 0.20), ("acid", 0.20)], {"secondary": "069764"}),
    ("acidic", "Acide", "Caustiques", "c0f016", "hellish", "slow", "normal", [("comb_venomous", 0.20), ("acid", 0.30)], {"secondary": "069764", "dominant": False}),
    ("excited", "Excitée", "Énergiques", "ff4545", "normal", "fast", "shortest", [("comb_static", 0.25)], {}),
    ("energetic", "Énergique", "Énergiques", "e835c7", "normal", "faster", "shortest", [("comb_static", 0.35)], {}),
    ("ecstatic", "Extatique", "Énergiques", "af35e6", "normal", "fastest", "shortest", [("comb_static", 0.45), ("energy", 0.10)], {"dominant": False}),
    ("shadowed", "Ombrée", "Ténébreuses", "595959", "normal", "slower", "normal", [("comb_shadow", 0.25)], {"secondary": "333333"}),
    ("darkened", "Assombrie", "Ténébreuses", "332e33", "normal", "slower", "normal", [("comb_shadow", 0.35)], {"secondary": "333333"}),
    ("abyssal", "Abyssale", "Ténébreuses", "210821", "normal", "slow", "long", [("comb_shadow", 0.45)], {"secondary": "333333", "dominant": False}),
    ("ancient", "Ancienne", "Fossiles", "f2db8f", "normal", "slower", "long", [("comb_fossil", 0.25)], {}),
    ("primeval", "Primitive", "Fossiles", "b3a67b", "normal", "slower", "longer", [("comb_fossil", 0.35)], {}),
    ("prehistoric", "Préhistorique", "Fossiles", "6e5a40", "normal", "slowest", "longest", [("comb_fossil", 0.45)], {}),
    ("relic", "Relique", "Fossiles", "4d3e16", "normal", "slowest", "longest", [("comb_fossil", 0.45), ("amber", 0.10)], {"dominant": False}),
    ("oily", "Huileuse", "Pétrolières", "4c4833", "normal", "slower", "normal", [("comb_oil", 0.30)], {"secondary": "333333"}),
    ("distilled", "Distillée", "Pétrolières", "356356", "normal", "slow", "normal", [("comb_oil", 0.30), ("fuel", 0.15)], {"secondary": "333333", "dominant": False}),
    # Inspirées de MagicBees
    ("mystical", "Mystique", "Arcaniques", "afffb7", "normal", "slower", "shortened", [("comb_mystic", 0.25)], {"secondary": "ad3bf7"}),
    ("sorcerous", "Ensorceleuse", "Arcaniques", "ea9a9a", "hot", "slower", "shortened", [("comb_mystic", 0.30)], {"secondary": "ad3bf7", "tolerance": "one"}),
    ("eldritch", "Occulte", "Arcaniques", "8d75a0", "normal", "slower", "long", [("comb_mystic", 0.30)], {"secondary": "ad3bf7", "dominant": False}),
    ("esoteric", "Ésotérique", "Arcaniques", "001099", "normal", "slow", "shortened", [("comb_mystic", 0.35)], {"secondary": "ad3bf7"}),
    ("arcane", "Arcanique", "Arcaniques", "5c2a9d", "normal", "slow", "long", [("comb_mystic", 0.40), ("mana", 0.10)], {"secondary": "ad3bf7", "dominant": False}),
    ("charmed", "Charmée", "Enchantées", "48eea7", "normal", "slower", "shortened", [("comb_mystic", 0.30)], {"secondary": "ad3bf7"}),
    ("enchanted", "Enchantée", "Enchantées", "18e726", "normal", "slow", "elongated", [("comb_mystic", 0.35)], {"secondary": "ad3bf7"}),
    ("supernatural", "Surnaturelle", "Enchantées", "005614", "normal", "normal", "long", [("comb_mystic", 0.40), ("mana", 0.15)], {"secondary": "ad3bf7", "dominant": False}),
])

HIVE_SPECIES = ["forest", "meadows", "modest", "tropical", "wintry", "marshy"]


# Les chances écrites plus bas sont celles de Forestry ; le jeu les réduit de moitié
MUTATION_RATE = 0.5


def _mutations():
    out = []
    for i, a in enumerate(HIVE_SPECIES):
        for b in HIVE_SPECIES[i + 1:]:
            out.append({"a": a, "b": b, "result": "common", "chance": 0.15})
        out.append({"a": a, "b": "common", "result": "cultivated", "chance": 0.12})
    rows = [
        ("common", "cultivated", "noble", 0.10, None),
        ("noble", "cultivated", "majestic", 0.08, None),
        ("noble", "majestic", "imperial", 0.08, None),
        ("common", "cultivated", "diligent", 0.10, None),
        ("diligent", "cultivated", "unweary", 0.08, None),
        ("diligent", "unweary", "industrious", 0.08, None),
        ("steadfast", "diligent", "valiant", 0.08, None),
        ("steadfast", "valiant", "heroic", 0.06, None),
        ("modest", "cultivated", "sinister", 0.60, "hellish"),
        ("sinister", "cultivated", "fiendish", 0.40, "hellish"),
        ("sinister", "fiendish", "demonic", 0.25, "hellish"),
        ("modest", "sinister", "frugal", 0.16, None),
        ("modest", "frugal", "austere", 0.08, None),
        ("austere", "tropical", "exotic", 0.12, None),
        ("exotic", "tropical", "edenic", 0.08, None),
        ("industrious", "wintry", "icy", 0.12, None),
        ("icy", "wintry", "glacial", 0.08, None),
        ("marshy", "noble", "miry", 0.15, None),
        ("marshy", "miry", "boggy", 0.09, None),
        ("meadows", "diligent", "rural", 0.12, None),
        ("rural", "unweary", "farmerly", 0.10, None),
        ("farmerly", "industrious", "agrarian", 0.06, None),
        ("monastic", "austere", "secluded", 0.12, None),
        ("monastic", "secluded", "hermitic", 0.08, None),
        ("hermitic", "ended", "spectral", 0.04, None),
        ("spectral", "ended", "phantasmal", 0.02, None),
        ("meadows", "cultivated", "leporine", 0.06, None),
        ("wintry", "noble", "merry", 0.08, None),
        ("merry", "tropical", "tipsy", 0.08, None),
        ("sinister", "common", "tricky", 0.10, None),
        ("monastic", "demonic", "vindictive", 0.04, None),
        ("demonic", "vindictive", "vengeful", 0.08, None),
        ("vengeful", "vindictive", "avenging", 0.04, None),
        ("meadows", "frugal", "arid", 0.10, None),
        ("arid", "common", "barren", 0.08, None),
        ("arid", "barren", "desolate", 0.08, None),
        ("meadows", "desolate", "decaying", 0.15, None),
        ("forest", "desolate", "skeletal", 0.15, None),
        ("modest", "desolate", "creepy", 0.15, None),
        ("rock", "diligent", "stone", 0.12, None),
        ("stone", "unweary", "granite", 0.10, None),
        ("granite", "industrious", "mineral", 0.06, None),
        ("mineral", "wintry", "copper", 0.05, None),
        ("mineral", "marshy", "tin", 0.05, None),
        ("mineral", "meadows", "iron", 0.05, None),
        ("mineral", "modest", "lead", 0.05, None),
        ("mineral", "forest", "nickel", 0.05, None),
        ("nickel", "majestic", "silver", 0.05, None),
        ("iron", "majestic", "gold", 0.05, None),
        ("gold", "silver", "platinum", 0.03, None),
        ("mineral", "imperial", "lapis", 0.05, None),
        ("lapis", "tropical", "emerald", 0.05, None),
        ("emerald", "austere", "ruby", 0.05, None),
        ("emerald", "ocean", "sapphire", 0.05, None),
        ("ruby", "sapphire", "diamond", 0.03, None),
        ("austere", "rock", "unstable", 0.05, None),
        ("unstable", "rural", "nuclear", 0.05, None),
        ("unstable", "nuclear", "radioactive", 0.05, None),
        ("water", "diligent", "river", 0.10, None),
        ("water", "river", "ocean", 0.10, None),
        ("ocean", "shadowed", "ink", 0.08, None),
        ("valiant", "diligent", "sweet", 0.15, None),
        ("sweet", "rural", "sugary", 0.15, None),
        ("sweet", "sugary", "ripening", 0.05, None),
        ("ripening", "sweet", "fruity", 0.05, None),
        ("farmerly", "meadows", "alcohol", 0.10, None),
        ("farmerly", "water", "milk", 0.10, None),
        ("farmerly", "tropical", "coffee", 0.10, None),
        ("basalt", "fiendish", "tempered", 0.30, "hellish"),
        ("tempered", "demonic", "volcanic", 0.20, "hellish"),
        ("sinister", "tropical", "malicious", 0.10, None),
        ("malicious", "tropical", "infectious", 0.08, None),
        ("malicious", "infectious", "virulent", 0.08, None),
        ("exotic", "water", "viscous", 0.10, None),
        ("viscous", "exotic", "glutinous", 0.08, None),
        ("viscous", "glutinous", "sticky", 0.08, None),
        ("virulent", "sticky", "corrosive", 0.10, None),
        ("corrosive", "fiendish", "caustic", 0.08, None),
        ("corrosive", "caustic", "acidic", 0.04, None),
        ("cultivated", "valiant", "excited", 0.10, None),
        ("excited", "diligent", "energetic", 0.08, None),
        ("excited", "energetic", "ecstatic", 0.08, None),
        ("rock", "sinister", "shadowed", 0.10, None),
        ("shadowed", "rock", "darkened", 0.08, None),
        ("shadowed", "darkened", "abyssal", 0.08, None),
        ("noble", "diligent", "ancient", 0.10, None),
        ("ancient", "secluded", "primeval", 0.08, None),
        ("primeval", "ancient", "prehistoric", 0.08, None),
        ("prehistoric", "imperial", "relic", 0.08, None),
        ("ocean", "primeval", "oily", 0.08, None),
        ("oily", "industrious", "distilled", 0.08, None),
        ("mystical", "modest", "sorcerous", 0.10, None),
        ("mystical", "cultivated", "eldritch", 0.12, None),
        ("eldritch", "cultivated", "esoteric", 0.10, None),
        ("esoteric", "eldritch", "arcane", 0.08, None),
        ("eldritch", "forest", "charmed", 0.10, None),
        ("charmed", "eldritch", "enchanted", 0.08, None),
        ("charmed", "enchanted", "supernatural", 0.08, None),
    ]
    for a, b, result, chance, temp in rows:
        out.append({"a": a, "b": b, "result": result, "chance": chance, "temp": temp})
    for m in out:
        m["chance"] = round(m["chance"] * MUTATION_RATE, 4)
    return out


# "temp" : température que doit avoir la ruche pour que la mutation soit possible
MUTATIONS = _mutations()


def _items(category, rows):
    return {i: {"label": label, "category": category, "color": color, "sell": sell} for i, label, color, sell in rows}


ITEMS = {
    **_items("comb", [
        ("comb_honey", "Rayon de miel", "e8d56a", 0),
        ("comb_dripping", "Rayon ruisselant", "dc7613", 0),
        ("comb_stringy", "Rayon filandreux", "c8be67", 0),
        ("comb_cocoa", "Rayon de cacao", "674016", 0),
        ("comb_simmering", "Rayon frémissant", "981919", 0),
        ("comb_parched", "Rayon desséché", "dcbe13", 0),
        ("comb_powdery", "Rayon poudreux", "676767", 0),
        ("comb_silky", "Rayon soyeux", "508907", 0),
        ("comb_frozen", "Rayon gelé", "d8f4ff", 0),
        ("comb_mossy", "Rayon moussu", "2a3313", 0),
        ("comb_wheaten", "Rayon de blé", "feff8f", 0),
        ("comb_mellow", "Rayon moelleux", "886000", 0),
        ("comb_mysterious", "Rayon mystérieux", "e099ff", 0),
        ("comb_barren", "Rayon stérile", "736c44", 0),
        ("comb_rotten", "Rayon putride", "3e5221", 0),
        ("comb_rocky", "Rayon rocheux", "8c8c91", 0),
        ("comb_water", "Rayon humide", "2732cf", 0),
        ("comb_sweet", "Rayon sucré", "f58ec4", 0),
        ("comb_venomous", "Rayon venimeux", "7d187d", 0),
        ("comb_static", "Rayon électrisé", "d9eb34", 0),
        ("comb_shadow", "Rayon obscur", "33003d", 0),
        ("comb_fossil", "Rayon fossile", "58574b", 0),
        ("comb_oil", "Rayon huileux", "1a1a14", 0),
        ("comb_mystic", "Rayon arcanique", "5fd3c6", 0),
    ]),
    **_items("resource", [
        ("wax", "Cire d'abeille", "fceeac", 1),
        ("honeydew", "Miellat", "f2a03a", 3),
        ("propolis", "Propolis", "8a5a2b", 4),
        ("royal_jelly", "Gelée royale", "fff3c4", 15),
        ("pollen", "Pollen", "f4d03f", 8),
        ("refractory_wax", "Cire réfractaire", "9c8a6a", 5),
        ("phosphor", "Phosphore", "ff7a1a", 6),
        ("cocoa", "Cacao", "7b4a1e", 4),
        ("silk", "Fil de soie", "e9f5d0", 6),
        ("ice_shard", "Éclat de glace", "bdeeff", 5),
        ("wheat", "Blé", "e3c35b", 3),
        ("quartz", "Quartz", "f1e9e1", 10),
        ("gunpowder", "Poudre noire", "555555", 6),
        ("glowstone", "Poudre lumineuse", "ffe45c", 10),
        ("sugar", "Sucre", "ffffff", 3),
        ("bone", "Os", "e8e4d0", 3),
        ("clay", "Argile", "9ea4b0", 3),
        ("dye", "Pigment", "3b2f8f", 5),
        ("fruit", "Fruits", "d8344a", 6),
        ("mead", "Hydromel", "e0a030", 8),
        ("milk", "Lait", "f4f4f0", 6),
        ("coffee", "Café", "5a3a1c", 8),
        ("coal", "Charbon", "2b2b2b", 5),
        ("venom", "Venin", "9b2fae", 8),
        ("slime", "Mucus", "6fd36a", 5),
        ("acid", "Acide", "c8f02a", 10),
        ("energy", "Éclat d'énergie", "f7ff5e", 12),
        ("oil", "Pétrole", "22201a", 6),
        ("fuel", "Carburant", "c9a227", 10),
        ("amber", "Ambre", "e08a1e", 20),
        ("mana", "Essence arcanique", "7ae6ff", 15),
        ("copper", "Cuivre", "d16308", 12),
        ("tin", "Étain", "bdb1bd", 12),
        ("iron", "Fer", "a87058", 14),
        ("lead", "Plomb", "6f6a8a", 12),
        ("nickel", "Nickel", "d8cfa8", 14),
        ("silver", "Argent", "dbdbdb", 25),
        ("gold", "Or", "e6cc0b", 30),
        ("platinum", "Platine", "c9d6e0", 50),
        ("lapis", "Lapis-lazuli", "3d2cdb", 20),
        ("emerald", "Émeraude", "1ccf43", 40),
        ("ruby", "Rubis", "d60000", 40),
        ("sapphire", "Saphir", "0a47ff", 40),
        ("diamond", "Diamant", "7fe0fa", 80),
        ("uranium", "Uranium", "41cc2f", 60),
        ("ender_pearl", "Perle du Néant", "1c7a6e", 40),
        ("wood", "Bois", "9a6b3a", 2),
        ("precious_wood", "Bois précieux", "5a2a1a", 8),
        ("apple", "Pommes", "d83a2a", 3),
        ("cherry", "Cerises", "c2185b", 5),
        ("nut", "Noix", "8a6a3a", 6),
        ("chestnut", "Châtaignes", "6a3a1a", 6),
        ("lemon", "Citrons", "f4e04a", 8),
        ("plum", "Prunes", "6a3a8a", 8),
        ("papaya", "Papayes", "f08a2a", 10),
        ("dates", "Dattes", "8a4a1a", 10),
        ("maple_syrup", "Sirop d'érable", "c8741a", 10),
    ]),
    **_items("consumable", [
        ("labware", "Verrerie de laboratoire", "a8d8ea", 0),
    ]),
    **_items("module", [
        ("frame_untreated", "Cadre brut", "c9a36b", 0),
        ("frame_impregnated", "Cadre imprégné", "a6783c", 0),
        ("frame_proven", "Cadre éprouvé", "7a5222", 0),
        ("hive_automation", "Module d'élevage automatique", "b8c4cc", 0),
        ("alveary_heater", "Chauffage d'alvéaire", "e2572b", 0),
        ("alveary_fan", "Ventilateur d'alvéaire", "5bb8e8", 0),
        ("alveary_stabiliser", "Stabilisateur", "8f9aa3", 0),
        ("alveary_mutator", "Mutateur", "b04fd6", 0),
        ("alveary_production", "Module de production", "f0b429", 0),
        ("alveary_lifespan", "Module d'accélération", "4fd68c", 0),
        ("alveary_automation", "Module d'automatisation", "d9d9d9", 0),
    ]),
}

# Centrifugation : rayon -> [(sortie, chance, quantité)] ; "honey" est la monnaie
RECIPES = {
    "comb_honey": [("honey", 0.9, 3), ("wax", 1.0, 1)],
    "comb_dripping": [("honey", 0.4, 4), ("honeydew", 1.0, 1)],
    "comb_stringy": [("honey", 0.4, 4), ("propolis", 1.0, 1)],
    "comb_cocoa": [("honey", 0.5, 3), ("wax", 1.0, 1), ("cocoa", 0.5, 1)],
    "comb_simmering": [("honey", 0.5, 6), ("refractory_wax", 1.0, 1), ("phosphor", 0.7, 2)],
    "comb_parched": [("honey", 0.9, 4), ("wax", 1.0, 1)],
    "comb_powdery": [("honey", 0.5, 5), ("gunpowder", 0.2, 1)],
    "comb_silky": [("honey", 1.0, 5), ("silk", 0.8, 1)],
    "comb_frozen": [("honey", 0.7, 4), ("wax", 0.8, 1), ("pollen", 0.2, 1)],
    "comb_mossy": [("honey", 0.9, 4), ("wax", 1.0, 1)],
    "comb_wheaten": [("honey", 0.5, 3), ("wheat", 0.8, 1), ("wax", 0.2, 1)],
    "comb_mellow": [("honey", 0.6, 5), ("honeydew", 0.6, 1), ("quartz", 0.3, 1)],
    "comb_mysterious": [("honey", 0.4, 6), ("propolis", 1.0, 1), ("ender_pearl", 0.1, 1)],
    "comb_barren": [("honey", 0.5, 3), ("wax", 0.5, 1)],
    "comb_rotten": [("honey", 0.2, 2), ("bone", 0.6, 1)],
    "comb_rocky": [("honey", 0.5, 4), ("clay", 0.3, 1)],
    "comb_water": [("honey", 0.6, 4), ("clay", 0.2, 1)],
    "comb_sweet": [("honey", 1.0, 6), ("sugar", 0.4, 1)],
    "comb_venomous": [("honey", 0.3, 5), ("venom", 0.5, 1)],
    "comb_static": [("honey", 0.4, 6), ("energy", 0.3, 1)],
    "comb_shadow": [("honey", 0.4, 6), ("dye", 0.3, 1)],
    "comb_fossil": [("honey", 0.5, 6), ("coal", 0.4, 1), ("amber", 0.1, 1)],
    "comb_oil": [("honey", 0.3, 4), ("oil", 1.0, 1)],
    "comb_mystic": [("honey", 0.5, 7), ("wax", 0.5, 1), ("mana", 0.3, 1)],
}
# Centrifugation à la main : un rayon par geste (appui maintenu côté interface)
MANUAL_BATCH = 1

# Effets : production / lifespan / mutation sont des multiplicateurs, temp un décalage
MODULES = {
    "frame_untreated": {"frame": True, "effects": {"production": 1.4}, "desc": "Production ×1,4"},
    "frame_impregnated": {"frame": True, "effects": {"production": 1.8}, "desc": "Production ×1,8"},
    "frame_proven": {"frame": True, "effects": {"production": 2.2}, "desc": "Production ×2,2"},
    # "frame" signifie ici : se monte aussi dans un simple rucher
    "hive_automation": {"frame": True, "effects": {"automation": True}, "desc": "Récolte automatique ; à la mort de la reine, sa princesse est accouplée et réinstallée toute seule"},
    "alveary_heater": {"frame": False, "effects": {"temp": 1}, "desc": "Température +1 palier"},
    "alveary_fan": {"frame": False, "effects": {"temp": -1}, "desc": "Température −1 palier"},
    "alveary_stabiliser": {"frame": False, "effects": {"mutation": 0.0}, "desc": "Empêche toute mutation"},
    "alveary_mutator": {"frame": False, "effects": {"mutation": 2.0}, "desc": "Chance de mutation ×2"},
    "alveary_production": {"frame": False, "effects": {"production": 1.5}, "desc": "Production ×1,5"},
    "alveary_lifespan": {"frame": False, "effects": {"lifespan": 0.6}, "desc": "Durée de vie ×0,6 (générations plus rapides)"},
    "alveary_automation": {"frame": False, "effects": {"automation": True}, "desc": "Récolte et renouvellement de la reine automatiques"},
}

HIVE_TYPES = {
    "apiary": {"label": "Rucher", "slots": 2, "max_slots": 2, "frames_only": True, "production": 1.0},
    "alveary": {"label": "Alvéaire", "slots": 4, "max_slots": 8, "frames_only": False, "production": 1.2},
}
SLOT_COST = 400
SLOT_SCALE = 1.5

MACHINES = {
    "centrifuge": {"label": "Centrifugeuse automatique", "desc": "Traite 1 rayon par cycle, sans intervention."},
}

BEE_SELL = {"drone": 2, "princess": 10}
STARTER_HONEY = 30

_cheap = ["forest", "meadows"]
_uncommon = ["rock", "water", "basalt", "mystical"]
_rare = ["steadfast", "monastic", "ended"]


def _offers():
    out = []
    for s in HIVE_SPECIES + _uncommon + _rare:
        princess, drone = (25, 8) if s in _cheap else (400, 120) if s in _rare else (150, 50) if s in _uncommon else (60, 20)
        extra = {"min_species": 8} if s in _rare else {"min_species": 4} if s in _uncommon else {}
        out.append({"id": f"bee:{s}:princess", "kind": "bee", "species": s, "type": "princess", "honey": princess, **extra})
        out.append({"id": f"bee:{s}:drone", "kind": "bee", "species": s, "type": "drone", "honey": drone, **extra})
    out += [
        *[{"id": f"sapling:{t}", "kind": "sapling", "species": t, "honey": 30} for t in BASE_TREES],
        {"id": "plot", "kind": "plot", "honey": 150, "scale": 1.5, "free": STARTER_PLOTS},
        {"id": "hive:apiary", "kind": "hive", "hive_type": "apiary", "honey": 80, "scale": 1.5, "free": len(STARTER_BIOMES)},
        {"id": "hive:alveary", "kind": "hive", "hive_type": "alveary", "honey": 1200, "items": {"wax": 40, "honeydew": 10}, "scale": 1.4},
        {"id": "item:frame_untreated", "kind": "item", "item": "frame_untreated", "honey": 30, "items": {"wax": 3}},
        {"id": "item:frame_impregnated", "kind": "item", "item": "frame_impregnated", "honey": 120, "items": {"propolis": 5}},
        {"id": "item:frame_proven", "kind": "item", "item": "frame_proven", "honey": 400, "items": {"royal_jelly": 5}},
        {"id": "item:hive_automation", "kind": "item", "item": "hive_automation", "honey": 500, "items": {"wax": 20}},
        {"id": "item:alveary_heater", "kind": "item", "item": "alveary_heater", "honey": 300, "items": {"wax": 20}},
        {"id": "item:alveary_fan", "kind": "item", "item": "alveary_fan", "honey": 300, "items": {"wax": 20}},
        {"id": "item:alveary_production", "kind": "item", "item": "alveary_production", "honey": 600, "items": {"honeydew": 10}},
        {"id": "item:alveary_lifespan", "kind": "item", "item": "alveary_lifespan", "honey": 600, "items": {"pollen": 10}},
        {"id": "item:alveary_stabiliser", "kind": "item", "item": "alveary_stabiliser", "honey": 500, "items": {"propolis": 10}},
        {"id": "item:alveary_mutator", "kind": "item", "item": "alveary_mutator", "honey": 800, "items": {"phosphor": 10}},
        {"id": "item:alveary_automation", "kind": "item", "item": "alveary_automation", "honey": 1000, "items": {"wax": 20, "propolis": 20}},
        {"id": "machine:centrifuge", "kind": "machine", "machine": "centrifuge", "honey": 250, "items": {"wax": 10}, "scale": 1.6},
        {"id": "unlock:genetics", "kind": "unlock", "unlock": "genetics", "honey": 2000, "items": {"wax": 30, "propolis": 15}, "min_species": 6},
        {"id": "item:labware", "kind": "item", "item": "labware", "honey": 20, "requires_unlock": "genetics"},
    ]
    return {o["id"]: o for o in out}


OFFERS = _offers()

IMPRINT_HONEY_PER_GENE = 50
SHOWCASE_MAX_ENTRIES = 12


def public_content() -> dict:
    return {
        "temps": TEMPS,
        "temp_labels": TEMP_LABELS,
        "biomes": BIOMES,
        "chromosomes": CHROMOSOMES,
        "alleles": ALLELES,
        "species": SPECIES,
        "mutations": MUTATIONS,
        "items": ITEMS,
        "recipes": RECIPES,
        "manual_batch": MANUAL_BATCH,
        "modules": MODULES,
        "hive_types": HIVE_TYPES,
        "machines": MACHINES,
        "offers": list(OFFERS.values()),
        "bee_sell": BEE_SELL,
        "imprint_honey_per_gene": IMPRINT_HONEY_PER_GENE,
        "showcase_max_entries": SHOWCASE_MAX_ENTRIES,
        "garden": public_garden(),
    }
