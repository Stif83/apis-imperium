import random

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.game import badges as B
from app.game import content as C
from app.game import genetics as G
from app.game import world as W
from app.game.service import Game, GameError, get_or_create_player
from app.main import app
from app.models import Base, Machine


@pytest.fixture
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with sessionmaker(bind=engine, expire_on_commit=False)() as session:
        yield session


def _morning() -> int:
    """Début d'une matinée sans pluie : les abeilles diurnes travaillent pendant 6 heures de jeu."""
    t = 6 * W.HOUR_MS
    while W.weather(t, "normal") != "clear":
        t += W.DAY_SECONDS * 1000
    return t


MORNING = _morning()


@pytest.fixture
def game(db):
    player = get_or_create_player(db, "test:1", "testeur")
    db.flush()
    game = Game(db, player, rng=random.Random(42))
    # La simulation dépend de l'heure et de la météo : les tests partent tous d'un matin ensoleillé
    real_advance = game.advance
    game.advance = lambda cycles, start_ms=MORNING: real_advance(cycles, start_ms)
    return game


def _bee(game, bee_type, species):
    return next(b for b in game.bees if b.type == bee_type and b.genome["species"][0] == species and b.hive_id is None)


def test_content_is_consistent():
    for species in C.SPECIES.values():
        for item, _ in species["products"]:
            assert item in C.ITEMS
        for chromosome, allele in species["template"].items():
            assert G.allele_exists(chromosome, allele)
    for m in C.MUTATIONS:
        assert {m["a"], m["b"], m["result"]} <= set(C.SPECIES)
        assert set(m["cond"]) <= C.MUTATION_CONDITIONS
        assert m["cond_text"] or not m["cond"]
        if "module" in m["cond"]:
            assert m["cond"]["module"] in C.MODULES
        for chromosome, allele in m["cond"].get("trait", {}).items():
            assert G.allele_exists(chromosome, allele)
    for objective in C.OBJECTIVES.values():
        assert all(item in C.ITEMS for item in objective["reward"]["items"])
    for comb, outputs in C.RECIPES.items():
        assert C.ITEMS[comb]["category"] == "comb"
        assert all(item == "honey" or item in C.ITEMS for item, _, _ in outputs)
    for offer in C.OFFERS.values():
        assert all(item in C.ITEMS for item in offer.get("items", {}))
    assert set(C.MODULES) == {i for i, item in C.ITEMS.items() if item["category"] == "module"}
    # Toute espèce est soit achetable, soit obtenable par mutation
    # (ou sauvage : rapportée d'une expédition dans sa région)
    from app.game import expeditions as X

    reachable = {o["species"] for o in C.OFFERS.values() if o["kind"] == "bee"} | {m["result"] for m in C.MUTATIONS}
    wild = {r["wild"] for r in X.REGIONS.values()}
    assert reachable | wild == set(C.SPECIES)
    assert all(C.SPECIES[w].get("wild") in X.REGIONS for w in wild)
    for region in X.REGIONS.values():
        assert all(item in C.ITEMS for item, _, _ in region["loot"]) and all(item in C.ITEMS for item, _ in region["rare"])


def test_pure_breeding_stays_pure():
    forest = G.pure_genome("forest")
    assert G.breed(forest, forest, random.Random(1)) == forest


def test_mutation_forest_meadows_gives_common():
    rng = random.Random(7)
    forest, meadows = G.pure_genome("forest"), G.pure_genome("meadows")
    children = [G.breed(forest, meadows, rng) for _ in range(400)]
    assert any("common" in child["species"] for child in children)
    stable = [G.breed(forest, meadows, rng, mutation_mult=0.0) for _ in range(200)]
    assert not any("common" in child["species"] for child in stable)


def test_mutated_princess_is_pure():
    rng = random.Random(11)
    forest, meadows = G.pure_genome("forest"), G.pure_genome("meadows")
    princesses = [G.breed(forest, meadows, rng, pure_mutation=True) for _ in range(400)]
    mutated = [p for p in princesses if "common" in p["species"]]
    assert mutated and all(p == G.pure_genome("common") for p in mutated)
    # Environ 28 % des princesses mutent (deux tirages à 15 %)
    assert 0.2 < len(mutated) / len(princesses) < 0.36
    # Les faux-bourdons restent hybrides
    drones = [G.breed(forest, meadows, rng) for _ in range(400)]
    assert any(set(d["species"]) == {"common", "forest"} or set(d["species"]) == {"common", "meadows"} for d in drones)


def test_mutation_requires_hive_temperature():
    rng = random.Random(3)
    modest, cultivated = G.pure_genome("modest"), G.pure_genome("cultivated")
    assert not any("sinister" in G.breed(modest, cultivated, rng)["species"] for _ in range(200))
    assert any("sinister" in G.breed(modest, cultivated, rng, hive_temp="hellish")["species"] for _ in range(200))


def test_starter_kit(game):
    state = game.state()
    assert [h["biome"] for h in state["hives"]] == C.STARTER_BIOMES
    assert [h["name"] for h in state["hives"]] == ["Rucher Prairie 1", "Rucher Prairie 2"]
    assert len(C.SPECIES) > 100
    assert state["player"]["honey"] == C.STARTER_HONEY
    assert sorted(state["discovered"]) == ["forest", "meadows"]


def test_hives_are_bought_one_by_one_and_renamed(game):
    game.p.honey = 1000
    first = game.offer_cost(C.OFFERS["hive:apiary"])["honey"]
    game.buy("hive:apiary", biome="taiga")
    game.buy("hive:apiary", biome="taiga")
    assert [h.name for h in game.hives[2:]] == ["Rucher Taïga 1", "Rucher Taïga 2"]
    assert game.p.honey < 1000 - 2 * first  # le prix monte à chaque achat
    game.update_hive(game.hives[0].id, "  Ma ruche  ", None)
    assert game.hives[0].name == "Ma ruche"


def test_apiary_upgrades_to_alveary(game):
    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    game.add_item("frame_untreated", 1)
    game.add_module(hive.id, "frame_untreated")
    queen = dict(hive.queen)
    with pytest.raises(GameError):
        game.upgrade_hive(hive.id)  # pas assez de miel
    game.p.honey = 10_000
    game.add_item("wax", 100)
    game.add_item("honeydew", 100)
    cost = game.upgrade_cost(hive)
    game.upgrade_hive(hive.id)
    assert hive.hive_type == "alveary" and hive.slots == C.HIVE_TYPES["alveary"]["slots"]
    assert hive.name == "Alvéaire Prairie 1"
    assert hive.queen == queen and hive.modules == ["frame_untreated"]
    assert game.p.honey == 10_000 - cost["honey"]
    assert game.upgrade_cost(hive) is None
    with pytest.raises(GameError):
        game.upgrade_hive(hive.id)
    # Les évolutions renchérissent avec les achats de ruches, comme les ruches elles-mêmes
    game.p.honey = 10 ** 6
    game.buy("hive:apiary")
    game.buy("hive:apiary")
    assert game.upgrade_cost(game.hives[1])["honey"] > cost["honey"]
    # Acheter un rucher puis le faire évoluer revient au prix d'un alvéaire
    alveary = game.offer_cost(C.OFFERS["hive:alveary"])
    apiary = game.offer_cost(C.OFFERS["hive:apiary"])
    game.buy("hive:apiary")
    assert apiary["honey"] + game.upgrade_cost(game.hives[-1])["honey"] == alveary["honey"]


def test_automation_module_fits_a_plain_apiary(game):
    game.p.honey = 5000
    game.add_item("wax", 50)
    game.buy("item:hive_automation")
    hive = game.hives[0]
    game.add_module(hive.id, "hive_automation")
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    game.advance(300)
    assert hive.queen is not None and hive.queen["generation"] > 3
    assert hive.output == {} and game.qty("comb_honey") > 0
    assert not [b for b in game.bees if b.hive_id == hive.id]


