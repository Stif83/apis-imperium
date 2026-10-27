"""Succès : événements débloqués une seule fois par des actions du joueur.

Depuis les trophées, un succès ne paie plus rien lui-même : les trophées du Carnet comptent ces
événements et versent les récompenses. La colonne « miel » reste la récompense du trophée secret.

Les succès secrets (easter eggs) restent cachés dans l'interface tant qu'ils ne sont pas obtenus.
Règle de compatibilité : les identifiants sont stockés dans les sauvegardes, on ne les renomme pas.
"""

import time

# id : (nom, description, icône, secret, miel)
ACHIEVEMENTS = {
    # Premiers pas
    "first_install": ("Premier couple", "Installer une reine dans une ruche.", "👑", False, 20),
    "first_harvest": ("Première récolte", "Récolter une ruche.", "🍯", False, 20),
    "first_mutation": ("Ça mute !", "Découvrir une espèce par croisement.", "🧬", False, 50),
    "first_manual": ("Huile de coude", "Centrifuger un rayon à la main.", "💪", False, 10),
    # Récolte et usine
    "combs_100": ("Bonne saison", "Récolter 100 rayons.", "⬢", False, 100),
    "combs_1000": ("Grande saison", "Récolter 1 000 rayons.", "⬢", False, 500),
    "combs_10000": ("Saison légendaire", "Récolter 10 000 rayons.", "⬢", False, 3000),
    "manual_100": ("Mains en or", "Centrifuger 100 rayons à la main.", "🖐️", False, 300),
    "honey_10k": ("Pot de miel", "Gagner 10 000 miel au total.", "🍯", False, 500),
    "honey_100k": ("Fortune dorée", "Gagner 100 000 miel au total.", "💰", False, 3000),
    # Élevage
    "generation_10": ("Lignée solide", "Avoir une reine de 10e génération.", "🌳", False, 200),
    "generation_50": ("Dynastie", "Avoir une reine de 50e génération.", "🏰", False, 1500),
    "hybrid": ("Sang mêlé", "Posséder une abeille hybride.", "🔀", False, 50),
    "pure_stability": ("Lignée immaculée", "Posséder une abeille de stabilité « Pure ».", "🛡️", False, 500),
    "chaotic_stability": ("Chaos ambulant", "Posséder une abeille de stabilité « Chaotique ».", "🎲", False, 300),
    "drones_100": ("Marchand de bourdons", "Vendre 100 faux-bourdons.", "🛒", False, 100),
    # Monde
    "storm_worker": ("Brave la tempête", "Avoir une ruche au travail pendant un orage.", "⛈️", False, 150),
    "night_worker": ("Équipe de nuit", "Avoir une ruche au travail la nuit.", "🌙", False, 100),
    "snow_worker": ("Abeille des neiges", "Avoir une ruche au travail sous la neige.", "❄️", False, 150),
    "all_biomes": ("Globe-trotteuse", "Posséder une ruche dans chaque biome.", "🗺️", False, 400),
    "full_alveary": ("Tour de miel", "Agrandir un alvéaire au maximum.", "🗼", False, 800),
    "first_robo": ("Rouages et pollen", "Faire évoluer un alvéaire en robo-ruche.", "🤖", False, 1500),
    # Laboratoire
    "first_extract": ("Échantillon", "Extraire un premier gène.", "🧪", False, 50),
    "first_imprint": ("Docteur Abeille", "Imprimer des gènes sur une abeille.", "🔬", False, 100),
    # Communauté
    "first_showcase": ("Vernissage", "Publier une vitrine.", "🖼️", False, 50),
    "liked_10": ("Coup de cœur", "Recevoir 10 « j'aime » sur ses vitrines.", "💛", False, 300),
    # Secrets
    "konami": ("Code secret", "Entrer un certain code bien connu des joueurs.", "🎮", True, 99),
    "buzz": ("Bzzzzz", "Taquiner l'abeille du logo un peu trop longtemps.", "🐝", True, 42),
    "lost": ("Perdue ?", "S'égarer hors des sentiers battus.", "🧭", True, 40),
    "maya": ("Une abeille célèbre", "Donner à une ruche le nom d'une abeille de dessin animé.", "📺", True, 77),
    "midnight": ("Minuit pile", "Passer au rucher à minuit, heure du jeu.", "🕛", True, 120),
    "insomniac": ("Insomnie", "Jouer entre 3 h et 4 h du matin, pour de vrai.", "🦉", True, 60),
    "rescued": ("Coup de pouce", "Accepter l'aide d'un voisin apiculteur.", "🤝", True, 10),
    "broke": ("Fauché", "Tomber à zéro miel.", "🕳️", True, 25),
}

# Secrets déclenchés par l'interface (le serveur ne peut pas les observer lui-même ;
# « insomniac » dépend de l'heure locale du joueur, que seul le navigateur connaît)
CLIENT_SECRETS = {"konami", "buzz", "lost", "insomniac"}

# Noms de ruche qui déclenchent le succès « maya »
FAMOUS_BEES = {"maya", "willy", "barry", "barry b. benson", "bumblebee", "abeille maya"}


def public_achievements() -> list[dict]:
    return [
        {"id": aid, "label": label, "desc": desc, "icon": icon, "secret": secret, "honey": honey}
        for aid, (label, desc, icon, secret, honey) in ACHIEVEMENTS.items()
    ]


def unlock(player, achievement_id: str) -> bool:
    """Débloque un succès (une seule fois). Renvoie True s'il est nouveau."""
    if achievement_id not in ACHIEVEMENTS:
        return False
    got = dict(player.achievements or {})
    if achievement_id in got:
        return False
    got[achievement_id] = int(time.time() * 1000)
    player.achievements = got
    return True


def record(player, stat: str, value: int) -> int:
    """Garde le maximum atteint d'une statistique (génération de reine la plus haute…)."""
    stats = dict(player.stats or {})
    stats[stat] = max(stats.get(stat, 0), value)
    player.stats = stats
    return stats[stat]


def bump(player, stat: str, n: int = 1) -> int:
    """Incrémente un compteur de statistiques et renvoie sa nouvelle valeur."""
    stats = dict(player.stats or {})
    stats[stat] = stats.get(stat, 0) + n
    player.stats = stats
    return stats[stat]
