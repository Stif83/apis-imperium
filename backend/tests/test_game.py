import os
import random

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AUTH_MODE"] = "dev"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import get_db
from app.game import content as C
from app.game import garden as GD
from app.game import genetics as G
from app.game import world as W
from app.game.service import Game, GameError, get_or_create_player
from app.main import app
from app.models import Base


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
        if "tree" in m["cond"]:
            assert m["cond"]["tree"] in GD.TREE_SPECIES
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
    reachable = {o["species"] for o in C.OFFERS.values() if o["kind"] == "bee"} | {m["result"] for m in C.MUTATIONS}
    assert reachable == set(C.SPECIES)


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


def test_shop_prices_scale_and_locks(game):
    game.p.honey = 10_000
    first = game.offer_cost(C.OFFERS["hive:apiary"])["honey"]
    game.buy("hive:apiary")
    assert game.offer_cost(C.OFFERS["hive:apiary"])["honey"] > first
    with pytest.raises(GameError):
        game.buy("bee:steadfast:princess")
    game.p.honey = 0
    with pytest.raises(GameError):
        game.buy("bee:forest:drone")


def test_genetics(game):
    drone = _bee(game, "drone", "forest")
    with pytest.raises(GameError):
        game.extract_gene(drone.id, "fertility")
    game.p.genetics_unlocked = True
    game.p.honey = 1000
    game.add_item("labware", 2)
    game.extract_gene(drone.id, "fertility")
    assert ("fertility", "3") in game.genes

    princess = _bee(game, "princess", "meadows")
    game.imprint(princess.id, {"fertility": "3"})
    upgraded = _bee(game, "princess", "meadows")
    assert upgraded.genome["fertility"] == ["3", "3"]
    assert game.qty("labware") == 0
    with pytest.raises(GameError):
        game.imprint(upgraded.id, {"speed": "fastest"})


def test_garden_content_is_consistent():
    for tree in GD.TREE_SPECIES.values():
        assert all(item in C.ITEMS for item, _ in tree["products"])
        assert all(G.allele_exists(c, a, "tree") for c, a in tree["template"].items())
    reachable = set(GD.BASE_TREES) | {m["result"] for m in GD.TREE_MUTATIONS}
    assert reachable == set(GD.TREE_SPECIES)
    hosts = {h for b in GD.BUTTERFLIES.values() for h in b["hosts"]}
    assert hosts <= set(GD.TREE_SPECIES)
    assert hosts == set(GD.TREE_SPECIES)  # chaque arbre attire au moins un papillon


def test_garden_cycle(game):
    state = game.state()["garden"]
    assert len(state["plots"]) == GD.STARTER_PLOTS
    assert sum(s["count"] for s in state["saplings"]) == 4
    oak = next(r for r in game.flora if r.genome["species"][0] == "oak")
    birch = next(r for r in game.flora if r.genome["species"][0] == "birch")
    plot = game.plots[0]
    game.plant(plot.id, oak.id, birch.id)
    assert plot.tree["health"] == 30
    with pytest.raises(GameError):
        game.harvest(plot.id)
    with pytest.raises(GameError):
        game.plant(plot.id, oak.id, birch.id)
    game.advance(1000)
    assert game.state()["garden"]["plots"][0]["status"] == "mature"
    gained = game.harvest(plot.id)
    assert plot.tree is None and gained["items"].get("wood", 0) > 0
    assert sum(r.count for r in game.flora if r.kind == "tree") == 4  # 2 plantées, 2 obtenues

    # Sur de nombreuses générations : mutation Chêne + Bouleau -> Tilleul, et des papillons
    for _ in range(150):
        game.add_specimen("tree", G.pure_genome("oak", "tree"))
        game.add_specimen("tree", G.pure_genome("birch", "tree"))
        a = next(r for r in game.flora if r.kind == "tree" and r.genome["species"] == ["oak", "oak"])
        b = next(r for r in game.flora if r.kind == "tree" and r.genome["species"] == ["birch", "birch"])
        game.plant(plot.id, a.id, b.id)
        game.advance(100)
        game.harvest(plot.id)
    assert "lime" in game.found["tree"]
    assert game.found["butterfly"] and game.found["butterfly"] <= set(GD.BUTTERFLIES)
    butterfly = next(r for r in game.flora if r.kind == "butterfly")
    honey = game.p.honey
    game.sell_specimen(butterfly.id, 1)
    assert game.p.honey > honey
    # Les spécimens du jardin ne se mélangent pas aux abeilles
    assert all(b.kind == "bee" for b in game.bees)


def test_garden_shop(game):
    if not C.GARDEN_ENABLED:
        # Jardin masqué : ni pousses ni parcelles en boutique, et aucune mutation n'en dépend
        assert not [o for o in C.OFFERS.values() if o["kind"] in ("sapling", "plot")]
        assert not [m for m in C.MUTATIONS if {"tree", "butterflies"} & set(m["cond"])]
        return
    game.p.honey = 1000
    game.buy("sapling:spruce", 3)
    assert sum(r.count for r in game.flora if r.genome["species"][0] == "spruce") == 3
    first = game.offer_cost(C.OFFERS["plot"])["honey"]
    game.buy("plot")
    assert len(game.plots) == GD.STARTER_PLOTS + 1
    assert game.offer_cost(C.OFFERS["plot"])["honey"] > first


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


def test_objectives(game):
    with pytest.raises(GameError):
        game.claim_objective("species:5")
    for species in ["common", "cultivated", "noble"]:
        game.discover(G.pure_genome(species))
    honey = game.p.honey
    game.claim_objective("species:5")
    assert game.p.honey == honey + C.OBJECTIVES["species:5"]["reward"]["honey"]
    assert game.qty("frame_untreated") == 1
    with pytest.raises(GameError):
        game.claim_objective("species:5")
    assert game.state()["objectives"]["species:5"] == {"progress": 5, "claimed": True}