def test_hive_life_cycle(game):
    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "meadows").id)
    assert hive.queen["health"] == 20

    game.advance(5)
    assert hive.queen["health"] == 15

    game.advance(1000)
    assert hive.queen is None
    assert hive.output.get("comb_honey", 0) > 0
    waiting = [b for b in game.bees if b.hive_id == hive.id]
    assert sum(b.count for b in waiting if b.type == "princess") == 1
    assert sum(b.count for b in waiting if b.type == "drone") == 3  # fertilité Sylvestre

    game.collect(hive.id)
    assert hive.output == {}
    assert not [b for b in game.bees if b.hive_id == hive.id]
    combs = game.qty("comb_honey")
    honey = game.p.honey
    game.process_manual("comb_honey", 100)
    assert game.qty("comb_honey") == combs - C.MANUAL_BATCH
    while game.qty("comb_honey"):
        game.process_manual("comb_honey", 1)
    assert game.p.honey > honey


def test_climate_blocks_work(game):
    game.p.honey = 1000
    game.buy("bee:modest:princess")
    game.buy("bee:modest:drone")
    hive = game.hives[0]
    # Une princesse du désert ne s'installe pas dans une ruche tempérée
    with pytest.raises(GameError):
        game.install(hive.id, _bee(game, "princess", "modest").id, _bee(game, "drone", "modest").id)
    hive.biome = "desert"
    game.install(hive.id, _bee(game, "princess", "modest").id, _bee(game, "drone", "modest").id)
    # Si le climat change ensuite (modules d'alvéaire), la reine s'arrête
    hive.biome = "tundra"
    game.advance(10)
    assert hive.queen["health"] == hive.queen["max_health"]
    assert game.state()["hives"][0]["status"] == "climate"
    hive.biome = "desert"
    game.advance(10)
    assert hive.queen["health"] == hive.queen["max_health"] - 10


def test_alveary_automation_and_factory(game):
    game.p.honey = 100_000
    game.add_item("wax", 500)
    game.add_item("honeydew", 500)
    game.add_item("propolis", 500)
    game.buy("hive:alveary")
    game.buy("item:alveary_automation")
    game.buy("machine:centrifuge")
    alveary = game.hives[-1]
    with pytest.raises(GameError):
        game.add_module(game.hives[0].id, "alveary_automation")
    game.add_module(alveary.id, "alveary_automation")
    game.install(alveary.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)

    honey = game.p.honey
    game.advance(500)
    assert alveary.queen is not None and alveary.queen["generation"] > 5
    assert alveary.output == {}
    assert game.p.honey > honey
    assert game.qty("comb_honey") == 0


def test_factory_switches(game):
    game.p.honey = 10_000
    game.add_item("wax", 100)
    game.buy("machine:centrifuge")
    game.add_item("comb_honey", 50)
    game.add_item("comb_frozen", 50)

    # À l'arrêt, les rayons restent en stock
    game.set_factory(on=False)
    game._sim_factory(20)
    assert game.qty("comb_honey") == 50 and game.state()["factory"]["on"] is False

    # Un rayon décoché est laissé de côté, les autres sont traités
    game.set_factory(on=True)
    game.set_comb_auto("comb_honey", False)
    game._sim_factory(20)
    assert game.qty("comb_honey") == 50 and game.qty("comb_frozen") == 30
    assert game.state()["factory"] == {"on": True, "skip": ["comb_honey"]}
    game.set_comb_auto("comb_honey", True)
    game._sim_factory(20)
    assert game.qty("comb_honey") == 30
    with pytest.raises(GameError):
        game.set_comb_auto("wax", False)


def test_shop_prices_scale_and_locks(game):
    game.p.honey = 10_000
    first = game.offer_cost(C.OFFERS["hive:apiary"])["honey"]
    game.buy("hive:apiary")
    assert game.offer_cost(C.OFFERS["hive:apiary"])["honey"] > first
    # Les ressources demandées suivent la même hausse que le miel
    game.p.honey = 10_000
    game.add_item("wax", 100)
    game.buy("machine:centrifuge")
    assert game.offer_cost(C.OFFERS["machine:centrifuge"]) == {"honey": 400, "items": {"wax": 16}}
    with pytest.raises(GameError):
        game.buy("bee:steadfast:princess")
    game.p.honey = 0
    with pytest.raises(GameError):
        game.buy("bee:forest:drone")


def test_genetics(game):
    from app.game import lab as LAB

    drone = _bee(game, "drone", "forest")
    with pytest.raises(GameError):
        game.extract_gene(drone.id, "fertility")
    # Niveau 1 : seulement après 15 espèces
    game.p.honey = 100_000
    for item, n in {"wax": 100, "propolis": 100, "royal_jelly": 100, "honeydew": 100, "labware": 100}.items():
        game.add_item(item, n)
    with pytest.raises(GameError):
        game.upgrade_lab()
    for species in list(C.SPECIES)[:40]:
        game.discover(G.pure_genome(species))
    game.upgrade_lab()
    assert game.lab_level == 1
    with pytest.raises(GameError):
        game.extract_gene(drone.id, "activity")  # niveau 2

    # Fertilité « 3 » : gène intermédiaire, 4 fragments, chaque extraction peut rater
    game.add_bee("drone", G.pure_genome("forest"), 40)
    need = LAB.fragments_needed("fertility", "3")
    assert need == 4
    t = 1_000_000
    tries = 0
    while ("fertility", "3") not in game.genes:
        game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t)
        with pytest.raises(GameError):
            game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t + 1000)  # occupé
        t += LAB.EXTRACT_SECONDS * 1000
        game.lab_tick(t)
        tries += 1
    assert tries >= need
    assert game.gene_rows[("fertility", "3")].doses == LAB.DOSES

    # Impression : niveau 2, ne remplace que la copie active, consomme une dose
    princess = _bee(game, "princess", "meadows")
    with pytest.raises(GameError):
        game.imprint(princess.id, {"fertility": "3"}, now=t)
    game.upgrade_lab()
    game.imprint(princess.id, {"fertility": "3"}, now=t)
    assert not [b for b in game.bees if b.type == "princess" and b.genome["species"][0] == "meadows" and b.hive_id is None]
    t += LAB.IMPRINT_SECONDS * 1000
    game.lab_tick(t)
    upgraded = _bee(game, "princess", "meadows")
    assert upgraded.genome["fertility"] == ["3", "2"]
    assert game.gene_rows[("fertility", "3")].doses == LAB.DOSES - 1
    with pytest.raises(GameError):
        game.imprint(upgraded.id, {"speed": "fastest"}, now=t)

    # Réplication : +3 doses
    game.replicate("fertility", "3", now=t)
    game.lab_tick(t + LAB.REPLICATE_SECONDS * 1000)
    assert game.gene_rows[("fertility", "3")].doses == 2 * LAB.DOSES - 1
    state = game.state()
    assert state["gene_bank"]["fertility"] == {"3": 2 * LAB.DOSES - 1}
    assert state["lab"]["level"] == 2 and state["lab"]["log"]


def test_lab_rarity():
    from app.game import lab as LAB

    assert LAB.fragments_needed("speed", "normal") == 2
    assert LAB.fragments_needed("activity", "cathemeral") == 6
    assert LAB.fragments_needed("species", "forest") == 3
    assert LAB.fragments_needed("species", "imperatrix") == 8
    assert LAB.can_extract(1, "speed") and not LAB.can_extract(1, "species") and LAB.can_extract(3, "species")
    cost = LAB.imprint_cost({"species": "noble"})
    assert cost == {"honey": 10000, "items": {"labware": 2, "royal_jelly": 9, "comb_dripping": 15}}
    assert LAB.imprint_cost({"speed": "normal", "activity": "cathemeral"}) == {
        "honey": 4500, "items": {"labware": 2, "royal_jelly": 6}}


def test_rescue(game):
    assert not game.rescue_available()
    game.p.honey = 0
    for bee in list(game.bees):
        game.sell_bee(bee.id, bee.count)
    game.p.honey = 0
    assert game.rescue_available()
    game.rescue()
    assert not game.rescue_available()


