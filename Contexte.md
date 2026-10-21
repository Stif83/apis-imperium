Stack logiciel :

Next.js front
Python backend
keycloak
cluster okd

Jeu :

On est un apiculteur et on doit s'occuper de faire du miel et des croisements d'abeilles.
Pour cela base toi sur le mod minecraft gendusty et foresty
Je veux un magasin ou l'on peut acheter des abeilles de base, des ruches pour mettre les abeilles reine et les drones dedans. Je veux une partie usine ou au debut on recupere les combs des ruches et on les process a la main pour faire du miel et d'autres ressouces en fonction du breed de l'abeille et ensuiteon peut automatiser. la monnaie de base est le miel.
Je veux aussi une partie genetique ou on peut extraire les genes pas disonible tout de suite des le debut
mettre en place des ruches superieur que l'on peut custom comme des alveary et automatiser.
Je veux des images d'abeille comme forestry( si tu ne peux pas les faire dis le moi et je trouverais une autre methode sinon recuprer les image du mod forestry )
Je veux une page jardin aussi ou on peut faire des croisements d'arbres et ensuite reucprer des papillons (plus tard les papillon et les arbres)
Aussi un onglet communautaire pour partqger avec les autres utilisateurs nos vitrines d'abeilles, arbres et papillons

Lien utile :

https://github.com/ForestryMC/ForestryMC
https://github.com/ForestryMC/Binnie
https://github.com/ForestryMC/MagicBees

Fait en sort de construire le logiciel pour permettres des mises a jour sans perte de donnees.
Il faut aussi cree des images docker complete sans pull vers quay car mon infra de prod est isolee

pose moi des question si tu as un doute

---

# Journal de bord (tenu par Claude)

Dernière mise à jour : 2026-10-10 — version 0.1 (première itération jouable).

## Lancer le jeu en local

```
docker compose up -d --build        # jeu : http://localhost:3000 — Keycloak : http://localhost:8080
```

- Le port 3000 est déjà pris sur ce poste par une autre application (« Royaumes Éternels »).
  Utiliser `APP_PORT=3100` (PowerShell : `$env:APP_PORT=3100; docker compose up -d`). L'URL du jeu
  est inscrite dans le realm Keycloak à sa création : choisir le port avant le premier démarrage,
  ou repartir de zéro avec `docker compose down -v` (efface les données locales).
- Les comptes se créent par le lien « S'inscrire » de la page de connexion Keycloak.
  Console d'administration Keycloak : admin / admin (valeurs de développement uniquement).
- `AUTH_MODE=dev` (sur backend et frontend) remplace Keycloak par un simple pseudo. Pratique
  pour développer, à ne jamais activer en production.
- Tests du moteur de jeu : `pip install -r backend/requirements-dev.txt` puis `pytest` dans `backend/`.

## Ce qui est en place

| Demande | État |
|---|---|
| Next.js / Python / Keycloak / OKD | Fait : `frontend/`, `backend/` (FastAPI + PostgreSQL), `keycloak/`, `deploy/okd/` |
| Élevage et croisements façon Forestry | Fait : 33 espèces, 5 chromosomes (espèce, vitesse, longévité, fertilité, tolérance climatique), allèles actif/inactif, dominance, mutations |
| Boutique (abeilles de base, ruches) | Fait : 6 espèces de base + 2 rares, ruchers, alvéaires, cadres, modules, revente des ressources |
| Usine : rayons traités à la main puis automatisés | Fait : centrifugation manuelle (5 rayons max par geste), centrifugeuses automatiques achetables |
| Miel comme monnaie | Fait |
| Génétique, verrouillée au début | Fait : laboratoire à débloquer (2000 miel + ressources + 6 espèces découvertes), extraction de gènes, banque, impression |
| Ruches supérieures personnalisables et automatisables | Fait : alvéaire à 4–8 emplacements, modules chauffage, ventilateur, production, accélération, stabilisateur, mutateur, automatisation |
| Images d'abeilles | Fait autrement : sprites dessinés par moi (voir ci-dessous) |
| Jardin (arbres, papillons) | Page d'attente seulement, comme demandé (« plus tard ») |
| Onglet communautaire | Fait pour les abeilles : vitrines, mentions « j'aime » |
| Mises à jour sans perte de données | Fait : voir « Mises à jour » |
| Images Docker complètes, sans quay | Fait : voir « Images Docker » |

En plus : un onglet **Apidex** (espèces découvertes, mutations connues) et une aide de secours si
le joueur se retrouve sans abeille ni miel.

## Directions prises et pourquoi

- **Simulation « paresseuse » côté serveur.** Rien ne tourne en tâche de fond : à chaque requête,
  le serveur rejoue les cycles écoulés depuis la dernière visite (plafond : 24 h). On obtient la
  progression hors-ligne gratuitement, et aucune triche possible côté navigateur. Un cycle dure 5 s
  (`CYCLE_SECONDS`), une reine vit 10 à 70 cycles.
- **Climat.** Chaque ruche est posée dans un biome (prairie, taïga, toundra, jungle, désert) et
  chaque espèce exige une température. Le palier « Infernal » n'existe dans aucun biome : il faut un
  alvéaire dans le désert avec un chauffage. C'est ce qui remplace le Nether de Forestry et donne
  son intérêt à l'alvéaire (branche Sinistre → Diabolique → Démoniaque).
- **Génétique simplifiée par rapport à Gendustry.** Un gène extrait est acquis définitivement ;
  chaque opération consomme une verrerie. Pas d'ADN liquide, de protéines ni de gabarits.
- **Tous les gènes sont visibles** sans analyseur (pas de Beealyzer).
- **Contenu en données.** Espèces, mutations, recettes et prix sont dans un seul fichier,
  `backend/app/game/content.py`. Ajouter les abeilles de MagicBees ou d'ExtraBees revient à y
  ajouter des lignes.
- **Un seul point d'entrée web.** Le navigateur ne parle qu'au frontend, qui relaie `/api` vers le
  backend. Une seule Route publique pour le jeu, pas de CORS.
- **Configuration à l'exécution.** Aucune URL n'est figée dans les images : la même image sert le
  poste de développement et la production.

### Écarts volontaires avec Forestry (à corriger si tu y tiens)

- Les caractéristiques par défaut des espèces et quelques mutations sont de mémoire, pas recopiées
  du code source : je n'ai pas consulté les trois dépôts GitHub pendant cette itération.
- Inébranlable et Monastique s'achètent en boutique (dans Forestry : coffres de donjon, villageois).
  La Vaillante et la branche de l'End ne sont pas incluses.
- Les cadres ne s'usent pas. Pas de fleurs, d'humidité, de territoire ni d'effets d'abeilles.
- L'équilibrage (prix, rendements, durées) est un premier jet jamais éprouvé sur une vraie partie.

## Images d'abeilles

J'ai dessiné un sprite 16×16 en SVG, teinté par les deux couleurs de chaque espèce (le même
principe que Forestry), avec une couronne pour les reines et un diadème pour les princesses. Je n'ai
pas récupéré les textures de Forestry : je n'ai pas vérifié sous quelle licence elles sont
distribuées, et le code du mod étant sous LGPL, ça ne dit rien des images. Si tu préfères les
vraies textures, tout passe par un seul composant, `frontend/components/BeeIcon.tsx`.

## Mises à jour sans perte de données

