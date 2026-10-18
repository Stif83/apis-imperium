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

## Questions pour toi

1. « Sans pull vers quay » : mon interprétation ci-dessus est-elle la bonne, ou ton registre
   interne s'appelle-t-il lui-même quay, ou encore Docker Hub t'est-il interdit aussi au build ?
2. Images : mes sprites te conviennent-ils, ou veux-tu les textures de Forestry ? Dans ce cas il
   faut d'abord vérifier leur licence.
3. Le rythme (5 s par cycle, 24 h de progression hors-ligne) te va-t-il ?
4. (Réglé : les comptes passent par le realm `okd` du Keycloak du cluster.)
5. Suite : je propose d'abord d'essayer et d'équilibrer le jeu dans le navigateur, puis le jardin
   (arbres, ensuite papillons), puis les abeilles de MagicBees. D'accord sur cet ordre ?