def test_api_flow(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        client = TestClient(app)
        assert client.get("/api/state").status_code == 401
        alice = {"X-Dev-User": "alice"}
        bob = {"X-Dev-User": "bob"}

        assert "forest" in client.get("/api/content").json()["species"]
        state = client.get("/api/state", headers=alice).json()
        hive = state["hives"][0]["id"]
        princess = next(b["id"] for b in state["bees"] if b["type"] == "princess")
        drone = next(b["id"] for b in state["bees"] if b["type"] == "drone")
        state = client.post(f"/api/hives/{hive}/install", json={"princess_id": princess, "drone_id": drone}, headers=alice).json()
        assert state["hives"][0]["status"] in ("working", "resting", "weather")
        assert set(state["world"]["weather"]) == set(C.BIOMES)

        error = client.post("/api/shop/buy", json={"offer_id": "hive:alveary"}, headers=alice)
        assert error.status_code == 400 and "miel" in error.json()["detail"]

        bee = state["bees"][0]["id"]
        created = client.post("/api/community/showcases", json={"title": "Mes abeilles", "bee_ids": [bee]}, headers=alice)
        assert created.status_code == 200
        showcase = created.json()[0]
        assert showcase["mine"] and showcase["author"] == "alice"
        assert showcase["badges"]["species"] == 2 and showcase["badges"]["rank"] is None

        seen = client.post(f"/api/community/showcases/{showcase['id']}/like", headers=bob).json()[0]
        assert seen["likes"] == 1 and seen["liked"] and not seen["mine"]
        assert client.delete(f"/api/community/showcases/{showcase['id']}", headers=bob).status_code == 404
        assert client.delete(f"/api/community/showcases/{showcase['id']}", headers=alice).json() == []
    finally:
        app.dependency_overrides.clear()


def test_world_clock_and_working_hours():
    cycle = 5000
    day = W.DAY_SECONDS * 1000 // cycle  # 288 cycles par jour de jeu
    assert W.working_cycles(0, day, cycle, "cathemeral", True, "normal") == day
    assert W.working_cycles(0, day, cycle, "diurnal", True, "normal") == 14 * day // 24
    assert W.working_cycles(0, day, cycle, "nocturnal", True, "normal", always_lit=True) == day
    # Sans abri, la pluie arrête les abeilles ; il ne pleut jamais dans le désert
    exposed = sum(W.working_cycles(d * day * cycle, day, cycle, "cathemeral", False, "normal") for d in range(30))
    assert 0.5 * 30 * day < exposed < 30 * day
    assert sum(W.working_cycles(d * day * cycle, day, cycle, "cathemeral", False, "hot") for d in range(30)) == 30 * day
    assert {W.weather(h * W.HOUR_MS, "icy") for h in range(0, 24 * 60, 6)} <= {"clear", "snow"}


def test_conditional_mutation():
    rng = random.Random(5)
    marshy, forest = G.pure_genome("marshy"), G.pure_genome("forest")
    night = {"phase": "night"}
    day = {"phase": "day"}
    assert not any("noctule" in G.breed(marshy, forest, rng, ctx=day)["species"] for _ in range(400))
    assert any("noctule" in G.breed(marshy, forest, rng, ctx=night)["species"] for _ in range(400))
    # Sans contexte (ancien appel), aucune mutation à condition n'a lieu
    assert not any("noctule" in G.breed(marshy, forest, rng)["species"] for _ in range(400))


def test_trait_condition_and_stability():
    rng = random.Random(9)
    forest, meadows = G.pure_genome("forest"), G.pure_genome("meadows")
    pure = {**forest, "stability": ["pure", "pure"]}
    assert not any("common" in G.breed(pure, meadows, rng)["species"] for _ in range(400))
    chaotic = {**forest, "stability": ["chaotic", "chaotic"]}
    calm = sum("common" in G.breed(forest, meadows, rng)["species"] for _ in range(2000))
    wild = sum("common" in G.breed(chaotic, meadows, rng)["species"] for _ in range(2000))
    assert wild > calm * 1.8
    # La mutation Ordonnée exige une reine au gène de stabilité « Stable »
    monastic, imperial = G.pure_genome("monastic"), G.pure_genome("imperial")
    assert any("ordered" in G.breed(monastic, imperial, rng, ctx={})["species"] for _ in range(600))
    loose = {**monastic, "stability": ["normal", "normal"]}
    assert not any("ordered" in G.breed(loose, imperial, rng, ctx={})["species"] for _ in range(600))


def test_hive_context_and_status(game):
    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    mods = game._mods(hive)
    night = MORNING - 4 * W.HOUR_MS  # 2 h du matin
    ctx = game._hive_ctx(hive, mods, night, game._world_ctx())
    assert ctx["phase"] == "night" and ctx["biome"] == "plains" and ctx["hives_min"] == 1
    assert game._hive_status(hive, mods, night) == "resting"
    assert game._hive_status(hive, mods, MORNING) == "working"
    game.add_item("hive_lantern", 1)
    game.add_module(hive.id, "hive_lantern")
    assert game._hive_status(hive, game._mods(hive), night) == "working"


def test_trophies_claim_tiers(game):
    from app.game import trophies as T

    game.state()  # première lecture : conversion, rien d'atteint pour un nouveau joueur
    assert game.p.trophies["collector"] == 0
    with pytest.raises(GameError):
        game.claim_trophy("collector")
    for species in list(C.SPECIES)[:10]:
        game.discover(G.pure_genome(species))
    state = game.state()
    assert state["trophies"]["collector"] == {"progress": 10, "claimed": 0}
    honey = game.p.honey
    game.claim_trophy("collector")
    tier = T.TROPHIES["collector"]["tiers"][0]
    assert game.p.honey == honey + tier["reward"]["honey"]
    assert game.qty("frame_untreated") == tier["reward"]["items"]["frame_untreated"]
    with pytest.raises(GameError):
        game.claim_trophy("collector")
    assert game.state()["trophies"]["collector"]["claimed"] == 1
    # Les médailles des vitrines suivent les paliers réclamés
    assert "collector:bronze" in {b["id"] for b in game.state()["badges"]["badges"]}


def test_trophies_convert_old_progress_without_paying_twice(game):
    # Un ancien joueur : objectif « 5 espèces » atteint mais pas réclamé, succès déjà payés
    for species in ["common", "cultivated", "noble"]:
        game.discover(G.pure_genome(species))
    game.p.achievements = {"first_install": 1, "first_harvest": 1, "konami": 1}
    game.p.trophies = None
    honey = game.p.honey
    # Objectifs atteints mais pas réclamés : 5 espèces, et la branche des Mellifères (complète)
    pending = C.OBJECTIVES["species:5"]["reward"]["honey"] + C.OBJECTIVES["branch:forest"]["reward"]["honey"]
    game.state()
    # Ils sont payés une fois, puis les paliers déjà atteints sont marqués reçus
    assert game.p.honey == honey + pending
    assert game.p.trophies["firsts"] == 1 and game.p.trophies["secret:konami"] == 1
    with pytest.raises(GameError):
        game.claim_trophy("firsts")
    game.state()
    assert game.p.honey == honey + pending


def test_pedigree(game):
    from app.game import trophies as T

    forest = G.pure_genome("forest")
    assert T.pedigree_level(forest) == 2  # une espèce pure de boutique est déjà stable
    hybrid = {**forest, "species": ["forest", "meadows"]}
    assert T.pedigree_level(hybrid) == 0
    mixed = {**forest, "speed": ["slowest", "fast"]}
    assert T.pedigree_level(mixed) == 1 and T.pedigree_missing(mixed)
    elite = {**forest, "speed": ["fast", "fast"], "lifespan": ["long", "long"], "fertility": ["3", "3"]}
    assert T.pedigree_level(elite) == 3
    champion = {**elite, "tolerance": ["two", "two"], "weatherproof": ["yes", "yes"], "activity": ["cathemeral", "cathemeral"]}
    assert T.pedigree_level(champion) == 4 and T.pedigree_missing(champion) == []

    game.add_bee("drone", champion)
    bee = next(b for b in game.bees if b.genome == champion)
    assert game.certify(bee.id) == 4
    assert game.p.pedigree == {"forest": 4}
    assert bee in game.bees  # l'abeille n'est pas consommée
    with pytest.raises(GameError):
        game.certify(bee.id)
    game.add_bee("drone", hybrid)
    with pytest.raises(GameError):
        game.certify(next(b for b in game.bees if b.genome == hybrid).id)
    state = game.state()
    assert state["pedigree"] == {"forest": 4}
    assert state["trophies"]["pedigree_champion"]["progress"] == 1


def test_badges():
    empty = B.player_badges(set())
    assert empty["rank"] is None and empty["badges"] == [] and empty["next_rank"]["label"] == "Apprenti apiculteur"
    honey = set(B.BRANCHES["Mellifères"])
    got = B.player_badges(honey | {"noble"}, {"builder": 1, "collector": 4, "curator": 1})
    ids = {b["id"] for b in got["badges"]}
    assert {"branch:forest", "builder:bronze", "collector:diamond", "curator:silver"} <= ids
    assert got["badges"][0]["id"] == "collector:diamond"
    best = B.player_badges(set(C.SPECIES))
    assert best["rank"]["label"] == "Apis Imperator" and best["next_rank"] is None


def test_achievements(game):
    from app.game import achievements as A

    honey = game.p.honey
    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    assert "first_install" in game.p.achievements
    assert game.p.honey == honey  # la récompense passe désormais par le trophée « Premiers pas »

    game.advance(200)
    game.collect(hive.id)
    assert "first_harvest" in game.p.achievements and game.p.stats["combs"] > 0
    game.update_hive(hive.id, "Maya", None)
    assert "maya" in game.p.achievements

    # Secrets : seuls ceux que l'interface peut déclencher sont acceptés
    game.secret("konami")
    assert "konami" in game.p.achievements
    with pytest.raises(GameError):
        game.secret("midnight")
    state = game.state()
    assert set(state["achievements"]) <= set(A.ACHIEVEMENTS)
    assert state["trophies"]["secret:konami"]["progress"] == 1
    assert state["trophies"]["firsts"]["progress"] == 2


def test_automation_reuses_the_installed_drone(game):
    game.p.honey = 5000
    game.add_item("wax", 50)
    game.buy("item:hive_automation")
    hive = game.hives[0]
    game.add_module(hive.id, "hive_automation")
    game.add_bee("drone", G.pure_genome("meadows"), 9)
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "meadows").id)
    stock = _bee(game, "drone", "meadows").count
    # La première reine meurt : le faux-bourdon de réserve repart avec la nouvelle
    game.advance(hive.queen["health"])
    assert hive.queen["mate"] == G.pure_genome("meadows")
    assert _bee(game, "drone", "meadows").count == stock - 1
    assert game.state()["hives"][0]["line_drone"]["count"] == stock - 1

    # Désactivé, la réserve n'est plus touchée
    game.update_hive(hive.id, None, None, reuse_drone=False)
    game.advance(hive.queen["health"])
    assert _bee(game, "drone", "meadows").count == stock - 1