- Toutes les données (jeu et comptes Keycloak) sont dans PostgreSQL, sur un volume persistant.
  Les autres conteneurs sont sans état et se remplacent librement.
- Le schéma est versionné avec Alembic (`backend/alembic/versions/`). Le backend applique les
  migrations manquantes à chaque démarrage, sous verrou.
- **Règle à respecter :** on n'efface ni ne renomme jamais un identifiant de `content.py` (espèce,
  allèle, objet, module), car les sauvegardes y font référence. On peut en ajouter sans limite.
- Un génome enregistré avant l'ajout d'un chromosome est complété automatiquement à la lecture.
- Le realm Keycloak n'est importé que s'il n'existe pas : une mise à jour ne l'écrase pas.
- Changement de schéma : modifier `backend/app/models.py`, puis
  `alembic revision --autogenerate -m "..."` dans `backend/`, relire le fichier généré.
- Aucune sauvegarde de la base n'est en place : à prévoir côté infra (`pg_dump` planifié).

## Images Docker et infra isolée

Comment j'ai compris « sans pull vers quay » : la production ne peut rien télécharger, donc chaque
image doit tout contenir, et aucune ne doit dépendre de quay.io.

- Quatre images : `apiculteur/postgres`, `keycloak`, `backend`, `frontend`.
- Bases tirées de Docker Hub uniquement (`python:3.12-slim`, `node:22-alpine`, `postgres:16`,
  `eclipse-temurin:21-jre`). L'image officielle de Keycloak étant distribuée sur quay.io, je la
  reconstruis depuis l'archive publiée sur GitHub (Keycloak 26.0.7).
- Le frontend n'appelle aucune ressource externe (ni police, ni CDN).
- Les images tournent sans root et acceptent l'UID arbitraire imposé par OKD.

Procédure : voir « Déploiement réalisé » plus bas (elle a été suivie pour de vrai).

## Vérifié / non vérifié

Vérifié sur ce poste :

- 12 tests automatiques du moteur de jeu (génétique, mutations, cycle de vie d'une ruche, climat,
  alvéaire automatisé + usine, boutique, génétique, vitrines) : tous passent.
- Le frontend compile ; les quatre images se construisent.
- La pile complète démarre avec `docker compose` ; la migration s'applique sur PostgreSQL.
- Parcours Keycloak réel, par script : connexion PKCE, jeton, lecture de l'état et installation
  d'une reine via le frontend. Un jeton altéré et l'en-tête de développement sont refusés.

Non vérifié :

- (Mis à jour plus bas : interface, manifestes OKD et script de construction ont depuis été vérifiés.)
- Les images n'ont pas été lancées sous un UID arbitraire comme le fera OKD.
- La pile locale garde un compte `testeur` (mot de passe `testeur-123`). Pour l'effacer : `docker compose down -v`.

## Retour d'expérience

- Le dossier est dans OneDrive : `node_modules` et un environnement virtuel Python y seraient
  synchronisés fichier par fichier. J'ai compilé et testé hors du dossier. Pour développer
  confortablement, déplacer le projet hors de OneDrive ou passer uniquement par Docker.
- Keycloak marque ses cookies « Secure » même en HTTP. Un navigateur les accepte sur `localhost`,
  mais pas sur une autre adresse en HTTP simple : en dehors de `localhost`, il faut du HTTPS.
- Le projet n'est pas encore un dépôt git. Un `.gitignore` est prêt.

## Demande du 2026-10-10 (2) : Apis Imperium, déploiement OKD, zéro pull