def _lab_ready(game):
    game.p.honey = 1_000_000
    for item, n in {"wax": 500, "propolis": 500, "royal_jelly": 100, "labware": 100}.items():
        game.add_item(item, n)
    for species in list(C.SPECIES)[:20]:
        game.discover(G.pure_genome(species))
    game.upgrade_lab()


def test_lab_benches_run_in_parallel(game):
    from app.game import lab as LAB

    _lab_ready(game)
    game.add_bee("drone", G.pure_genome("forest"), 10)
    t = 1_000_000
    game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t)
    with pytest.raises(GameError):
        game.extract_gene(_bee(game, "drone", "forest").id, "speed", now=t)
    game.buy("machine:lab_bench")
    game.extract_gene(_bee(game, "drone", "forest").id, "speed", now=t)
    assert len(game._lab_state()["jobs"]) == 2 and game.lab_benches == 2
    game.lab_tick(t + LAB.EXTRACT_SECONDS * 1000)
    assert game._lab_state()["jobs"] == []
    # Prix croissant, quatre paillasses en plus au maximum
    for _ in range(3):
        game.buy("machine:lab_bench")
    assert game.lab_benches == 5
    with pytest.raises(GameError):
        game.buy("machine:lab_bench")

    # Une sauvegarde d'avant les paillasses (un seul « job ») reste lisible
    game.p.lab = {"fragments": {}, "log": [], "job": {"op": "replicate", "chromosome": "speed", "allele": "slowest",
                                                      "start_ms": t, "ready_ms": t + 1}}
    game.lab_tick(t + 10)
    assert ("speed", "slowest") in game.genes


def test_chain_extraction(game):
    from app.game import lab as LAB

    _lab_ready(game)
    game.add_bee("drone", G.pure_genome("forest"), 30)
    t = 1_000_000
    with pytest.raises(GameError):
        game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t, chain=True)
    game.buy("machine:lab_chain")
    with pytest.raises(GameError):
        game.buy("machine:lab_chain")
    stock = _bee(game, "drone", "forest").count
    labware = game.qty("labware")
    game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t, chain=True)
    # Tout se déroule hors ligne : une seule lecture, longtemps après
    game.lab_tick(t + 100 * LAB.EXTRACT_SECONDS * 1000)
    assert game.gene_rows[("fertility", "3")].doses == LAB.DOSES
    used = stock - _bee(game, "drone", "forest").count
    assert used >= LAB.fragments_needed("fertility", "3")
    assert game.qty("labware") == labware - used
    assert game._lab_state()["jobs"] == []

    # Sans verrerie, la chaîne s'arrête d'elle-même
    game.take_item("labware", game.qty("labware") - 1)
    game.extract_gene(_bee(game, "drone", "forest").id, "speed", now=t, chain=True)
    game.lab_tick(t + 100 * LAB.EXTRACT_SECONDS * 1000)
    lab = game._lab_state()
    assert lab["jobs"] == [] and lab["log"][0].startswith("Chaîne arrêtée (plus de verrerie)")


def test_chain_switch_on_running_job(game):
    from app.game import lab as LAB

    _lab_ready(game)
    game.add_bee("drone", G.pure_genome("forest"), 30)
    t = 1_000_000
    game.extract_gene(_bee(game, "drone", "forest").id, "fertility", now=t)
    job_id = game._lab_state()["jobs"][0]["id"]
    # Sans passeur d'échantillons, on ne peut pas enclencher la chaîne
    with pytest.raises(GameError):
        game.set_chain(job_id, True, now=t + 1)
    game.buy("machine:lab_chain")
    game.set_chain(job_id, True, now=t + 1)
    game.lab_tick(t + 100 * LAB.EXTRACT_SECONDS * 1000)
    assert game.gene_rows[("fertility", "3")].doses == LAB.DOSES

    # Une chaîne coupée en route s'arrête après l'extraction en cours
    stock = _bee(game, "drone", "forest").count
    game.extract_gene(_bee(game, "drone", "forest").id, "speed", now=t, chain=True)
    job_id = game._lab_state()["jobs"][0]["id"]
    # La chaîne garde son repère d'une abeille à la suivante : on peut la couper sur une vue en retard
    game.lab_tick(t + LAB.EXTRACT_SECONDS * 1000)
    game.set_chain(job_id, False, now=t + LAB.EXTRACT_SECONDS * 1000 + 1)
    game.lab_tick(t + 100 * LAB.EXTRACT_SECONDS * 1000)
    assert stock - _bee(game, "drone", "forest").count == 2
    with pytest.raises(GameError):
        game.set_chain(job_id, True, now=t + 100 * LAB.EXTRACT_SECONDS * 1000)

    # Une opération enregistrée avant les repères en reçoit un à la lecture
    game.p.lab = {"fragments": {}, "log": [], "jobs": [{"op": "replicate", "start_ms": 5, "ready_ms": 10 ** 15}]}
    assert game._lab_state()["jobs"][0]["id"] == "5"