- Le jeu s'appelle désormais **Apis Imperium** : titre, en-tête, écran de connexion, nom affiché
  du realm. Les identifiants techniques restent `apiculteur` (realm, base, noms d'images locaux) :
  ils sont invisibles pour le joueur et les renommer sans pouvoir retester était un risque inutile.
  L'image frontend doit être reconstruite pour que le nouveau nom apparaisse.
- Namespace `apps-apisimperium` : créé par `deploy/okd/namespace.yaml`, et les images pointent
  vers `image-registry.openshift-image-registry.svc:5000/apps-apisimperium/...`.
- « Plus de pull » : `imagePullPolicy: IfNotPresent` partout, et les seules images utilisées sont
  les quatre de l'archive, poussées une fois dans le registre interne du cluster. Aucun registre
  externe n'est contacté au déploiement. Un pod OKD ne peut pas démarrer sans que son nœud lise
  l'image quelque part : le registre interne est ce « quelque part ».


### Déploiement réalisé (2026-10-10)

Le jeu tourne sur le cluster `okd.lab.local`, namespace `apps-apisimperium` :

- Jeu : https://apisimperium.apps.okd.lab.local
- Authentification : Keycloak partagé du cluster, realm `okd` (voir « Passage au realm okd » plus bas).
- Mot de passe de la base généré aléatoirement, stocké uniquement dans le Secret `apiculteur-secrets`.

Procédure suivie, à refaire pour chaque nouvelle version (remplacer 1.0.0) :

1. `.\scriptsuild-images.ps1 -Tag 1.0.0` → `distpiculteur-images-1.0.0.tar` (678 Mo). C'est la
   seule étape qui a besoin d'Internet.
2. Pousser l'archive dans le registre interne, sans Docker ni registre externe :
   `python scripts/push-images.py dist/apiculteur-images-1.0.0.tar default-route-openshift-image-registry.apps.okd.lab.local apps-apisimperium --ca-file ca.crt`
   avec `REGISTRY_TOKEN` = jeton de session OKD, et `ca.crt` = autorité du routeur
   (`kubectl get configmap default-ingress-cert -n openshift-config-managed -o jsonpath="{.data.ca-bundle\.crt}"`).
3. Changer `newTag` dans `deploy/okd/kustomization.yaml`, puis `kubectl apply -k deploy/okd`.

Vérifié sur le cluster : les quatre pods sont prêts et utilisent uniquement les images du registre
interne (`IfNotPresent`) ; connexion Keycloak réelle, lecture de l'état et installation d'une reine
par les Routes HTTPS ; les données survivent à un redémarrage de PostgreSQL. Le compte créé pour
ce test a été supprimé (Keycloak et base du jeu).

Vérifié dans un navigateur, sur la pile locale : connexion Keycloak, récolte, accouplement,
centrifugation (miel 30 → 45), et affichage de tous les onglets, sans erreur console.

Reste non vérifié :

- L'interface dans un navigateur **sur le cluster** : le certificat du routeur n'est pas reconnu
  par ce poste. Il faudra accepter l'avertissement sur les **deux** adresses (jeu et Keycloak),
  sinon la connexion échoue silencieusement.
- Génétique, alvéaire et vitrines n'ont été essayés que par les tests automatiques, pas à la souris.

Retour d'expérience de ce déploiement :

- Docker Desktop refuse le certificat du registre du cluster ; plutôt que de modifier la
  configuration de Docker, `push-images.py` envoie l'archive directement (Python standard).
- La première initialisation de PostgreSQL sur NFS prend environ 2 minutes ; backend et Keycloak
  redémarrent quelques fois en l'attendant, c'est normal. La sonde de PostgreSQL a été corrigée
  pour ne plus se déclarer prête pendant cette phase.
- `oc` n'est pas installé sur ce poste : tout a été fait avec `kubectl`.
- L'archive est dans `dist/`, donc dans OneDrive (678 Mo synchronisés). À déplacer si ça gêne.
- La pile locale de test a été arrêtée (`docker compose down`, données locales conservées).
- Aucune sauvegarde de la base n'est en place, et le volume NFS est en politique `Delete` :
  supprimer le PVC ou le namespace efface toutes les parties.

## Demande du 2026-10-10 (3) : utiliser le realm existant

J'avais déployé un Keycloak propre au jeu, avec son realm `apiculteur`. Ce n'était pas voulu : le
cluster a déjà un Keycloak (namespace `keycloak`) et un realm `okd`. J'ai compris « realm ok »
comme `okd`, seul realm existant hors `master`.

Fait :

- Supprimé du namespace du jeu : le Keycloak (Deployment, Service, Route, image dans le registre),
  son realm et sa base de données. Il ne contenait aucun compte réel.
- Créé dans le realm `okd` un client public `apisimperium-web` (PKCE, redirection limitée à
  l'adresse du jeu), sur le modèle de `royaume-web`. C'est la seule modification faite au Keycloak
  partagé ; rien d'autre n'y a été touché.
- Le jeu pointe sur `https://keycloak-service-keycloak.apps.okd.lab.local`, realm `okd`. Le backend
  lit les clés publiques par le réseau interne (`keycloak-service.keycloak.svc:8080`).
- La production n'a plus que trois images (postgres, backend, frontend). `build-images.ps1`
  n'exporte plus celle de Keycloak, qui ne sert qu'au développement local (`docker compose`).
  L'ancien manifeste est conservé dans `deploy/okd-keycloak-autonome/` au cas où.

Vérifié sur le cluster : connexion par le realm `okd`, jeton, lecture de l'état et installation
d'une reine ; jeton altéré refusé. Le compte temporaire créé pour ce test a été supprimé.

À savoir :

- L'inscription libre est **fermée** dans le realm `okd`, qui ne contient qu'un utilisateur. Les
  autres joueurs devront être créés dans Keycloak, ou l'inscription ouverte sur ce realm — c'est
  un choix qui touche aussi tes autres applications, donc je n'y ai pas touché.
- Tout utilisateur du realm `okd` peut jouer : il n'y a pas de rôle réservé au jeu.
- L'archive `dist/apiculteur-images-1.0.0.tar` contient encore l'image Keycloak, devenue inutile.

## Demande du 2026-10-10 (4) : version 1.1.0, déployée sur le cluster

- **Arbre des mutations dans l'Apidex.** Arbre complet (les 113 espèces, rangées par niveau) ou
  « lignée de l'abeille choisie » (tous ses ancêtres et ses mutations directes). Un clic sur une
  abeille surligne ses parents en bleu et ses mutations futures en jaune, et ouvre une fiche avec
  les croisements et leurs chances. Les abeilles de la fiche sont cliquables pour naviguer.
- **Anonymisation.** Une espèce non découverte n'affiche ni nom, ni branche, ni couleurs : silhouette
  et « ??? » partout dans l'Apidex. Limite connue : c'est l'interface qui masque ; le navigateur
  reçoit quand même la liste complète, donc un joueur curieux peut la lire avec les outils de
  développement. Filtrer côté serveur est faisable si ça compte pour toi.
- **113 espèces** (33 auparavant), 119 mutations, 13 nouveaux rayons, 32 nouvelles ressources.
  Ajouts inspirés du reste de Forestry (Néant, festives, vengeresses), d'ExtraBees (minérales,
  métalliques, gemmes, aquatiques, venimeuses, fossiles…) et de MagicBees (arcaniques, enchantées).
  Noms, couleurs, caractéristiques et croisements sont **de mémoire et adaptés**, pas recopiés des
  mods. Nouvelles espèces de boutique : Rocheuse, Aquatique, Basaltique, Mystique, Du Néant.
- **Taux de mutation divisés par deux** (`MUTATION_RATE = 0.5` dans `content.py`) : Commune passe de
  15 % à 7,5 %, etc. Un seul nombre à changer pour régler ça.
- **Centrifugation manuelle** : un seul bouton à maintenir 3 secondes par rayon ; tant qu'il reste
  enfoncé, un rayon part toutes les 3 secondes. Plus de « ×5 ». Limite connue : le délai est tenu
  par l'interface, pas par le serveur.
- **Ruches** : affichage allégé (nom, biome, reine avec barre de vie, récolte ; modules, gènes et
  retrait de la reine repliés sous « Réglages »). Clic sur le nom pour renommer.
- **Une ruche par biome** : un nouveau joueur reçoit 5 ruchers (prairie, taïga, toundra, jungle,
  désert). Le biome d'une ruche est désormais fixe : le déplacement payant est supprimé. Les comptes
  existants reçoivent automatiquement les biomes qui leur manquent, et gardent leurs ruches
  actuelles (ton compte aura donc deux ruchers en prairie). L'Hivernale tolère maintenant ± 1
  palier, pour que le rucher de taïga serve dès le début.
- La Héroïque s'obtient désormais par Inébranlable + Vaillante (comme dans Forestry).

Vérifié : 13 tests automatiques ; dans un navigateur sur la pile locale, le rucher, le renommage,
l'arbre complet et la lignée, et le bouton à maintenir (rien à 1,5 s, deux rayons en 6,8 s).
Sur le cluster : images 1.1.0 poussées et déployées, pods prêts, l'API sert bien 113 espèces.

Non vérifié : l'interface 1.1.0 dans un navigateur sur le cluster (certificat) ; l'équilibrage
des 80 nouvelles espèces, jamais joué ; l'arbre complet sur petit écran (il défile, mais reste dense).

## Demande du 2026-10-10 (5) : version 1.2.0, déployée sur le cluster

- **Deux ruches au départ**, les autres s'achètent en boutique en choisissant le biome (80 miel,
  puis ×1,5 à chaque achat). La règle « une ruche par biome offerte » de la 1.1.0 est retirée.
  Choix à confirmer : la demande disait « 2 ruches taïga », j'ai mis **2 ruches en prairie**, parce
  que les abeilles de départ (Sylvestre, Des prés) exigent un climat tempéré et ne travailleraient
  pas en taïga. Pour changer : `STARTER_BIOMES` dans `content.py`.
- **Couleurs** : chaque ruche porte la couleur de son biome (liseré, icône, nom du biome) ;
  l'alvéaire a une icône à un étage de plus.
- **Module d'élevage automatique** (boutique, 500 miel + 20 cire) : se monte dans un simple
  rucher. Récolte automatique, et à la mort de la reine sa princesse est accouplée avec un de ses
  faux-bourdons puis réinstallée. Il occupe un des deux emplacements du rucher.
- Compte existant `nathan` : **non modifié**. Il a 7 ruches (3 en prairie, dont une achetée, et les
  4 biomes offerts par la 1.1.0), dont plusieurs avec une reine ; je n'ai rien supprimé. Conséquence :
  son prochain rucher coûte plus cher (le prix dépend du nombre de ruches possédées).

Vérifié : 14 tests automatiques (dont l'automatisation dans un rucher simple et l'achat de ruches) ;
rucher et boutique dans un navigateur en local ; 1.2.0 déployée, pods prêts, l'API du cluster
propose bien le nouveau module. Non vérifié : l'interface sur le cluster dans un navigateur.

## Demande du 2026-10-10 (6) : compte réinitialisé, jardin (version 1.3.0, déployée)