def test_modules_wear_out(game):
    game.p.honey = 10_000
    game.add_item("wax", 100)
    game.buy("item:hive_automation")
    game.buy("item:frame_untreated", 2)
    hive = game.hives[0]
    game.add_module(hive.id, "hive_automation")
    game.add_module(hive.id, "frame_untreated")
    assert game.state()["hives"][0]["wear"] == [100, 5]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)

    # Deux générations, puis on démonte le cadre : il garde son usure
    for _ in range(2):
        game.advance(hive.queen["health"])
    assert hive.queen["generation"] == 3
    assert game._wear(hive) == [98, 3]
    game.remove_module(hive.id, 1)
    assert game.p.worn_modules == {"frame_untreated": [3]}
    # Le cadre entamé repasse en premier, le neuf reste en réserve
    game.add_module(hive.id, "frame_untreated")
    assert game._wear(hive) == [98, 3] and not game.p.worn_modules
    assert game.qty("frame_untreated") == 1

    # Trois générations de plus : le cadre est usé et disparaît, l'automatisation continue
    for _ in range(3):
        game.advance(hive.queen["health"])
    assert hive.modules == ["hive_automation"] and game._wear(hive) == [95]
    assert hive.queen is not None
    assert game.qty("frame_untreated") == 1


def test_orders_board_and_delivery(game):
    from app.game import orders as O

    for species in list(C.SPECIES)[:12]:
        game.discover(G.pure_genome(species))
    t = 1_700_000_000_000
    board = game.orders_board(t)
    assert len(board["slots"]) == O.BASE_SLOTS and all(s["order"] for s in board["slots"])
    assert board["prestige"] is None  # le prestige arrive avec le premier niveau de réputation
    # Toute ressource demandée vient d'une espèce découverte
    pool = O.producible(game.discovered)
    for slot in board["slots"]:
        assert set(slot["order"].get("items", {})) <= pool
    assert game.orders_board(t) == board  # relire ne change rien

    # Livrer une commande de ressources
    goods = O.generate(__import__("random").Random(1), game._orders_ctx(), t)
    goods = {**goods, "kind": "goods", "items": {"wax": 5}, "id": "o99", "expires_ms": t + O.ORDER_LIFETIME}
    goods.pop("bee", None), goods.pop("pedigree", None)
    board["slots"][0] = {"order": goods, "ready_ms": t}
    game.p.orders = {**board, "slots": board["slots"]}
    with pytest.raises(GameError):
        game.deliver_order("o99", now=t)  # pas de cire
    game.add_item("wax", 5)
    honey = game.p.honey
    game.deliver_order("o99", now=t)
    assert game.qty("wax") == 0 and game.p.honey == honey + goods["reward"]["honey"]
    assert game.p.reputation == goods["rep"] and game.p.stats["orders"] == 1
    # La place se libère, un nouveau client arrive un peu plus tard
    assert game.orders_board(t)["slots"][0]["order"] is None
    assert game.orders_board(t + O.REFILL_DELAY)["slots"][0]["order"]

    # Les commandes échues sont remplacées, un client à la fois
    end = t + O.ORDER_LIFETIME
    board = game.orders_board(end + O.REFILL_DELAY)
    assert sum(1 for s in board["slots"] if s["order"]) == 1
    later = game.orders_board(end + 3 * O.REFILL_DELAY)
    assert all(s["order"]["created_ms"] > t for s in later["slots"])


def test_orders_clients_arrive_one_at_a_time(game):
    from app.game import orders as O

    t = 1_700_000_000_000
    board = game.orders_board(t)
    for slot in board["slots"]:
        game.discard_order(slot["order"]["id"], now=t)
    board = game.orders_board(t)
    # Trois places libres : un client dans 20 min, le suivant 20 min après, et ainsi de suite
    assert [s["ready_ms"] for s in board["slots"]] == [t + k * O.REFILL_DELAY for k in (1, 2, 3)]
    assert sum(1 for s in game.orders_board(t + O.REFILL_DELAY)["slots"] if s["order"]) == 1
    assert sum(1 for s in game.orders_board(t + 2 * O.REFILL_DELAY)["slots"] if s["order"]) == 2
    # Une absence prolongée : tous les clients attendus sont arrivés
    assert all(s["order"] for s in game.orders_board(t + 10 * O.REFILL_DELAY)["slots"])


def test_orders_bee_discard_and_prestige(game):
    from app.game import orders as O

    t = 1_700_000_000_000
    board = game.orders_board(t)
    want = {"species": "forest", "type": "drone", "alleles": {"speed": "fast"}}
    board["slots"][1] = {"order": {"id": "b1", "guild": "court", "kind": "bee", "bee": want, "created_ms": t,
                                   "expires_ms": t + O.ORDER_LIFETIME, "prestige": False,
                                   "reward": {"honey": 300, "items": {}}, "rep": 120}, "ready_ms": t}
    game.p.orders = {**board, "slots": board["slots"]}
    plain = _bee(game, "drone", "forest")
    with pytest.raises(GameError):
        game.deliver_order("b1", plain.id, now=t)  # vitesse « Très lente » : ne convient pas
    fast = {**G.pure_genome("forest"), "speed": ["fast", "slowest"]}
    game.add_bee("drone", fast)
    good = next(b for b in game.bees if b.genome == fast)
    game.deliver_order("b1", good.id, now=t)
    assert good not in game.bees  # l'abeille est livrée
    # Réputation 120 : premier niveau, la commande de prestige de la semaine apparaît
    assert O.level_of(game.p.reputation) == 1
    prestige = game.orders_board(t)["prestige"]
    assert prestige["order"]["prestige"] and prestige["week"] == O.week_key(t)
    with pytest.raises(GameError):
        game.discard_order(prestige["order"]["id"], now=t)
    # Refuser une commande ordinaire libère sa place
    other = game.orders_board(t)["slots"][0]["order"]["id"]
    game.discard_order(other, now=t)
    assert game.orders_board(t)["slots"][0]["order"] is None
    state = game.state()
    assert state["orders"]["level"] == 1 and state["trophies"]["trader"]["progress"] == 1


def _give_stage(game, project_id):
    from app.game import projects as PR

    cost = PR.stage_cost(project_id, game.project_stage(project_id))
    given = (game.p.projects or {}).get(project_id, {}).get("given", {})
    game.p.honey += cost["honey"]
    game.contribute(project_id, "honey", cost["honey"])
    for item, n in cost["items"].items():
        if n > given.get(item, 0):
            game.add_item(item, n - given.get(item, 0))
            game.contribute(project_id, item, n - given.get(item, 0))


def test_projects_contributions(game):
    from app.game import projects as PR

    cost = PR.stage_cost("observatory", 0)
    with pytest.raises(GameError):
        game.contribute("observatory", "diamond", 1)  # pas demandé à cette étape
    game.add_item("wax", 50)
    game.contribute("observatory", "wax", 50)
    assert game.qty("wax") == 0 and game.p.projects["observatory"]["given"] == {"wax": 50}
    # On ne donne jamais plus que nécessaire
    game.add_item("wax", 1000)
    game.contribute("observatory", "wax", 1000)
    assert game.qty("wax") == 1000 - (cost["items"]["wax"] - 50)
    with pytest.raises(GameError):
        game.contribute("observatory", "wax", 1)
    assert game.project_stage("observatory") == 0
    _give_stage(game, "observatory")
    assert game.project_stage("observatory") == 1 and game.p.projects["observatory"]["given"] == {}
    state = game.state()
    assert len(state["forecast"]) == PR.FORECAST_PERIODS and state["hives"][0]["mutations_now"] is None
    assert state["trophies"]["wonders"]["progress"] == 1


def test_greenhouse_and_observatory_effects(game):
    from app.game import projects as PR

    hive, other = game.hives[0], game.hives[1]
    with pytest.raises(GameError):
        game.update_hive(hive.id, None, None, greenhouse="hot")  # pas encore de serre
    _give_stage(game, "greenhouse")
    with pytest.raises(GameError):
        game.update_hive(hive.id, None, None, greenhouse="hellish")  # étape 2 seulement
    game.update_hive(hive.id, None, None, greenhouse="hot")
    assert game._mods(hive)["temp"] == "hot" and game._mods(hive)["shelter"]
    with pytest.raises(GameError):
        game.update_hive(other.id, None, None, greenhouse="cold")  # une seule place à l'étape 1
    game.update_hive(hive.id, None, None, greenhouse="")
    assert game._mods(hive)["temp"] == "normal"

    # Observatoire, étape 2 : mutations possibles maintenant (Sylvestre × Des prés → Commune, sans condition)
    _give_stage(game, "observatory")
    _give_stage(game, "observatory")
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "meadows").id)
    now = game.state()["hives"][0]["mutations_now"]
    assert {"result": "common", "chance": 0.15} in now
    with pytest.raises(GameError):
        game.set_sky("plains", "rain")  # Grand télescope pas encore construit
    _give_stage(game, "observatory")
    with pytest.raises(GameError):
        game.contribute("observatory", "honey", 1)  # projet achevé

    # Grand télescope : la pluie tombe sur la prairie pendant une heure, payée en ressources
    t = 1_700_000_000_000
    with pytest.raises(GameError):
        game.set_sky("plains", "rain", now=t)  # pas de rosée
    for item, n in PR.SKY_WEATHERS["rain"]["items"].items():
        game.add_item(item, 2 * n)
    game.set_sky("plains", "rain", now=t)
    assert game._weather(hive, t + 1) == "rain"
    assert game._weather(hive, t + PR.SKY_MINUTES * 60_000) != "rain" or W.weather(t + PR.SKY_MINUTES * 60_000, "normal") == "rain"
    game.set_sky("plains", "rain", now=t + 1000)  # relancée : elle se prolonge
    assert game._sky()["plains"]["until"] == t + 2 * PR.SKY_MINUTES * 60_000
    assert game.qty("dew") == 0
    # La serre protège de la météo imposée
    game.update_hive(hive.id, None, None, greenhouse="hot")
    assert game._weather(hive, t + 1) == "clear"


def test_expedition_scores():
    from app.game import expeditions as X

    jungle, abyss = X.REGIONS["jungle"], X.REGIONS["abyss"]
    forest = G.pure_genome("forest")  # tempéré, craint la pluie, diurne, longévité courte
    s = X.bee_score(forest, jungle)
    assert s["climate"] == 0 and s["weather"] == 0 and s["dark"] == 20 and s["total"] < 40
    liana = G.pure_genome("liana")  # sauvage de la jungle : chaud, résiste à la pluie
    assert X.bee_score(liana, jungle)["total"] >= 90
    benthic = G.pure_genome("benthic")
    assert X.bee_score(benthic, abyss)["total"] >= 90
    assert X.team_chance([100]) == 0.8 and X.team_chance([100, 100, 100]) == 0.95
    assert X.team_chance([0]) == 0


def test_expedition_flow(game):
    from app.game import expeditions as X

    t = 1_700_000_000_000
    drone = _bee(game, "drone", "forest")
    with pytest.raises(GameError):
        game.launch_expedition("jungle", [drone.id], now=t)  # pas encore de poste
    _give_stage(game, "outpost")
    with pytest.raises(GameError):
        game.launch_expedition("abyss", [drone.id], now=t)  # région lointaine : étape 2
    game.add_bee("drone", G.pure_genome("liana"), 3)
    liana = next(b for b in game.bees if b.genome == G.pure_genome("liana"))
    game.launch_expedition("jungle", [liana.id, liana.id], now=t)
    assert liana.count == 1
    team = game.p.expeditions["teams"][0]
    assert team["chance"] >= 0.9 and team["end_ms"] == t + 30 * X.MINUTE
    with pytest.raises(GameError):
        game.launch_expedition("glacier", [drone.id], now=t)  # une seule équipe à l'étape 1
    game.expeditions_tick(t + 29 * X.MINUTE)
    assert game.p.expeditions["teams"]  # pas encore rentrée
    game.expeditions_tick(t + 30 * X.MINUTE)
    report = game.p.expeditions["log"][0]
    assert not game.p.expeditions["teams"] and game.p.stats["expeditions"] == 1
    returned = 2 - len(report["lost"])
    # Une Lianeuse sauvage trouvée en route rejoint la même pile de faux-bourdons
    assert liana.count == 1 + returned + (report["wild"] == "liana")
    for item, n in report["loot"].items():
        assert game.qty(item) >= n


def test_expedition_outcomes():
    from app.game import expeditions as X

    team = {"region": "jungle", "chance": 1.0, "bees": [{}, {}]}
    # Réussites répétées : butin toujours, fragment et sauvage de temps en temps
    results = [X.resolve(team, __import__("random").Random(i), 3) for i in range(200)]
    assert all(r["success"] and r["loot"] and not r["lost"] for r in results)
    assert any(r["wild"] == "liana" for r in results) and any(r["fragment"] == ["weatherproof", "yes"] for r in results)
    # Échecs : maigre butin, des abeilles parfois perdues
    fails = [X.resolve({**team, "chance": 0.0}, __import__("random").Random(i), 1) for i in range(200)]
    assert all(not r["success"] and sum(r["loot"].values()) >= 1 for r in fails)
    assert any(r["lost"] for r in fails) and any(not r["lost"] for r in fails)


def test_sanctuary(game):
    myth = [m for m in C.MUTATIONS if m["cond"].get("sanctuary")]
    assert {m["result"] for m in myth} == {s for s, spec in C.SPECIES.items() if spec["branch"] == "Mythiques"}
    salamander = next(m for m in myth if m["result"] == "salamander")
    assert "Sanctuaire" in salamander["cond_text"]
    # Le contexte de la ruche suit l'étape du Sanctuaire
    assert game._world_ctx()["sanctuary"] == 0
    assert not G.cond_ok(salamander["cond"], {**game._world_ctx()})
    _give_stage(game, "sanctuary")
    assert G.cond_ok(salamander["cond"], {**game._world_ctx()})
    aeterna = next(m for m in myth if m["result"] == "aeterna")
    _give_stage(game, "sanctuary")
    _give_stage(game, "sanctuary")
    pure = {**G.pure_genome("imperatrix"), "stability": ["pure", "pure"]}
    assert not G.cond_ok(aeterna["cond"], {**game._world_ctx(), "queen": G.pure_genome("imperatrix")})
    assert G.cond_ok(aeterna["cond"], {**game._world_ctx(), "queen": pure})

    # Reliquaire : une reine légendaire produit davantage qu'avant
    hive = game.hives[0]
    royal = G.pure_genome("celestial")
    game.add_bee("princess", royal)
    game.add_bee("drone", royal)
    game.install(hive.id, _bee(game, "princess", "celestial").id, _bee(game, "drone", "celestial").id)
    game.advance(10)
    boosted = sum(hive.output.values())
    hive.output = {}
    game.p.projects = {**game.p.projects, "sanctuary": {"stage": 2, "given": {}}}
    game.advance(10)
    assert boosted > sum(hive.output.values())


def test_hive_and_slot_prices_are_shared(game):
    game.p.honey = 10 ** 7
    for item in ("wax", "honeydew"):
        game.add_item(item, 10_000)
    apiary, alveary = C.OFFERS["hive:apiary"], C.OFFERS["hive:alveary"]
    first_apiary, first_alveary = game.offer_cost(apiary)["honey"], game.offer_cost(alveary)["honey"]
    assert first_apiary == apiary["honey"] and first_alveary == alveary["honey"]
    # Un alvéaire fait monter le prix d'un rucher, et inversement
    game.buy("hive:alveary")
    assert game.offer_cost(apiary)["honey"] > first_apiary
    after_alveary = game.offer_cost(alveary)["honey"]
    game.buy("hive:apiary")
    assert game.offer_cost(alveary)["honey"] > after_alveary

    # Emplacements : un ajout double le prix dans la même ruche et le relève un peu ailleurs
    a = game.hives[-2]
    game.buy("hive:alveary")
    b = game.hives[-1]
    assert game.slot_cost(a) == game.slot_cost(b) == C.SLOT_COST
    game.expand(a.id)
    assert game.slot_cost(a) == round(C.SLOT_COST * C.SLOT_SCALE)
    assert game.slot_cost(b) == round(C.SLOT_COST * C.SLOT_SCALE_ALL)