- **Compte `nathan` réinitialisé** sur le cluster : sa partie a été supprimée (ruches, abeilles,
  inventaire, découvertes). Elle est recréée avec le kit de départ à la connexion suivante. Le
  compte Keycloak n'est pas touché.
- **Jardin jouable.** Même principe que les ruches : on plante une pousse dans une parcelle et on
  la pollinise avec une autre. L'arbre grandit (1 à 5 minutes selon son gène de croissance), puis
  la récolte donne du bois, des fruits, et 2 à 4 pousses qui héritent des deux parents, avec une
  chance de mutation vers une nouvelle espèce.
  - 26 arbres (6 de base en boutique, 20 par croisement), 4 chromosomes (espèce, croissance,
    rendement, pousses), 20 croisements. Départ : 2 parcelles, 2 pousses de Chêne et 2 de Bouleau.
  - 20 papillons à collectionner : chaque arbre attire certaines espèces, avec une chance d'en
    trouver un à la récolte. Ils se vendent ou s'exposent. Ils n'ont pas de génétique ni d'élevage
    (pas de chenilles) : c'est une collection, pas encore un troisième système de croisement.
  - Espèces inconnues anonymisées comme dans l'Apidex. Les croisements d'arbres connus sont en
    liste simple, sans arbre graphique.
  - Boutique : section « Jardin » (pousses de base à 30 miel, parcelles à 150 miel puis ×1,5).
  - Communauté : les vitrines acceptent maintenant abeilles, pousses d'arbres et papillons.
- Technique : nouvelle table `plots` (migration `0002`, appliquée sans perte sur le cluster) ; le
  moteur génétique est commun aux abeilles et aux arbres (`genetics.py`, paramètre `kind`) ; le
  contenu du jardin est dans `backend/app/game/garden.py`. Les comptes créés avant le jardin
  reçoivent automatiquement leurs 2 parcelles et leurs pousses de départ.
- Arbres, croisements et papillons sont inspirés de Forestry **de mémoire**, équilibrage jamais joué.
- Le climat n'intervient pas au jardin, et les abeilles ne pollinisent pas les arbres : jardin et
  rucher sont pour l'instant deux systèmes séparés qui partagent seulement le miel et la boutique.

Vérifié : 17 tests automatiques (dont un cycle complet du jardin, la mutation Chêne + Bouleau →
Tilleul et la capture de papillons) ; dans un navigateur en local : planter, attendre, récolter,
boutique, vitrine avec une pousse. Sur le cluster : 1.3.0 déployée, migration `0002` passée, l'API
sert 26 arbres et 20 papillons. Non vérifié : l'interface sur le cluster dans un navigateur.

À savoir : chaque livraison redémarre aussi PostgreSQL (son image change de numéro même si son
contenu est identique), soit quelques dizaines de secondes d'interruption du jeu.

## Demande du 2026-10-18 : s'inspirer d'APICO (version 1.4.0, non déployée)

Source : les fichiers de données d'APICO installés sur ce poste (`E:\SteamLibrary\steamapps\common\APICO\json`,
lisibles sans décompilation). J'en ai repris des **mécaniques**, pas les noms, textes ni images :
toutes les nouvelles espèces sont inventées pour Apis Imperium.

- **Horloge et météo du monde** (`backend/app/game/world.py`) : une journée de jeu = 24 minutes,
  communes à tous les joueurs. Météo par tranche de 6 heures de jeu : beau temps, pluie, orage ;
  neige dans la taïga et la toundra ; jamais de pluie dans le désert. Calculées depuis l'heure
  réelle : rien de stocké, rien en tâche de fond. Horloge affichée dans l'en-tête, météo sur
  chaque ruche.
- **Trois nouveaux chromosomes**, ajoutés automatiquement aux génomes existants :
  - Activité (diurne, nocturne, crépusculaire, jour et nuit) : une reine ne produit que pendant
    ses heures (production ×2 pendant ce temps, pour compenser) ; elle vieillit quand même.
  - Intempéries : sans le gène « Résiste », pas de production sous la pluie ou la neige.
  - Stabilité : multiplie les chances de mutation de la reine (de ×2,5 « Chaotique » à ×0 « Pure »).
  Quelques espèces existantes ont reçu des valeurs à thème (marécageuses et aquatiques résistantes,
  Néant et Ténébreuses nocturnes, Monastiques stables, Nucléaires instables…).
- **Nouveaux modules** (boutique, montables dans un simple rucher) : Lanterne (travail à toute heure),
  Abri (travail par tous les temps).
- **Mutations à condition**, vérifiées au moment où la reine meurt : heure, phase du jour, météo,
  biome, module, ruche automatisée, arbre planté au jardin, nombre de ruches occupées, nombre de
  centrifugeuses, nombre de papillons ou d'espèces découverts, gène de la reine. Texte lisible dans
  l'Apidex (`cond_text`).
- **168 espèces** (+55, en 16 nouvelles branches : Nocturnes, Solaires, Aurorales, Pluviales, Orageuses,
  Neigeuses, Terroirs, Florales, Sociales, Recluses, Mécaniques, Chaotiques, Harmonieuses,
  Temporelles, Célestes, Légendaires), **186 mutations** dont 70 à condition, 9 rayons et 14 ressources.
  Ultime espèce : Apis Imperatrix (160 espèces découvertes et 8 ruches occupées).
- **Carnet de l'apiculteur** (nouvel onglet) : 74 objectifs avec récompense (paliers d'espèces,
  chaque branche complète, ruches, arbres, papillons, gènes). Colonne `players.claimed`, migration `0003`.

Vérifié : 22 tests automatiques (dont horloge, mutations à condition, stabilité, statut des ruches,
objectifs) ; toutes les espèces sont atteignables depuis la boutique ; le frontend compile ;
migrations 0001→0003 appliquées sur une base neuve ; dans un navigateur en local (mode dev) :
Rucher, Carnet, Apidex sans erreur console.

Non vérifié / à savoir :
- Pas déployé sur le cluster. Le code n'est pas commité.
- Équilibrage jamais joué : certaines conditions cumulées (orage + nuit, heures précises) peuvent
  être trop rares. Les chances se règlent dans `content.py`, la fréquence de la pluie dans `world.py`.
- Les tests figent l'heure sur un matin ensoleillé (`MORNING` dans `test_game.py`), sinon ils
  dépendraient de l'heure réelle.
- La production des abeilles diurnes baisse un peu (repos la nuit, arrêt sous la pluie) : environ
  ×0,85 par rapport à la 1.3 sans abri ni gène de résistance.

## Demande du 2026-10-18 (2) : direction artistique « Prairie douce »

Trois pistes proposées en maquettes (https://claude.ai/artifact/TcrFHC6N5eDptrkQx5cHSv) ; choix : piste A,
plus tous les changements communs.

- Thème clair et arrondi, polices Fredoka (titres) et Nunito (texte) intégrées au build par
  `next/font` : téléchargées une fois pendant `npm run build`, aucune requête externe à l'exécution.
- L'en-tête prend la couleur du ciel selon l'heure du jeu (aube, jour, crépuscule, nuit).
- Chaque ruche est une scène : ciel du moment, pluie ou neige du biome, abeilles qui volent quand
  elle travaille, « Zzz » au repos. Statut en pastille, biome et modules en icônes.
- Réserve regroupée par espèce (tuiles avec ♀/♂ et gènes notables en icônes) ; le génome complet
  et la vente sont dans une fiche ouverte au clic. Seuls les gènes qui sortent de l'ordinaire
  apparaissent en pastille (`notableTraits` dans `components/ui.tsx`).
- Fête : une carte se retourne à chaque nouvelle espèce d'abeille, d'arbre ou de papillon ; « +N rayons »
  s'envole à la récolte ; tampon « Accompli » dans le Carnet ; pastille rouge sur l'onglet Carnet
  quand une récompense attend.
- Textes d'aide derrière un bouton « ? » sur chaque page.

Vérifié dans un navigateur en local : Rucher (nuit + orage), fiche d'abeille, Apidex, sans erreur
console. Non vérifié à l'œil : Usine, Boutique, Génétique, Jardin, Communauté (seul le thème change).

## Demande du 2026-10-18 (3) : autres pages, jardin masqué, mode nuit

- **Pages refaites** dans le style « Prairie douce » :
  - Boutique : onglets par section, une tuile par espèce avec boutons ♀ et ♂, choix de quantité
    (×1, ×5, ×10), biome choisi par icône pour les ruches, onglet « Vendre » en tuiles.
  - Usine : centrifugeuse dessinée qui tourne quand elle travaille, rayons en tuiles (sorties en
    icônes, détail au survol), ressources en inventaire à cases.
  - Génétique : écran de déblocage illustré, banque de gènes compacte, abeilles en tuiles, établi en
    trois volets (génome, extraction, impression).
  - Communauté : vitrines en étagère avec de grands sprites.
- **Jardin masqué** : onglet et page retirés (la page reste dans l'historique git, commit `682c18e`).
  Côté serveur, `GARDEN_ENABLED = False` dans `content.py` retire pousses, parcelles et objectifs du
  jardin. Les 9 mutations qui dépendaient d'un arbre ou des papillons prennent une condition de
  remplacement (`GARDEN_FALLBACK`). Les données du jardin restent en base : pour le rétablir,
  repasser le drapeau à True et restaurer `frontend/app/jardin/page.tsx` depuis git.
- **Mode nuit de l'affichage** : thème sombre complet. Par défaut il suit le réglage de l'appareil ;
  un bouton dans l'en-tête bascule entre automatique, clair et nuit. Le choix est gardé dans le
  navigateur et appliqué avant le premier affichage (pas de flash blanc).

Vérifié : 22 tests ; build ; dans un navigateur, Boutique, Usine, Génétique (verrouillée et
débloquée), Rucher, en clair et en nuit, sans erreur console. Non vérifié à l'œil : Communauté
avec des vitrines publiées.

## Demande du 2026-10-18 (4) : Apidex par branches, installation simplifiée

- **Apidex** : vue « Branches » par défaut. Une carte par branche (bandeau à ses couleurs, progression,
  espèces, branches d'origine), rangées en six étapes selon le palier médian de leurs espèces.
  Filtres toutes / à compléter / complètes. Fiche d'espèce au clic (comment l'obtenir, ce qu'elle
  peut donner, conditions en pastilles). L'arbre des mutations reste en second onglet.
- **Installation d'une reine** : un bouton ouvre un sélecteur en deux étapes (princesse, puis
  faux-bourdon de la même espèce présélectionné). Les princesses qui ne supportent pas le climat
  de la ruche sont grisées (« Trop froid », « Trop chaud »). Le serveur refuse aussi ce cas
  (`install` dans `service.py`). Une reine déjà installée peut toujours tomber en « Climat inadapté »
  si un module d'alvéaire change ensuite la température.

## Demande du 2026-10-18 (5) : badges sur les vitrines

Calculés à la volée (`backend/app/game/badges.py`), rien de stocké en plus :

- **Rang** selon les espèces découvertes : Apprenti apiculteur (5), Apiculteur (20), Éleveur (50),
  Maître éleveur (100), Grand maître (150), Apis Imperator (toutes).
- **Médailles de succès** selon les objectifs du Carnet réclamés : Bâtisseur (ruches), Généticien
  (gènes), Collectionneur (paliers d'espèces), Archiviste (tous objectifs). Bronze, argent, or, diamant
  par quarts de la famille ; le diamant exige de tout réclamer (Archiviste : 5, 15, 35, 60).
- **Médaille de branche** aux couleurs de la branche, pour chaque branche complète de l'Apidex.

Affichage : sur chaque vitrine, le rang de l'auteur et ses médailles (8 au plus, puis « +N ») ;
dans le Carnet, une section « Mes badges » avec la progression vers le rang suivant.

## Demande du 2026-10-18 (6) : nouveaux modèles d'abeilles

Le sprite unique 16×16 est remplacé par un générateur 24×24 (`frontend/components/BeeIcon.tsx`) :

- **Taille** : selon la longévité de l'espèce (éphémères minuscules, longévives grosses), plus un
  ajustement par branche (Sociales et Énergiques plus petites ; Héroïques, Minérales, Volcaniques,
  Célestes plus grosses ; Légendaires énormes). Les reines sont un cran plus grandes.
- **Corps** : abdomen et tête sombre distincte avec un œil ; motif par branche (rayures, rayures fines,
  deux bandes, taches, bicolore, uni).
- **Ailes** : normales, grandes, petites, déchirées, en cristal, en feuille, aquatiques, en papillon ;
  leur taille suit celle du corps.
- **Particularités par branche** : cornes, flammes, fourrure, aura, masque et yeux luisants,
  roche, facettes, reflet, os, rivets, coulures, bulles, étincelles, auréole, fleur, grand dard,
  longues antennes, aigrette dorée.
- Les couleurs restent celles de l'espèce. Tout se règle dans la table `BRANCH_LOOKS`.

## Demande du 2026-10-18 (7) : succès et easter eggs

- **33 succès** (`backend/app/game/achievements.py`), débloqués une fois, chacun avec une petite
  récompense en miel et une carte « Succès débloqué ! » : premiers pas, récoltes (100 / 1 000 / 10 000
  rayons), centrifugation à la main, miel gagné, générations de reine, hybrides, stabilité pure ou
  chaotique, ruche au travail sous l'orage / la nuit / la neige, tous les biomes, alvéaire au maximum,
  génétique, vitrine publiée, 10 « j'aime » reçus.
- **Succès secrets** (cachés dans le Carnet tant qu'ils ne sont pas obtenus) :
  code Konami (pluie d'abeilles), 10 clics rapides sur l'abeille du logo, page introuvable (abeille
  perdue), ruche nommée d'après une abeille de dessin animé, minuit heure du jeu, jouer entre 3 h et
  4 h (heure locale), accepter l'aide de secours, tomber à zéro miel.
- **Surprises du calendrier** : citrouille sur la tête des abeilles le 31 octobre, bonnet de Noël du
  20 au 26 décembre, abeilles qui volent à reculons le 1er avril.
- Nouvelle médaille **Aventurier** (5, 12, 22 succès, puis tous).
- Base : colonnes `players.stats` et `players.achievements`, migration `0004`. Les secrets que seul le
  navigateur peut voir passent par `POST /api/secrets` (liste blanche `CLIENT_SECRETS`) : un joueur
  curieux peut les déclencher à la main, l'enjeu est minime (moins de 100 miel chacun).

## Demande du 2026-10-18 (8) : mutations plus accessibles

Constat : pas de bug, mais obtenir une princesse Commune demandait en moyenne une douzaine de
générations, puis il fallait la stabiliser sans que le jeu l'explique.

- `MUTATION_RATE` revient à 1.0 (chances de Forestry) : Sylvestre × Des prés passe de 7,5 % à 15 %.
- Une **princesse qui mute naît de race pure** (`pure_mutation` dans `genetics.breed`) : la lignée
  est fixée d'emblée. Les faux-bourdons restent hybrides. Environ 28 % des princesses issues de
  Sylvestre × Des prés sont désormais des Communes pures.
- Conseils : dans la fenêtre d'installation, explication quand la princesse choisie est hybride et
  pastille « Fixe l'espèce » sur les faux-bourdons purs de la même espèce (présélectionnés) ;
  paragraphe ajouté à l'aide du Rucher.

## Demande du 2026-10-18 (9) : génétique plus exigeante

Tout est dans `backend/app/game/lab.py` (réglages en tête de fichier) :

- **Trois niveaux** de laboratoire, construits depuis la page Génétique (l'offre de la boutique est
  retirée) : Paillasse (15 espèces ; vitesse, longévité, fertilité), Séquenceur (40 espèces ; tous
  les gènes sauf l'espèce, impression, réplication), Synthétiseur (100 espèces ; gène d'espèce).
- **Fragments** : un gène s'obtient en 2 (courant), 4 (intermédiaire) ou 6 (rare) fragments, de 3 à 8
  pour une espèce selon sa rareté. Chaque extraction sacrifie une abeille et échoue dans 30 % des cas.
- **Impression partielle** : seule la copie active du gène est remplacée ; il faut élever pour fixer.
- **Temps et ressources** : extraction 2 min, impression 5 min, réplication 4 min, une opération à la
  fois. Les gènes intermédiaires coûtent de la propolis, les rares de la gelée royale, le gène
  d'espèce de la gelée royale et 5 rayons de l'espèce.
- **Doses** : un gène complet donne 3 impressions ; la réplication en ajoute 3 (verrerie, gelée
  royale, miel selon la rareté).
- Base : migration `0005` (`players.lab_level`, `players.lab`, `player_genes.doses`). Les comptes qui
  avaient le laboratoire passent au niveau 1, leurs gènes reçoivent 3 doses.

## Demande du 2026-10-18 (10) : faire évoluer un rucher en alvéaire

Bouton « Faire évoluer » dans les réglages d'un rucher (`upgrade_hive` dans `service.py`,
`POST /api/hives/{id}/upgrade`). Prix : celui d'un alvéaire neuf, qui augmente avec le nombre
d'alvéaires possédés. La ruche garde reine, abeilles en attente, récolte, cadres et biome ; elle passe
à 4 emplacements (8 au plus) et son nom « Rucher … » devient « Alvéaire … ».

## Déploiement 1.4.0 (2026-10-18)

- Images construites (`build-images.ps1 -Tag 1.4.0`, archive de 286 Mo) et poussées dans le registre
  interne (`push-images.py`, jeton de la session kubectl).
- Sauvegarde avant déploiement : `dist/sauvegardes/apisimperium-avant-1.4.0-20261018-1851.sql`
  (`pg_dump`, hors git). Pour restaurer : `psql` dans le pod `postgres-0` avec ce fichier.
- `kustomization.yaml` : backend et frontend en 1.4.0 ; **PostgreSQL laissé en 1.3.0** (image identique)
  pour ne pas le redémarrer. Le pod `postgres-0` n'a pas redémarré.
- Migrations 0003 → 0005 appliquées au démarrage du backend ; `alembic_version` = 0005. Le compte
  `nathan` est intact (miel conservé) et passe au laboratoire niveau 1, car il l'avait débloqué.
- Vérifié : pods prêts, page d'accueil en 200, l'API sert 168 espèces, 186 mutations, 33 succès.
  Non vérifié : l'interface dans un navigateur sur le cluster (certificat du routeur).
- À noter : avant ce déploiement, l'ancien backend affichait 11 redémarrages en 8 jours (le dernier
  30 minutes plus tôt). Cause non recherchée ; à surveiller sur le nouveau pod.

## Déploiement 1.4.1 (2026-10-20)

- Apidex : onglet « Rayons » (ce que chaque rayon donne à la centrifugeuse, abeilles qui le produisent,
  rayon anonyme tant qu'aucune de ses abeilles n'est connue) et section « Récolte » dans la fiche d'espèce.
- Élevage automatique : la ruche retient le faux-bourdon installé (`settings.line_drone`, hash du génome).
  À chaque mort de reine, un exemplaire est pris dans la réserve pour féconder la nouvelle princesse,
  tant qu'il en reste ; sinon, comme avant, un faux-bourdon de la portée. Case « Réinjecter le
  faux-bourdon installé » (`settings.reuse_drone`, cochée par défaut). Pas de migration.
- Images backend et frontend 1.4.1 (archive de 169 Mo) ; PostgreSQL laissé en 1.3.0, `postgres-0`
  n'a pas redémarré. Sauvegarde : `dist/sauvegardes/apisimperium-avant-1.4.1-20261020-1816.sql`.
- Vérifié : 29 tests, types du frontend, pods prêts en 1.4.1, page d'accueil en 200, l'API sert
  168 espèces et 33 recettes. Non vérifié : l'interface dans un navigateur.

## Déploiement 1.4.2 (2026-10-20)

- Laboratoire : paillasses supplémentaires (machine `lab_bench`, 4 au plus, 1 500 miel
  + 20 cire + 10 propolis, le tout ×1,8 par achat). Chaque paillasse mène une opération ; `lab.job` devient la liste `lab.jobs`
  (une ancienne sauvegarde est convertie à la lecture, pas de migration).
- Passeur d'échantillons (machine `lab_chain`, achat unique, 4 000 miel + 20 propolis + 5 gelée royale) :
  extraction en chaîne sur la même pile d'abeilles, jusqu'au gène complet ou à court d'abeilles ou de
  verrerie. Les extractions enchaînées hors ligne sont rattrapées dans l'ordre par `lab_tick`.
- Images backend et frontend 1.4.2 ; PostgreSQL inchangé (1.3.0). Sauvegarde :
  `dist/sauvegardes/apisimperium-avant-1.4.2-20261020.sql`.
- Vérifié : 31 tests, types du frontend, pods prêts en 1.4.2, page d'accueil en 200, l'API sert les
  machines `lab_bench` et `lab_chain`. Non vérifié : l'interface dans un navigateur.

## Demande du 2026-10-20 : hausse des prix sur les ressources

- `offer_cost` : le coefficient de hausse (`scale`) s'applique maintenant aux ressources demandées,
  plus seulement au miel (arrondi à l'unité). Concerne les paillasses (×1,8), centrifugeuses (×1,6) et
  alvéaires, y compris l'évolution d'un rucher (×1,4). Le rucher ne demande que du miel.

## Demande du 2026-10-20 : durée de vie des cadres et modules

- `MODULES[...]["uses"]` : générations (morts de reine) avant usure. 5 pour les trois cadres de production,
  le module de production d'alvéaire et le Mutateur ; 100 pour le module d'élevage automatique ; 300 pour
  le module d'automatisation d'alvéaire (même effet que le module d'élevage, d'où cette durabilité pour
  justifier son prix). Lanterne, abri, chauffage, ventilateur, stabilisateur, accélération : inusables.
- Usure des modules montés : `hive.settings["wear"]`, aligné sur `hive.modules` ; un module monté avant
  cette version démarre neuf. Un module arrivé à zéro disparaît ; si c'était l'automatisation, la
  génération suivante repasse en manuel.
- Un module démonté entamé garde son usure (`players.worn_modules`, migration 0006) et repasse en premier
  au remontage : impossible de remettre un cadre à neuf en le démontant.

## Déploiement 1.4.3 (2026-10-20)

- Contenu : hausse des prix sur les ressources et durée de vie des cadres et modules (voir les deux
  sections ci-dessus).
- Images backend et frontend 1.4.3 ; PostgreSQL inchangé (1.3.0). Sauvegarde :
  `dist/sauvegardes/apisimperium-avant-1.4.3-20261020.sql`. Migration 0005 → 0006 appliquée au
  démarrage du backend.
- Vérifié : 32 tests, migration sur une base vide, types du frontend, pods prêts en 1.4.3, page
  d'accueil en 200, l'API sert la durée de vie des sept modules concernés. Non vérifié : l'interface
  dans un navigateur.

## Demande du 2026-10-21 : Apidex, arbre zoomable et fiche d'abeille

- Arbre des mutations (`components/TreeView.tsx`) : il occupe toute la largeur et la hauteur de la
  fenêtre ; molette ou pincement pour zoomer, glisser pour se déplacer, boutons + / − / Ajuster /
  Plein écran, champ « Aller à… » (espèces connues seulement), « Lignée » de l'abeille choisie.
  Un clic sélectionne et ouvre une carte « Ouvrir la fiche » ; un double-clic ouvre la fiche.
- Fiche d'une abeille : nouvelle page `/apidex/<espèce>` avec deux onglets. Présentation : portrait
  vectoriel détaillé (`components/BeePortrait.tsx`, reine / princesse / faux-bourdon, même apparence
  par branche que le sprite), description écrite à partir des gènes et de la famille
  (`describe` et `BRANCH_LORE` dans `components/apidex.tsx`), caractéristiques, récolte, même branche.
  Mutations : comment l'obtenir, ce qu'elle peut donner, lien vers sa lignée dans l'arbre
  (`/apidex?vue=arbre&abeille=<espèce>`). Une espèce inconnue reste anonyme (silhouette, « ??? »).
- La fenêtre superposée de l'ancienne fiche disparaît : tous les clics sur une abeille de l'Apidex
  mènent à sa page.
- Vérifié dans un navigateur sans interface, sur une pile locale en mode dev : fiches (quatre
  branches, espèce inconnue), onglet Mutations, arbre (zoom à la molette, sélection, lignée), mobile
  390 px, sans erreur console.

## Demande du 2026-10-21 (2) : portraits en pixel art et lore des abeilles

- `components/BeePortrait.tsx` : le portrait vectoriel est remplacé par du pixel art 48×48 (ombrage en
  trois tons, contours par partie). `ANATOMY` donne à chaque branche une tête (ronde, grosse, petite,
  museau, casque, crâne, capuche), des yeux (composés, lumineux, visière, gemme…), des antennes (longues,
  plumeuses, en spirale, bois, cornes, éclair…), un corps (ovale, allongé, rond, segmenté, cuirassé), un
  thorax (fourrure, plaque, crinière, teinté de la couleur de l'espèce), des pattes et un dard. Les ailes,
  le motif et les particularités restent ceux de `BRANCH_LOOKS` (BeeIcon). Les petites icônes ne changent pas.
- `lib/lore.ts` : un petit texte par espèce (168), affiché en tête de la fiche à la place de la description
  générée à partir des gènes (supprimée) ; les caractéristiques restent dans leur tableau. La phrase de
  la branche (`BRANCH_LORE`) s'affiche dans l'encart « Même branche ».
- Vérifié sur la pile locale en mode dev : planche de 16 branches, fiche complète, silhouette inconnue.

## Demande du 2026-10-21 (3) : retouches de la fiche et déploiements 1.4.4 à 1.4.6

- Fiche d'une abeille : bandeau d'en-tête aux couleurs de l'espèce au-dessus des onglets (nom, branche,
  climat, palier, traits remarquables en clair sauf l'activité, badge « Découverte ») ; la rangée
  d'icônes sous le lore est retirée. Onglet Mutations : chaque croisement occupe toute la largeur
  (`Family` avec `wide`), chance en gros et condition dessous.
- Le portrait s'affiche en 288 px (6 pixels écran par pixel de la grille 48) pour rester net.
- Déploiements : frontend seul en 1.4.4 (arbre zoomable, fiche), 1.4.5 (pixel art, lore), 1.4.6
  (retouches). Backend toujours en 1.4.3, PostgreSQL en 1.3.0, aucune migration. Vérifié : pods
  prêts, fiches en 200 ; interface vérifiée sur la pile locale en mode dev, pas sur le cluster.

## Demande du 2026-10-21 (4) : refonte de la page Génétique

- Mise en page en deux colonnes : à droite, un panneau fixe (niveau du labo, une case par paillasse avec
  opération, temps restant et barre, verrerie, journal) ; sur mobile il passe en haut, sans le journal.
- Extraire : une carte par valeur du gène choisi (rareté, progression des fragments, doses en banque,
  abeilles qui la portent, faux-bourdons d'abord) au lieu d'une ligne par pile ; case « En chaîne »
  visible quand le passeur est installé. Un message dit quand une paillasse se libère si toutes sont prises.
- Imprimer : abeilles en vignettes, gènes de la banque en pastilles, aperçu « actuel → nouveau », coût.
- Banque : une carte par chromosome qui réunit gènes complets (doses, réplication) et fragments en cours.
- L'onglet « Laboratoire » devient « Améliorer » (niveaux et équipement). Aucun changement côté serveur.
- Vérifié sur la pile locale en mode dev (deux paillasses, passeur, chaîne en cours), bureau et mobile.

## Demande du 2026-10-21 (5) : fin de partie, étape 1 (1.5.0) : trophées et pedigree

Feuille de route validée : 1.5.0 Trophées + Pedigree, 1.6.0 Commandes + réputation, 1.7.0 Grands projets
(Observatoire, Serre climatique, Poste d'expédition), 1.8.0 Expéditions + espèces sauvages, puis Sanctuaire.
Choix validés : les objectifs du Carnet sont fondus dans les trophées ; en expédition les abeilles reviennent
(perte possible sur un échec grave) ; la certification de pedigree ne consomme pas l'abeille.

- `game/trophies.py` : 21 trophées à paliers (bronze, argent, or, diamant) répartis en catégories (Collection,
  Rucher, Élevage, Laboratoire, Pedigree, Communauté) et 8 trophées secrets à un palier (les anciens succès
  secrets). Chaque palier se réclame dans le Carnet (`POST /api/trophies/claim`) et rapporte miel et matériel.
  Les succès (`achievements.py`) ne paient plus rien : ce sont des événements comptés par les trophées.
  Nouvelles statistiques : `extracts`, `imprints`, `generation` (maximum atteint).
- Conversion (`_ensure_trophies`, à la première lecture, quand `players.trophies` est vide) : un objectif atteint
  mais pas réclamé est payé une fois, puis chaque palier déjà atteint est marqué reçu, sans paiement. Les
  objectifs restent dans `content.OBJECTIVES` pour cette conversion seulement.
- Pedigree : Pure (gène d'espèce identique sur les deux copies), Stable (tous les chromosomes), Élite (vitesse,
  longévité, fertilité), Champion (tolérance ± 2, intempéries, jour et nuit). « Faire certifier » dans la
  fiche d'une abeille de la réserve (`POST /api/bees/certify`), l'abeille n'est pas consommée, le meilleur
  niveau est gardé par espèce (`players.pedigree`). Une abeille pure de boutique est déjà « Stable ».
- Migration 0007 : colonnes `players.trophies` et `players.pedigree`.
- Interface : Carnet refait en salle des trophées (rang, métaux, pedigree, à réclamer, filtres par catégorie) ;
  pastille rouge de l'onglet sur les paliers à réclamer ; médailles des vitrines tirées des trophées ;
  Apidex : pastille et échelle du pedigree sur la fiche.
- Vérifié : 33 tests ; conversion d'un joueur créé en 1.4.6 puis passé en 1.5.0 (migration appliquée,
  objectifs en attente payés une fois) ; Carnet, certification, réclamation dans un navigateur sur la pile locale.

## Demande du 2026-10-21 (6) : fin de partie, étape 2 (1.6.0) : Comptoir et réputation

- `game/orders.py` : cinq guildes (Herboristerie du Val, Forge des Trois Enclumes, Monastère de
  Saint-Ambroise, Cour impériale, Guilde des Explorateurs), chacune avec ses ressources et ses gènes favoris.
  Trois sortes de commandes : ressources, abeille aux gènes imposés (livrée, donc consommée), pedigree minimum
  (simple vérification). Tirage reproductible (graine = joueur + numéro de commande).
- Faisabilité : les ressources demandées sont tirées de ce que produisent les espèces découvertes (produits et
  centrifugation) ; les gènes imposés sont des valeurs recherchées (`WANTED`), meilleures que celles de
  l'espèce, que le joueur possède déjà (abeille ou banque), ou la plus accessible à partir du niveau 3. Au
  niveau 0, seulement des faux-bourdons (un débutant ne doit pas livrer sa seule princesse), et plutôt une
  espèce déjà en réserve.
- Tableau : 3 places, 4 au niveau 2, 5 au niveau 4 ; une commande reste 8 h ; une place libérée (livraison ou
  refus) se remplit 20 min plus tard. Commande de prestige hebdomadaire (semaine ISO, fin lundi minuit UTC)
  dès le niveau 1 : trois ressources et une abeille à trois gènes, 150 de réputation, ne se refuse pas.
- Réputation : 0, 100, 300, 700, 1500, 3000 points (Inconnu → Fournisseur impérial). Trophées « Négociant »,
  « Renommée », « Prestige » (catégorie Comptoir).
- Migration 0008 : `players.orders` (JSON), `players.reputation` (entier). Routes `POST /api/orders/deliver`
  et `/api/orders/discard`. Nouvelle page `/comptoir` (onglet entre Boutique et Génétique).
- Vérifié : 35 tests ; page et livraison dans un navigateur sur la pile locale en mode dev.

## Demande du 2026-10-21 (7) : fin de partie, étape 3 (1.7.0) : grands projets

- `game/projects.py` : deux chantiers à trois étapes. On donne miel et objets petit à petit
  (`POST /api/projects/contribute`, jamais plus que nécessaire) ; une étape s'achève dès que tout est réuni.
  - Observatoire : 1) prévisions météo des 4 prochaines périodes par biome (`state.forecast`) ; 2) sur chaque
    ruche, les mutations dont les parents et les conditions sont réunis en ce moment (`hive.mutations_now`) ;
    3) chances de mutation ×1,15 partout.
  - Serre climatique : la serre se pose sur une ruche existante, qui garde son biome (conditions de mutation)
    mais prend la température choisie et ne craint plus la pluie (`hive.settings["greenhouse"]`, réglage
    dans la ruche). 1) une ruche, Froid à Torride ; 2) trois ruches, toutes températures ; 3) toutes les ruches,
    production ×1,25 sous serre. Choisi plutôt qu'un biome « Serre » pour ne pas fausser Globe-trotteuse
    et le succès « tous les biomes ».
  - Le Poste d'expédition est annoncé (« bientôt ») : il viendra avec les expéditions en 1.8.0.