def test_manual_press_and_production_module(game):
    game.p.honey = 10 ** 9
    game.add_item("comb_honey", 100)
    game.process_manual("comb_honey", 1000)
    assert game.qty("comb_honey") == 99
    game.buy("machine:manual_press")
    assert game.manual_batch == C.MANUAL_BATCHES[1]
    game.process_manual("comb_honey", 1000)
    assert game.qty("comb_honey") == 99 - C.MANUAL_BATCHES[1]
    for _ in C.MANUAL_BATCHES[2:]:
        game.buy("machine:manual_press")
    assert game.manual_batch == C.MANUAL_BATCHES[-1]
    with pytest.raises(GameError):
        game.buy("machine:manual_press")  # niveau maximum

    # Module de production : ×2, et il s'use
    game.add_item("wax", 100)
    game.add_item("honeydew", 100)
    hive = game.hives[0]
    game.upgrade_hive(hive.id)
    game.add_item("alveary_production", 1)
    game.add_module(hive.id, "alveary_production")
    assert game._wear(hive) == [C.MODULES["alveary_production"]["uses"]]
    assert game._mods(hive)["production"] == pytest.approx(C.HIVE_TYPES["alveary"]["production"] * 2)
    assert game._mods(hive)["overflow"] == 2


def test_production_modules_overflow_the_cap():
    # Sous le plafond, rien en surplus ; au-delà, seuls les doublements des modules "overflow" comptent
    assert G.overflow(0.8, 4) == 0
    assert G.overflow(2.0, 4) == pytest.approx(C.OVERFLOW)  # 0,5 → 2 : un seul doublement dépasse 100 %
    assert G.overflow(8.0, 4) == pytest.approx(2 * C.OVERFLOW)  # déjà à 2 sans les modules
    assert G.overflow(8.0, 1) == 0  # cadres seuls : plafonné
    mods = G.hive_mods("alveary", "plains", ["alveary_production"] * 3 + ["frame_proven"])
    assert mods["overflow"] == 8 and mods["production"] == pytest.approx(1.2 * 8 * 2.2)


def test_world_hive_scales_the_harvest_past_the_cap():
    import random

    rng = random.Random(1)
    assert G.scale(rng, 10, 1.0) == 10
    assert G.scale(rng, 10, 3.0) == 30
    assert 1150 <= G.scale(rng, 1000, 1.2) <= 1250  # +20 % en moyenne, même sur un produit déjà à 100 %


def test_far_regions_open_with_the_grand_outpost(game):
    from app.game import expeditions as X

    far = [rid for rid, r in X.REGIONS.items() if r["tier"] == 3]
    assert len(far) == 3 and all(C.SPECIES[X.REGIONS[r]["wild"]]["wild"] == r for r in far)
    game.add_bee("drone", G.pure_genome("forest"), 1)
    drone = _bee(game, "drone", "forest")
    _give_stage(game, "outpost")
    _give_stage(game, "outpost")
    with pytest.raises(GameError):
        game.launch_expedition(far[0], [drone.id])  # bout du monde : Grand poste
    _give_stage(game, "outpost")
    game.launch_expedition(far[0], [drone.id])


def test_artificial_greenhouse_lights_hives(game):
    hive = game.hives[0]
    for _ in range(3):
        _give_stage(game, "greenhouse")
    game.update_hive(hive.id, None, None, greenhouse="hot")
    assert not game._mods(hive)["light"]
    _give_stage(game, "greenhouse")
    assert game._mods(hive)["light"]
    assert not game._mods(game.hives[1])["light"]  # hors serre, rien ne change


def test_greenhouse_biomes_open_mutations(game):
    hive = game.hives[0]
    game.add_item("alveary_heater", 1)
    _give_stage(game, "greenhouse")
    with pytest.raises(GameError):
        game.update_hive(hive.id, None, None, greenhouse="forge")  # étape 2
    game.update_hive(hive.id, None, None, greenhouse="mangrove_swamp")
    assert game._biome(hive) == "mangrove_swamp" and game._mods(hive)["temp"] == "warm"
    assert game.state()["hives"][0]["greenhouse"] == "mangrove_swamp"
    # Les espèces de serre ne naissent que dans leur biome de serre
    game.add_bee("princess", G.pure_genome("edenic"))
    game.add_bee("drone", G.pure_genome("boggy"))
    mutation = next(m for m in C.MUTATIONS if m["result"] == "mangal")
    ctx = game._hive_ctx(hive, game._mods(hive), 0, game._world_ctx())
    assert G.cond_ok(mutation["cond"], ctx)
    game.update_hive(hive.id, None, None, greenhouse="")
    ctx = game._hive_ctx(hive, game._mods(hive), 0, game._world_ctx())
    assert not G.cond_ok(mutation["cond"], ctx) and "Mangrove" in mutation["cond_text"]
    for sid in ("mangal", "hanging", "geodic", "smith", "starlit", "robotic"):
        assert any(m["result"] == sid for m in C.MUTATIONS)


def test_robo_hive(game):
    hive = game.hives[0]
    game.p.honey = 10 ** 7
    for item in ("wax", "honeydew", "propolis"):
        game.add_item(item, 10_000)
    game.upgrade_hive(hive.id)
    assert game.upgrade_cost(hive) is None  # il faut l'atelier d'assemblage
    with pytest.raises(GameError):
        game.upgrade_hive(hive.id)
    _give_stage(game, "robotics")
    cost = game.upgrade_cost(hive)
    assert cost["honey"] == C.ROBO_COST["honey"]
    for item, n in cost["items"].items():
        game.add_item(item, n)
    game.add_item("frame_untreated", 1)
    game.add_module(hive.id, "frame_untreated")
    game.upgrade_hive(hive.id)
    assert hive.hive_type == "robo" and hive.slots == C.HIVE_TYPES["robo"]["slots"]
    assert game._mods(hive)["automation"] and hive.settings["loadout"] == ["frame_untreated"]
    assert "first_robo" in game.p.achievements

    # Configuration : on démonte ce qui n'en fait pas partie, on monte ce qui manque depuis la réserve
    game.add_item("frame_impregnated", 2)
    game.set_loadout(hive.id, ["frame_impregnated", "frame_impregnated"])
    assert sorted(hive.modules) == ["frame_impregnated", "frame_impregnated"] and game.qty("frame_untreated") == 1
    with pytest.raises(GameError):
        game.set_loadout(hive.id, ["frame_proven"] * 7)

    # Un cadre usé est remplacé depuis la réserve, puis acheté au marché à l'étape 2
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    game.add_item("frame_impregnated", 2)
    for _ in range(5):
        game.advance(hive.queen["health"])
    assert hive.modules.count("frame_impregnated") == 2 and game.qty("frame_impregnated") == 0
    honey = game.p.honey
    for _ in range(5):
        game.advance(hive.queen["health"])
    assert hive.modules == []  # étape 1 : réserve vide, pas d'achat
    _give_stage(game, "robotics")
    game._restock(hive)
    assert hive.modules.count("frame_impregnated") == 2 and game.p.honey < honey
    assert game.p.stats["robo_buys"] >= 1


def test_museum(game):
    from app.game import late as L
    from app.game import trophies as T

    collection = L.MUSEUM["Mellifères"]
    assert collection and all(item in C.ITEMS for item in collection)
    with pytest.raises(GameError):
        game.museum_donate("Mellifères", "diamond", 1)  # pas dans cette collection
    for item, need in collection.items():
        game.add_item(item, need + 10)
        assert game.museum_donate("Mellifères", item, 10 ** 6) == need  # on ne prend que le nécessaire
    assert "Mellifères" in game.state()["museum"]["complete"]
    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    assert game.trophy_value(T.TROPHIES["conservator"]) == 1