- `genetics.hive_mods` accepte une température de base (`base_temp`) ; le service passe par `_biome_temp`
  et `_weather` pour toute ruche.
- Trophée « Bâtisseur de merveilles » (catégorie Grands projets). Migration 0009 : `players.projects`.
- Interface : page `/projets` (onglet après Comptoir), prévisions en haut du Rucher, réglage de la serre et
  mutations possibles sur les ruches.
- Vérifié : 37 tests ; pages et don dans un navigateur sur la pile locale en mode dev.

## Demande du 2026-10-21 (8) : fin de partie, étape 4 (1.8.0) : expéditions et espèces sauvages

- Troisième grand projet, le Poste d'expédition : 1) une équipe, régions proches ; 2) deux équipes, régions
  lointaines ; 3) trois équipes, butin ×1,5, plus d'espèces sauvages (20 % au lieu de 12 %).
- `game/expeditions.py` : six régions (proches : Jungle profonde 30 min, Banquise éternelle 45 min, Désert de
  verre 1 h ; lointaines : Caldeira 1 h 30, Fosse abyssale 2 h, Ciel nocturne 2 h, en temps réel). Chaque abeille
  est notée sur 100 (climat toléré 40, pluie 20, obscurité 20, endurance selon la longévité 20) ; chance de
  l'équipe 1 − Π(1 − 0,8 × note), plafonnée à 95 %. Les abeilles quittent la réserve au départ et y reviennent
  au retour ; en cas d'échec, chacune a 25 % de risque d'être perdue, et le butin se réduit à une consolation.
- Au retour (résolu à la lecture, `expeditions_tick`) : butin de la région, trouvailles rares, 30 % de chance
  d'un fragment de gène rare (ajouté au laboratoire, comme une extraction), et une espèce sauvage (une princesse
  et un faux-bourdon). Carnet de route des 8 derniers retours.
- Six espèces sauvages, branche « Sauvages » (Lianeuse, Banquisienne, Mirage, Ignée, Benthique, Noctiluque) :
  champ `wild` dans `SPECIES`, ni boutique ni mutation ; rangées au palier 7 dans l'Apidex, fiche et lore
  adaptés. 174 espèces en tout.
- Trophées « Explorateur » et « Pionnier » (catégorie Expéditions). Migration 0010 : `players.expeditions`.
  Route `POST /api/expeditions/launch`. Nouvelle page `/expeditions` (onglet après Projets).
- Vérifié : 40 tests ; page, préparation d'équipe et départ dans un navigateur sur la pile locale en mode dev.

## Questions pour toi

1. « Sans pull vers quay » : mon interprétation ci-dessus est-elle la bonne, ou ton registre
   interne s'appelle-t-il lui-même quay, ou encore Docker Hub t'est-il interdit aussi au build ?
2. Images : mes sprites te conviennent-ils, ou veux-tu les textures de Forestry ? Dans ce cas il
   faut d'abord vérifier leur licence.
3. Le rythme (5 s par cycle, 24 h de progression hors-ligne) te va-t-il ?
4. (Réglé : les comptes passent par le realm `okd` du Keycloak du cluster.)
5. Suite : je propose d'abord d'essayer et d'équilibrer le jeu dans le navigateur, puis le jardin
   (arbres, ensuite papillons), puis les abeilles de MagicBees. D'accord sur cet ordre ?