def test_museum_common_jar(game):
    from app.game import late as L

    assert len(L.JAR_ITEMS) == sum(1 for i in C.ITEMS.values() if i["category"] == "comb")
    game.add_item("comb_honey", 5)
    with pytest.raises(GameError):
        game.museum_donate(L.JAR, "comb_honey", 5)  # fermé tant qu'il reste une collection
    for branch, collection in L.MUSEUM.items():
        for item, need in collection.items():
            game.add_item(item, need)
            game.museum_donate(branch, item, need)
    assert not game.state()["museum"]["jar_full"]
    with pytest.raises(GameError):
        game.museum_donate(L.JAR, "royal_jelly", 1)  # seulement des rayons
    for item, need in L.JAR_ITEMS.items():
        game.add_item(item, need)
        game.museum_donate(L.JAR, item, need)
    state = game.state()["museum"]
    assert state["jar_full"] and len(state["complete"]) == len(L.MUSEUM)


def test_world_hive(game):
    from app.game import late as L

    data = game.state()["world_hive"]
    assert data["level"] == 0 and data["multiplier"] == 1
    request = data["request"]
    assert 1 <= len(request["items"]) <= 3
    # Les objets demandés viennent d'espèces déjà découvertes
    produced = {item for s in game.discovered for item, _ in C.SPECIES[s]["products"]}
    assert set(request["items"]) <= produced
    game.p.honey = request["honey"]
    game.world_contribute("honey", 10 ** 9)
    for item, n in request["items"].items():
        game.add_item(item, n)
        game.world_contribute(item, n)
    data = game.state()["world_hive"]
    assert data["level"] == 1 and data["multiplier"] == pytest.approx(1 + L.WORLD_HIVE_BONUS)
    assert data["request"]["honey"] > request["honey"] and data["given"] == {}
    with pytest.raises(GameError):
        game.world_contribute("diamond", 1)


def test_distillery(game):
    from app.game import late as L

    recipe = L.ELIXIRS["elixir_vigor"]
    with pytest.raises(GameError):
        game.brew("elixir_vigor")  # pas de distillerie
    game.machines["distillery"] = Machine(player_id=game.p.id, machine_id="distillery", qty=1)
    game.p.honey = recipe["cost"]["honey"] * 2
    for item, n in recipe["cost"]["items"].items():
        game.add_item(item, n * 2)
    game.brew("elixir_vigor", 2)
    assert game.qty("elixir_vigor") == 2 and game.p.stats["elixirs"] == 2
    t = 1_000_000_000
    assert game._effect("harvest", t) == 1
    game.drink("elixir_vigor", now=t)
    game.drink("elixir_vigor", now=t)  # le second prolonge le premier
    end = t + 2 * recipe["minutes"] * 60_000
    assert game.p.effects["elixir_vigor"] == end
    assert game._effect("harvest", end - 1) == 1.5 and game._effect("harvest", end) == 1
    assert game._effect("expedition", t, 0.0) == 0.0


class _FixedRng:
    """Générateur qui rend toujours la même valeur (tirages de variante)."""

    def __init__(self, value):
        self.value = value

    def random(self):
        return self.value


def test_variant_roll_and_inheritance():
    from app.game import variants as V

    plain = G.pure_genome("forest")
    assert V.roll(_FixedRng(0.5), plain) is None
    assert V.roll(_FixedRng(0.0), plain) in V.VARIANTS  # tirage gagnant
    golden = V.apply(plain, "golden")
    assert V.of(golden) == "golden" and V.of(V.apply(golden, None)) is None
    # Une reine variante la transmet toujours ; une Dorée naît une fois sur 4096
    assert V.roll(_FixedRng(0.99), golden) == "golden"
    assert V.roll(_FixedRng(1 / 4096 - 1e-6), plain) == "golden"
    assert V.roll(_FixedRng(1 / 4096 + 1e-6), plain) != "golden"
    assert V.VARIANTS["golden"]["chance"] == 1 / 4096 and "crystal" not in V.VARIANTS
    # Un faux-bourdon ne donne rien : la variante ne vient que de la reine, et ne passe pas par les croisements
    assert G.normalize(golden)["variant"] == ["golden", "golden"]
    assert "variant" not in G.breed(golden, plain, random.Random(1))
    assert G.genome_hash(golden) != G.genome_hash(plain)


def test_variant_queen_powers(game):
    from app.game import variants as V

    hive = game.hives[0]
    game.add_bee("princess", V.apply(G.pure_genome("forest"), "ancient"))
    princess = next(b for b in game.bees if b.type == "princess" and V.of(b.genome) == "ancient")
    game.install(hive.id, princess.id, _bee(game, "drone", "forest").id)
    life = C.ALLELES["lifespan"][C.SPECIES["forest"]["template"]["lifespan"]]["value"]
    assert hive.queen["health"] == life * 2
    assert V.power(hive.queen["genome"], "lifespan") == 2

    game.add_bee("princess", V.apply(G.pure_genome("forest"), "golden"))
    golden = next(b for b in game.bees if b.type == "princess" and V.of(b.genome) == "golden")
    honey = game.p.honey
    game.sell_bee(golden.id, 1)
    assert game.p.honey - honey == C.BEE_SELL["princess"] * V.SELL_MULT


def test_variant_collection_and_trophy(game):
    from app.game import trophies as T
    from app.game import variants as V

    game._found_variant(V.apply(G.pure_genome("forest"), "golden"))
    game._found_variant(V.apply(G.pure_genome("forest"), "golden"))
    game._found_variant(V.apply(G.pure_genome("meadows"), "albino"))
    assert game.trophy_value(T.TROPHIES["rarities"]) == 2
    assert game.trophy_value(T.TROPHIES["prism"]) == 2
    assert "first_variant" in game.p.achievements


def test_time_elixir_runs_the_hives(game):
    from app.game import late as L

    hive = game.hives[0]
    game.install(hive.id, _bee(game, "princess", "forest").id, _bee(game, "drone", "forest").id)
    game.add_item("elixir_time", 1)
    game.drink("elixir_time")
    assert game.qty("elixir_time") == 0 and not (game.p.effects or {}).get("elixir_time")
    # 360 cycles : la reine sylvestre (20 cycles) a eu le temps de mourir et de laisser sa descendance
    assert hive.queen is None and L.ELIXIRS["elixir_time"]["instant"] == 360


def test_beekeeper_profile(game):
    from app.game import profiles as PF

    profile = game.profile()
    assert profile["name"] == "testeur" and profile["settings"]["featured"] == PF.DEFAULT["featured"]
    assert profile["stats"]["species"] == len(game.discovered) and set(profile["stats"]) == set(PF.STATS)
    princess = _bee(game, "princess", "forest")
    game.update_profile("  Éleveuse de sylvestres  ", "desert", "night", ["generation", "variants"], princess.id)
    settings = game.profile()["settings"]
    assert settings["bio"] == "Éleveuse de sylvestres" and settings["biome"] == "desert" and settings["phase"] == "night"
    assert settings["favorite"]["genome"]["species"] == ["forest", "forest"] and settings["featured"] == ["generation", "variants"]
    game.update_profile("", "plains", "day", [], None)  # None : l'abeille préférée reste
    assert game.profile()["settings"]["favorite"] is not None
    game.update_profile("", "plains", "day", [], "")
    assert game.profile()["settings"]["favorite"] is None
    for bad in (("x" * (PF.BIO_MAX + 1), "plains", "day", []), ("", "mars", "day", []), ("", "plains", "midi", []),
                ("", "plains", "day", ["species"] * 2), ("", "plains", "day", list(PF.STATS)[:PF.MAX_FEATURED + 1])):
        with pytest.raises(GameError):
            game.update_profile(*bad, None)
