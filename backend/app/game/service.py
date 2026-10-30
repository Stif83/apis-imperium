"""État d'un joueur et actions de jeu.

La simulation est paresseuse : à chaque requête, on rejoue les cycles écoulés depuis
la dernière visite (ce qui donne aussi la progression hors-ligne).
"""

import copy
import random
from collections import Counter
import time

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Bee, Discovery, Hive, InventoryItem, Machine, Player, PlayerGene, Showcase, ShowcaseLike, _uuid
from . import achievements as A
from . import badges as B
from . import content as C
from . import genetics as G
from . import lab as LAB
from . import late as L
from . import orders as O
from . import projects as PR
from . import expeditions as X
from . import trophies as T
from . import world as W


class GameError(Exception):
    pass


# Espèces vendues en boutique : les découvrir ne compte pas comme une mutation
SHOP_SPECIES = {o["species"] for o in C.OFFERS.values() if o["kind"] == "bee"}


def now_ms() -> int:
    return int(time.time() * 1000)


def get_or_create_player(db: Session, sub: str, username: str) -> Player:
    query = select(Player).where(Player.sub == sub).with_for_update()
    player = db.scalars(query).first()
    if player is None:
        try:
            with db.begin_nested():
                player = Player(sub=sub, username=username, honey=C.STARTER_HONEY, last_sim_ms=now_ms())
                db.add(player)
                db.flush()
                _starter_kit(db, player)
        except IntegrityError:
            # Créé entre-temps par une requête concurrente
            player = db.scalars(query).one()
    if player.username != username:
        player.username = username
    return player


def _starter_kit(db: Session, player: Player) -> None:
    for i, biome in enumerate(C.STARTER_BIOMES):
        db.add(_new_hive(player, "apiary", biome, i, C.STARTER_BIOMES[: i + 1].count(biome)))
    for species, drones in (("forest", 2), ("meadows", 2)):
        genome = G.pure_genome(species)
        h = G.genome_hash(genome)
        db.add(Bee(player_id=player.id, type="princess", genome=genome, genome_hash=h, count=1))
        db.add(Bee(player_id=player.id, type="drone", genome=genome, genome_hash=h, count=drones))
        db.add(Discovery(player_id=player.id, species_id=species))


def _new_hive(player: Player, hive_type: str, biome: str, position: int, number: int) -> Hive:
    spec = C.HIVE_TYPES[hive_type]
    return Hive(
        id=_uuid(),
        player_id=player.id,
        hive_type=hive_type,
        name=f"{spec['label']} {C.BIOMES[biome]['label']} {number}",
        biome=biome,
        slots=spec["slots"],
        position=position,
        modules=[],
        output={},
        settings={},
    )


class Game:
    def __init__(self, db: Session, player: Player, rng: random.Random | None = None):
        self.db = db
        self.p = player
        self.rng = rng or random.Random()
        pid = player.id
        self.inv = {r.item_id: r for r in db.scalars(select(InventoryItem).where(InventoryItem.player_id == pid))}
        self.bees = list(db.scalars(select(Bee).where(Bee.player_id == pid).order_by(Bee.created_at, Bee.id)))
        self.hives = list(db.scalars(select(Hive).where(Hive.player_id == pid).order_by(Hive.position, Hive.id)))
        self.machines = {r.machine_id: r for r in db.scalars(select(Machine).where(Machine.player_id == pid))}
        self.discovered = set(db.scalars(select(Discovery.species_id).where(Discovery.player_id == pid)))
        # Banque de gènes : (chromosome, allèle) -> ligne, avec ses doses restantes
        self.gene_rows = {
            (r.chromosome, r.allele): r
            for r in db.scalars(select(PlayerGene).where(PlayerGene.player_id == pid))
        }
        for bee in self.bees:
            fixed = G.normalize(bee.genome)
            if fixed != bee.genome:
                bee.genome = fixed
                bee.genome_hash = G.genome_hash(fixed)

    # ---- inventaire -------------------------------------------------------

    def qty(self, item: str) -> int:
        row = self.inv.get(item)
        return row.qty if row else 0

    def add_item(self, item: str, n: int) -> None:
        if n <= 0:
            return
        if item == "honey":
            self.p.honey += n
            earned = A.bump(self.p, "honey", n)
            if earned >= 10_000:
                A.unlock(self.p, "honey_10k")
            if earned >= 100_000:
                A.unlock(self.p, "honey_100k")
            return
        row = self.inv.get(item)
        if row is None:
            row = InventoryItem(player_id=self.p.id, item_id=item, qty=0)
            self.db.add(row)
            self.inv[item] = row
        row.qty += n

    def take_item(self, item: str, n: int) -> None:
        if self.qty(item) < n:
            raise GameError(f"Il manque : {C.ITEMS[item]['label']} ×{n - self.qty(item)}")
        self.inv[item].qty -= n

    def pay(self, cost: dict, times: int = 1) -> None:
        honey = cost.get("honey", 0) * times
        if self.p.honey < honey:
            raise GameError(f"Pas assez de miel (il en faut {honey}).")
        for item, n in cost.get("items", {}).items():
            if self.qty(item) < n * times:
                raise GameError(f"Il manque : {C.ITEMS[item]['label']} ×{n * times - self.qty(item)}")
        self.p.honey -= honey
        for item, n in cost.get("items", {}).items():
            self.take_item(item, n * times)

    def add_bee(self, bee_type: str, genome: dict, count: int = 1, hive_id: str | None = None) -> None:
        h = G.genome_hash(genome)
        for bee in self.bees:
            if bee.type == bee_type and bee.genome_hash == h and bee.hive_id == hive_id:
                bee.count += count
                break
        else:
            bee = Bee(id=_uuid(), player_id=self.p.id, type=bee_type, genome=genome, genome_hash=h, count=count, hive_id=hive_id)
            self.db.add(bee)
            self.bees.append(bee)
        self.discover(genome)

    def _bee(self, bee_id: str, bee_type: str | None = None) -> Bee:
        for bee in self.bees:
            if bee.id == bee_id and bee.hive_id is None:
                if bee_type and bee.type != bee_type:
                    break
                return bee
        raise GameError("Abeille introuvable dans l'inventaire.")

    def _take_bee(self, bee: Bee, n: int = 1) -> None:
        if bee.count < n:
            raise GameError("Pas assez d'abeilles de ce type.")
        bee.count -= n
        if bee.count == 0:
            self._drop(bee)

    def _drop(self, bee: Bee) -> None:
        self.bees.remove(bee)
        if bee in self.db.new:
            self.db.expunge(bee)
        else:
            self.db.delete(bee)

    def discover(self, genome: dict) -> None:
        for species in genome["species"]:
            if species not in self.discovered:
                if species not in SHOP_SPECIES:
                    A.unlock(self.p, "first_mutation")
                self.discovered.add(species)
                self.db.add(Discovery(player_id=self.p.id, species_id=species))

    def _hive(self, hive_id: str) -> Hive:
        for hive in self.hives:
            if hive.id == hive_id:
                return hive
        raise GameError("Ruche introuvable.")

    def _mods(self, hive: Hive) -> dict:
        greenhouse = self._greenhouse(hive)
        mods = G.hive_mods(hive.hive_type, hive.biome, hive.modules or [], base_temp=greenhouse)
        if greenhouse:
            # Sous verrière, la pluie ne gêne plus personne
            mods["shelter"] = True
            stage = self.project_stage("greenhouse")
            if stage >= 3:
                mods["production"] *= PR.GREENHOUSE_PRODUCTION
            if stage >= PR.GREENHOUSE_LIGHT:
                mods["light"] = True
        if hive.hive_type == "robo" and self.project_stage("robotics") >= 3:
            mods["production"] *= PR.ROBO_PRODUCTION
        return mods

    def _greenhouse_spot(self, hive: Hive) -> str | None:
        """Réglage de la serre : une température ou un biome de serre (None hors serre, ou sans serre construite)."""
        spot = (hive.settings or {}).get("greenhouse")
        return spot if spot and self.project_stage("greenhouse") >= 1 else None

    def _greenhouse(self, hive: Hive) -> str | None:
        """Température imposée par la serre, sinon None."""
        spot = self._greenhouse_spot(hive)
        return C.GREENHOUSE_BIOMES[spot]["temp"] if spot in C.GREENHOUSE_BIOMES else spot

    def _biome(self, hive: Hive) -> str:
        """Biome vu par les mutations : celui de la serre s'il y en a un, sinon celui de la ruche."""
        spot = self._greenhouse_spot(hive)
        return spot if spot in C.GREENHOUSE_BIOMES else hive.biome

    def _biome_temp(self, hive: Hive) -> str:
        return self._greenhouse(hive) or C.BIOMES[hive.biome]["temp"]

    def _weather(self, hive: Hive, t_ms: int) -> str:
        if self._greenhouse(hive):
            return "clear"
        return W.weather(t_ms, C.BIOMES[hive.biome]["temp"], self._sky().get(hive.biome))

    def _sky(self) -> dict:
        """Météos imposées par le Grand télescope, par biome ({"weather", "from", "until"})."""
        return (self.p.projects or {}).get("observatory", {}).get("sky") or {}

    def set_sky(self, biome: str, weather: str, now: int | None = None) -> None:
        """Impose une météo sur un biome pendant SKY_MINUTES ; la même météo relancée se prolonge."""
        now = now or now_ms()
        if self.project_stage("observatory") < PR.SKY_STAGE:
            raise GameError("Il faut d'abord le Grand télescope (Observatoire).")
        if biome not in C.BIOMES:
            raise GameError("Biome inconnu.")
        spec = PR.SKY_WEATHERS.get(weather)
        if spec is None:
            raise GameError("Météo inconnue.")
        self.pay({"honey": 0, **spec})
        projects = copy.deepcopy(self.p.projects or {})
        observatory = projects.setdefault("observatory", {"stage": PR.SKY_STAGE, "given": {}})
        sky = {b: f for b, f in (observatory.get("sky") or {}).items() if f["until"] > now}
        current = sky.get(biome)
        if current and current["weather"] == weather:
            sky[biome] = {**current, "until": current["until"] + PR.SKY_MINUTES * 60_000}
        else:
            sky[biome] = {"weather": weather, "from": now, "until": now + PR.SKY_MINUTES * 60_000}
        observatory["sky"] = sky
        self.p.projects = projects
        A.bump(self.p, "sky")

    # ---- simulation -------------------------------------------------------

    def simulate(self, now: int | None = None) -> None:
        now = now or now_ms()
        cycle_ms = settings.cycle_seconds * 1000
        cycles = (now - self.p.last_sim_ms) // cycle_ms
        if cycles <= 0:
            return
        if cycles > settings.max_offline_cycles:
            cycles = settings.max_offline_cycles
            self.p.last_sim_ms = now
            start = now - cycles * cycle_ms
        else:
            start = self.p.last_sim_ms
            self.p.last_sim_ms += cycles * cycle_ms
        self.advance(cycles, start)

    def advance(self, cycles: int, start_ms: int | None = None) -> None:
        cycle_ms = settings.cycle_seconds * 1000
        start = start_ms if start_ms is not None else now_ms() - cycles * cycle_ms
        world = self._world_ctx()
        for hive in self.hives:
            self._sim_hive(hive, cycles, start, world)
        self._sim_factory(cycles)

    def _world_ctx(self) -> dict:
        """Partie du contexte de mutation commune à toutes les ruches du joueur."""
        machine = self.machines.get("centrifuge")
        return {
            "hives_min": sum(1 for h in self.hives if h.queen),
            "hives_max": sum(1 for h in self.hives if h.queen),
            "machines": machine.qty if machine else 0,
            "sanctuary": self.project_stage("sanctuary"),
        }

    def _hive_ctx(self, hive: Hive, mods: dict, t_ms: int, world: dict) -> dict:
        return {
            **world,
            "biome": self._biome(hive),
            "phase": W.phase(t_ms),
            "hours": W.hour(t_ms),
            "weather": self._weather(hive, t_ms),
            "module": set(hive.modules or []),
            "automated": mods["automation"],
            "discovered": len(self.discovered),
        }

    def _make_queen(self, hive: Hive, princess: dict, drone: dict, generation: int, mods: dict) -> None:
        health = max(1, round(G.value(princess, "lifespan") * mods["lifespan"]))
        hive.queen = {"genome": princess, "mate": drone, "health": health, "max_health": health, "generation": generation}

    def _sim_hive(self, hive: Hive, cycles: int, start: int, world: dict) -> None:
        if not hive.queen:
            return
        cycle_ms = settings.cycle_seconds * 1000
        mods = self._mods(hive)
        auto = mods["automation"]
        biome_temp = self._biome_temp(hive)
        sanctified = self.project_stage("sanctuary") >= 3
        museum = self._museum_done()
        world_mult = L.world_multiplier(self._world_hive()["level"])
        forced = None if self._greenhouse(hive) else self._sky().get(hive.biome)
        out = dict(hive.output or {})
        t = start
        while cycles > 0 and hive.queen:
            queen = dict(hive.queen)
            genome, mate = G.normalize(queen["genome"]), G.normalize(queen["mate"])
            if not G.climate_ok(genome, mods["temp"]):
                break
            n = min(cycles, queen["health"])
            # La reine vieillit à chaque cycle, mais ne produit que pendant ses heures et par un temps qu'elle supporte
            working = W.working_cycles(
                t, n, cycle_ms, genome["activity"][0],
                mods["shelter"] or genome["weatherproof"][0] == "yes", biome_temp, mods["light"], forced,
            )
            rate = G.value(genome, "speed") * mods["production"] * settings.production_mult * W.ACTIVE_BONUS
            # Reliquaire du Sanctuaire : les grandes reines produisent davantage
            if sanctified and C.SPECIES[genome["species"][0]]["branch"] in PR.SANCTUARY_BRANCHES:
                rate *= PR.SANCTUARY_PRODUCTION
            # Fin de partie : branche complète au Musée, élixir en cours
            if C.SPECIES[genome["species"][0]]["branch"] in museum:
                rate *= L.MUSEUM_BONUS
            rate *= self._effect("production", t)
            for item, chance in G.products(genome):
                made = G.binomial(self.rng, working, min(1.0, chance * rate))
                made += G.binomial(self.rng, working, G.overflow(chance * rate, mods["overflow"]))
                # La Ruche-monde multiplie la récolte elle-même, après le plafond d'un produit par cycle
                made = G.scale(self.rng, made, world_mult)
                if auto:
                    self.add_item(item, made)
                    if made and C.ITEMS.get(item, {}).get("category") == "comb":
                        self._count_combs(made)
                elif made:
                    out[item] = out.get(item, 0) + made
            queen["health"] -= n
            cycles -= n
            t += n * cycle_ms
            if queen["health"] > 0:
                hive.queen = queen
                break

            # La reine meurt et laisse une princesse et des faux-bourdons
            hive.queen = None
            ctx = self._hive_ctx(hive, mods, t - cycle_ms, world)
            mutation = mods["mutation"] * self._effect("mutation", t - cycle_ms)
            princess = G.breed(genome, mate, self.rng, mutation, mods["temp"], ctx=ctx, pure_mutation=True)
            drones = [G.breed(genome, mate, self.rng, mutation, mods["temp"], ctx=ctx)
                      for _ in range(G.value(genome, "fertility"))]
            if auto:
                self.discover(princess)
                self.discover(drones[0])
                # Tant qu'il en reste en réserve, le faux-bourdon installé repart avec la nouvelle reine :
                # la lignée se rapproche génération après génération de son espèce
                stock = self._line_drone(hive)
                if stock:
                    mate, spare = stock.genome, drones
                    self._take_bee(stock)
                else:
                    mate, spare = drones[0], drones[1:]
                self._make_queen(hive, princess, mate, queen.get("generation", 1) + 1, mods)
                if (hive.settings or {}).get("keep_drones"):
                    for drone in spare:
                        self.add_bee("drone", drone)
            else:
                self.add_bee("princess", princess, hive_id=hive.id)
                for drone in drones:
                    self.add_bee("drone", drone, hive_id=hive.id)
            if self._wear_modules(hive) | self._restock(hive):
                mods = self._mods(hive)
                auto = mods["automation"]
        hive.output = out

    def _wear(self, hive: Hive) -> list[int | None]:
        """Générations restantes de chaque module monté, dans l'ordre de hive.modules (None = inusable)."""
        modules = hive.modules or []
        wear = list((hive.settings or {}).get("wear") or [])[: len(modules)]
        # Modules montés avant l'usure : ils démarrent neufs
        wear += [C.MODULES.get(m, {}).get("uses") for m in modules[len(wear):]]
        # Un module devenu inusable ne s'use plus
        return [None if C.MODULES.get(m, {}).get("uses") is None else w for m, w in zip(modules, wear)]

    def _set_wear(self, hive: Hive, wear: list[int | None]) -> None:
        hive.settings = {**(hive.settings or {}), "wear": wear}

    def _wear_modules(self, hive: Hive) -> bool:
        """Une génération de plus pour chaque module usable ; ceux arrivés à zéro disparaissent."""
        modules, wear = list(hive.modules or []), self._wear(hive)
        if all(w is None for w in wear):
            return False
        kept = [(m, None if w is None else w - 1) for m, w in zip(modules, wear) if w is None or w > 1]
        hive.modules = [m for m, _ in kept]
        self._set_wear(hive, [w for _, w in kept])
        return len(kept) < len(modules)

    def _restock(self, hive: Hive) -> bool:
        """Robo-ruche : remonte les cadres de sa configuration qui manquent, depuis la réserve puis au marché."""
        loadout = (hive.settings or {}).get("loadout") or []
        if hive.hive_type != "robo" or not loadout:
            return False
        missing = Counter(loadout) - Counter(hive.modules or [])
        changed = False
        for module, n in missing.items():
            for _ in range(n):
                if len(hive.modules or []) >= hive.slots:
                    return changed
                if not self.qty(module):
                    offer = C.OFFERS.get(f"item:{module}")
                    if self.project_stage("robotics") < 2 or offer is None or self.offer_lock(offer):
                        break
                    try:
                        self.pay(self.offer_cost(offer))
                    except GameError:
                        break  # pas assez de miel ou de ressources : on réessaiera à la génération suivante
                    self.add_item(module, 1)
                    A.bump(self.p, "robo_buys")
                self.add_module(hive.id, module)
                changed = True
        return changed

    def set_loadout(self, hive_id: str, modules: list[str]) -> None:
        """Configure les cadres d'une robo-ruche : démonte ce qui n'en fait pas partie, puis monte ce qui manque."""
        hive = self._hive(hive_id)
        if hive.hive_type != "robo":
            raise GameError("Seule une robo-ruche se configure.")
        if len(modules) > hive.slots:
            raise GameError("Plus de cadres que d'emplacements.")
        if any(m not in C.MODULES for m in modules):
            raise GameError("Module inconnu.")
        hive.settings = {**(hive.settings or {}), "loadout": list(modules)}
        keep = Counter(modules)
        for i in reversed(range(len(hive.modules or []))):
            module = hive.modules[i]
            if keep[module] > 0:
                keep[module] -= 1
            else:
                self.remove_module(hive.id, i)
        self._restock(hive)

    def _line_drone(self, hive: Hive) -> Bee | None:
        """Pile de réserve du faux-bourdon installé dans la ruche, si on doit la réutiliser et qu'elle existe encore."""
        opts = hive.settings or {}
        line = opts.get("line_drone")
        if not line or not opts.get("reuse_drone", True):
            return None
        return next((b for b in self.bees if b.type == "drone" and b.hive_id is None and b.genome_hash == line and b.count > 0), None)

    def _count_combs(self, n: int) -> None:
        total = A.bump(self.p, "combs", n)
        for need, aid in ((100, "combs_100"), (1000, "combs_1000"), (10000, "combs_10000")):
            if total >= need:
                A.unlock(self.p, aid)

    def _process(self, comb: str, n: int) -> None:
        self.take_item(comb, n)
        for item, chance, amount in C.RECIPES[comb]:
            self.add_item(item, G.binomial(self.rng, n, chance) * amount)

    def _factory(self) -> dict:
        """Réglages de l'usine : centrifugeuses en marche (par défaut) et rayons qu'elles laissent de côté."""
        factory = self.p.factory or {}
        return {"on": factory.get("on", True), "skip": list(factory.get("skip") or [])}

    def _sim_factory(self, cycles: int) -> None:
        factory = self._factory()
        if not factory["on"]:
            return
        machine = self.machines.get("centrifuge")
        budget = (machine.qty if machine else 0) * cycles
        for comb in C.RECIPES:
            if budget <= 0:
                break
            if comb in factory["skip"]:
                continue
            n = min(budget, self.qty(comb))
            if n:
                self._process(comb, n)
                budget -= n

    def set_factory(self, on: bool) -> None:
        """Met les centrifugeuses automatiques en marche ou à l'arrêt."""
        self.p.factory = {**self._factory(), "on": on}

    def set_comb_auto(self, comb: str, auto: bool) -> None:
        """Confie un rayon aux centrifugeuses automatiques, ou le met de côté."""
        if comb not in C.RECIPES:
            raise GameError("Ce n'est pas un rayon.")
        factory = self._factory()
        skip = set(factory["skip"]) - {comb} if auto else set(factory["skip"]) | {comb}
        self.p.factory = {**factory, "skip": sorted(skip)}

    # ---- ruches -----------------------------------------------------------

    def install(self, hive_id: str, princess_id: str, drone_id: str) -> None:
        hive = self._hive(hive_id)
        if hive.queen:
            raise GameError("Cette ruche a déjà une reine.")
        princess = self._bee(princess_id, "princess")
        drone = self._bee(drone_id, "drone")
        mods = self._mods(hive)
        if not G.climate_ok(G.normalize(princess.genome), mods["temp"]):
            raise GameError(f"Cette princesse ne supporte pas le climat de cette ruche ({C.TEMP_LABELS[mods['temp']]}).")
        princess_genome, drone_genome = princess.genome, drone.genome
        hive.settings = {**(hive.settings or {}), "line_drone": drone.genome_hash}
        self._take_bee(princess)
        self._take_bee(drone)
        self._make_queen(hive, princess_genome, drone_genome, 1, mods)
        A.unlock(self.p, "first_install")

    def eject_queen(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        if not hive.queen:
            raise GameError("Cette ruche n'a pas de reine.")
        self.add_bee("princess", G.normalize(hive.queen["genome"]))
        hive.queen = None

    def collect(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        combs = 0
        for item, n in (hive.output or {}).items():
            self.add_item(item, n)
            if C.ITEMS.get(item, {}).get("category") == "comb":
                combs += n
        if hive.output or any(b.hive_id == hive.id for b in self.bees):
            A.unlock(self.p, "first_harvest")
        if combs:
            self._count_combs(combs)
        hive.output = {}
        for bee in [b for b in self.bees if b.hive_id == hive.id]:
            self._drop(bee)
            self.add_bee(bee.type, bee.genome, bee.count)

    def add_module(self, hive_id: str, module: str) -> None:
        hive = self._hive(hive_id)
        if module not in C.MODULES:
            raise GameError("Module inconnu.")
        if len(hive.modules or []) >= hive.slots:
            raise GameError("Plus d'emplacement libre dans cette ruche.")
        if C.HIVE_TYPES[hive.hive_type]["frames_only"] and not C.MODULES[module]["frame"]:
            raise GameError("Ce module ne se monte que dans un alvéaire.")
        wear = self._wear(hive)
        self.take_item(module, 1)
        # Un exemplaire démonté entamé repart avec son usure : on l'utilise en premier
        worn = dict(self.p.worn_modules or {})
        spare = sorted(worn.get(module, []))
        uses = spare.pop(0) if spare and C.MODULES[module].get("uses") else C.MODULES[module].get("uses")
        worn[module] = spare
        self.p.worn_modules = {m: v for m, v in worn.items() if v}
        hive.modules = [*(hive.modules or []), module]
        self._set_wear(hive, [*wear, uses])

    def remove_module(self, hive_id: str, index: int) -> None:
        hive = self._hive(hive_id)
        modules, wear = list(hive.modules or []), self._wear(hive)
        if not 0 <= index < len(modules):
            raise GameError("Emplacement vide.")
        module, uses = modules.pop(index), wear.pop(index)
        self.add_item(module, 1)
        if uses is not None and uses < C.MODULES[module]["uses"]:
            worn = dict(self.p.worn_modules or {})
            worn[module] = [*worn.get(module, []), uses]
            self.p.worn_modules = worn
        hive.modules = modules
        self._set_wear(hive, wear)

    def slot_cost(self, hive: Hive) -> int | None:
        """Double à chaque emplacement déjà ajouté à cette ruche ; augmente un peu avec ceux ajoutés ailleurs."""
        if hive.slots >= C.HIVE_TYPES[hive.hive_type]["max_slots"]:
            return None
        added = {h.id: max(0, h.slots - C.HIVE_TYPES[h.hive_type]["slots"]) for h in self.hives}
        others = sum(added.values()) - added[hive.id]
        return round(C.SLOT_COST * C.SLOT_SCALE ** added[hive.id] * C.SLOT_SCALE_ALL ** others)

    def expand(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        cost = self.slot_cost(hive)
        if cost is None:
            raise GameError("Cette ruche ne peut plus être agrandie.")
        self.pay({"honey": cost})
        hive.slots += 1
        if hive.hive_type == "alveary" and hive.slots >= C.HIVE_TYPES["alveary"]["max_slots"]:
            A.unlock(self.p, "full_alveary")

    def upgrade_cost(self, hive: Hive) -> dict | None:
        """Prix de l'évolution suivante. Rucher : ce qu'un alvéaire coûte de plus, au prix d'avant l'achat de cette
        ruche (rucher acheté puis évolué = alvéaire acheté). Alvéaire : ROBO_COST croissant."""
        target = C.EVOLUTIONS.get(hive.hive_type)
        if target == "alveary":
            owned = max(0, self._hives_bought() - 1)
            apiary = self.offer_cost(C.OFFERS["hive:apiary"], owned)
            alveary = self.offer_cost(C.OFFERS["hive:alveary"], owned)
            return {"honey": alveary["honey"] - apiary["honey"], "items": alveary["items"]}
        if target == "robo" and self.project_stage("robotics") >= 1:
            factor = C.ROBO_SCALE ** sum(1 for h in self.hives if h.hive_type == "robo")
            return {"honey": round(C.ROBO_COST["honey"] * factor),
                    "items": {item: round(n * factor) for item, n in C.ROBO_COST["items"].items()}}
        return None

    def upgrade_hive(self, hive_id: str) -> None:
        """Rucher -> alvéaire -> robo-ruche ; la ruche garde sa reine, sa récolte, ses cadres et son biome."""
        hive = self._hive(hive_id)
        cost = self.upgrade_cost(hive)
        if cost is None:
            if hive.hive_type == "alveary":
                raise GameError("Il faut d'abord l'atelier d'assemblage (L'ère de la robotique).")
            raise GameError("Cette ruche ne peut plus évoluer.")
        if hive.hive_type == "apiary":
            lock = self.offer_lock(C.OFFERS["hive:alveary"])
            if lock:
                raise GameError(lock)
        self.pay(cost)
        old, target = C.HIVE_TYPES[hive.hive_type]["label"], C.EVOLUTIONS[hive.hive_type]
        spec = C.HIVE_TYPES[target]
        hive.hive_type = target
        hive.slots = max(hive.slots, spec["slots"])
        if target == "robo":
            # La configuration de départ reprend les cadres déjà montés
            hive.settings = {**(hive.settings or {}), "loadout": list(hive.modules or [])}
            A.unlock(self.p, "first_robo")
        if hive.name.startswith(f"{old} "):
            hive.name = f"{spec['label']} {hive.name[len(old) + 1:]}"[:64]

    def _line_drone_state(self, hive: Hive) -> dict | None:
        line = (hive.settings or {}).get("line_drone")
        if not line:
            return None
        stock = next((b for b in self.bees if b.type == "drone" and b.hive_id is None and b.genome_hash == line), None)
        return {"genome": stock.genome, "count": stock.count} if stock else {"genome": None, "count": 0}

    def update_hive(self, hive_id: str, name: str | None, keep_drones: bool | None, reuse_drone: bool | None = None,
                    greenhouse: str | None = None) -> None:
        hive = self._hive(hive_id)
        if greenhouse is not None:
            self._set_greenhouse(hive, greenhouse)
        if name is not None:
            name = name.strip()
            if not name:
                raise GameError("Le nom ne peut pas être vide.")
            hive.name = name[:64]
            if name.lower() in A.FAMOUS_BEES:
                A.unlock(self.p, "maya")
        if keep_drones is not None:
            hive.settings = {**(hive.settings or {}), "keep_drones": keep_drones}
        if reuse_drone is not None:
            hive.settings = {**(hive.settings or {}), "reuse_drone": reuse_drone}

    def _set_greenhouse(self, hive: Hive, temp: str) -> None:
        """Met une ruche sous serre à une température ou dans un biome de serre ; une chaîne vide l'en sort."""
        settings_ = dict(hive.settings or {})
        if not temp:
            settings_.pop("greenhouse", None)
            hive.settings = settings_
            return
        stage = self.project_stage("greenhouse")
        if stage < 1:
            raise GameError("Il faut d'abord construire la serre climatique (Grands projets).")
        if temp in C.GREENHOUSE_BIOMES:
            if C.GREENHOUSE_BIOMES[temp]["stage"] > stage:
                raise GameError("La serre ne permet pas encore ce biome : agrandissez-la.")
        elif temp not in PR.GREENHOUSE_TEMPS[stage]:
            raise GameError("La serre ne permet pas encore cette température.")
        used = sum(1 for h in self.hives if h.id != hive.id and (h.settings or {}).get("greenhouse"))
        if not settings_.get("greenhouse") and used >= PR.GREENHOUSE_SLOTS[stage]:
            raise GameError("Toutes les places sous serre sont prises : agrandissez la serre.")
        settings_["greenhouse"] = temp
        hive.settings = settings_

    # ---- fin de partie : musée, ruche-monde, distillerie ---------------------

    def _museum_done(self) -> set[str]:
        museum = self.p.museum or {}
        return {branch for branch in L.MUSEUM if L.museum_complete(museum, branch)}

    def museum_donate(self, branch: str, item: str, qty: int) -> int:
        """Donne des objets à la collection d'une branche (ou au Bocal commun) ; renvoie la quantité vraiment donnée."""
        if branch == L.JAR:
            if len(self._museum_done()) < len(L.MUSEUM):
                raise GameError("Ce bocal attend que toutes les collections du Musée soient complètes.")
            need = L.JAR_ITEMS.get(item)
        else:
            need = L.MUSEUM.get(branch, {}).get(item)
        if need is None:
            raise GameError("Cet objet n'entre pas dans cette collection.")
        museum = copy.deepcopy(self.p.museum or {})
        given = museum.setdefault(branch, {})
        n = min(qty, need - given.get(item, 0), self.qty(item))
        if n <= 0:
            raise GameError("Rien à donner : collection complète ou objet absent de la réserve.")
        self.take_item(item, n)
        given[item] = given.get(item, 0) + n
        self.p.museum = museum
        return n

    def _world_hive(self) -> dict:
        """État de la Ruche-monde ; le panier d'un niveau est tiré une fois, parmi les espèces découvertes."""
        data = dict(self.p.world_hive or {})
        data.setdefault("level", 0)
        if not data.get("request"):
            data["request"] = L.world_request(data["level"], self.discovered, self.rng)
            data["given"] = {}
            self.p.world_hive = data
        return data

    def world_contribute(self, item: str, qty: int) -> None:
        """Donne miel ou objets au niveau en cours ; le niveau s'achève dès que le panier est complet."""
        data = copy.deepcopy(self._world_hive())
        request, given = data["request"], data["given"]
        need = request["honey"] if item == "honey" else request["items"].get(item)
        if need is None:
            raise GameError("La Ruche-monde ne demande pas cela.")
        have = self.p.honey if item == "honey" else self.qty(item)
        n = min(qty, need - given.get(item, 0), have)
        if n <= 0:
            raise GameError("Rien à donner : déjà complet ou absent de la réserve.")
        if item == "honey":
            self.p.honey -= n
        else:
            self.take_item(item, n)
        given[item] = given.get(item, 0) + n
        if given.get("honey", 0) >= request["honey"] and all(given.get(i, 0) >= q for i, q in request["items"].items()):
            data = {"level": data["level"] + 1}
        self.p.world_hive = data
        if "request" not in data:
            self._world_hive()

    def _effect(self, key: str, t: int, neutral: float = 1.0) -> float:
        """Effet d'élixir en cours à l'instant t : multiplicateur (production, mutation) ou bonus (expédition)."""
        for elixir_id, until in (self.p.effects or {}).items():
            if until > t and key in L.ELIXIRS.get(elixir_id, {}).get("effects", {}):
                return L.ELIXIRS[elixir_id]["effects"][key]
        return neutral

    def brew(self, elixir_id: str, qty: int = 1) -> None:
        if elixir_id not in L.ELIXIRS:
            raise GameError("Recette inconnue.")
        if not self._machine_qty("distillery"):
            raise GameError("Il faut d'abord une distillerie (Boutique).")
        self.pay(L.ELIXIRS[elixir_id]["cost"], qty)
        self.add_item(elixir_id, qty)
        A.bump(self.p, "elixirs", qty)

    def drink(self, elixir_id: str, now: int | None = None) -> None:
        """Boit un élixir : son effet commence, ou se prolonge s'il est déjà en cours."""
        now = now or now_ms()
        if elixir_id not in L.ELIXIRS:
            raise GameError("Ce n'est pas un élixir.")
        if self.qty(elixir_id) < 1:
            raise GameError("Vous n'en avez plus.")
        self.take_item(elixir_id, 1)
        effects = {k: v for k, v in (self.p.effects or {}).items() if v > now}
        effects[elixir_id] = max(now, effects.get(elixir_id, 0)) + L.ELIXIRS[elixir_id]["minutes"] * 60_000
        self.p.effects = effects

    # ---- grands projets ---------------------------------------------------

    def project_stage(self, project_id: str) -> int:
        return (self.p.projects or {}).get(project_id, {}).get("stage", 0)

    def contribute(self, project_id: str, item: str, qty: int) -> None:
        """Donne miel ou objets à l'étape en cours ; l'étape s'achève quand tout est réuni."""
        if project_id not in PR.PROJECTS:
            raise GameError("Projet inconnu.")
        projects = dict(self.p.projects or {})
        entry = dict(projects.get(project_id) or {"stage": 0, "given": {}})
        cost = PR.stage_cost(project_id, entry["stage"])
        if cost is None:
            raise GameError("Ce projet est déjà achevé.")
        need = cost["honey"] if item == "honey" else cost["items"].get(item)
        if need is None:
            raise GameError("Cette étape ne demande pas cet objet.")
        given = dict(entry.get("given") or {})
        qty = min(qty, need - given.get(item, 0))
        if qty <= 0:
            raise GameError("Cette part est déjà complète.")
        if item == "honey":
            if self.p.honey < qty:
                raise GameError("Pas assez de miel.")
            self.p.honey -= qty
        else:
            self.take_item(item, qty)
        given[item] = given.get(item, 0) + qty
        done = given.get("honey", 0) >= cost["honey"] and all(given.get(i, 0) >= n for i, n in cost["items"].items())
        entry = {"stage": entry["stage"] + 1, "given": {}} if done else {**entry, "given": given}
        projects[project_id] = entry
        self.p.projects = projects

    # ---- expéditions -------------------------------------------------------

    def _expeditions(self) -> dict:
        data = dict(self.p.expeditions or {})
        data.setdefault("teams", [])
        data.setdefault("log", [])
        data.setdefault("counter", 0)
        return data

    def launch_expedition(self, region_id: str, bee_ids: list[str], now: int | None = None) -> None:
        now = now or now_ms()
        self.expeditions_tick(now)
        stage = self.project_stage("outpost")
        if stage < 1:
            raise GameError("Il faut d'abord construire le Poste d'expédition (Grands projets).")
        region = X.REGIONS.get(region_id)
        if region is None:
            raise GameError("Région inconnue.")
        if region["tier"] > X.TIERS[stage]:
            raise GameError("Cette région demande un poste plus avancé.")
        data = self._expeditions()
        if len(data["teams"]) >= X.SLOTS[stage]:
            raise GameError("Toutes les équipes sont déjà parties.")
        if not 1 <= len(bee_ids) <= X.TEAM_MAX:
            raise GameError(f"Une équipe compte 1 à {X.TEAM_MAX} abeilles.")
        bees = [self._bee(i) for i in bee_ids]
        for bee in set(bees):
            if bees.count(bee) > bee.count:
                raise GameError("Pas assez d'abeilles de ce type en réserve.")
        members = [{"type": b.type, "genome": G.normalize(b.genome)} for b in bees]
        scores = [X.bee_score(m["genome"], region)["total"] for m in members]
        for bee in bees:
            self._take_bee(bee)
        data["counter"] += 1
        data["teams"].append({
            "id": f"e{data['counter']}", "region": region_id, "bees": members, "scores": scores,
            "chance": min(L.EXPEDITION_MAX_CHANCE, X.team_chance(scores) + self._effect("expedition", now, 0.0)), "start_ms": now, "end_ms": now + region["minutes"] * X.MINUTE,
        })
        self.p.expeditions = data

    def expeditions_tick(self, now: int | None = None) -> None:
        """Ramène les équipes dont le voyage est fini : butin, fragment, espèce sauvage, abeilles."""
        now = now or now_ms()
        data = self._expeditions()
        due = [t for t in data["teams"] if t["end_ms"] <= now]
        if not due:
            return
        stage = max(1, self.project_stage("outpost"))
        for team in sorted(due, key=lambda t: t["end_ms"]):
            data["teams"].remove(team)
            result = X.resolve(team, random.Random(f"{self.p.id}:{team['id']}"), stage)
            for item, n in result["loot"].items():
                self.add_item(item, n)
            for i, member in enumerate(team["bees"]):
                if i not in result["lost"]:
                    self.add_bee(member["type"], member["genome"])
            if result["fragment"]:
                self._add_fragment(*result["fragment"])
            if result["wild"]:
                genome = G.pure_genome(result["wild"])
                self.add_bee("princess", genome)
                self.add_bee("drone", genome)
            A.bump(self.p, "expeditions")
            report = {"id": team["id"], "region": team["region"], "end_ms": team["end_ms"], "chance": team["chance"],
                      "bees": [m["genome"]["species"][0] for m in team["bees"]], **result}
            data["log"] = [report, *data["log"]][: X.LOG_SIZE]
        self.p.expeditions = data

    def _add_fragment(self, chromosome: str, allele: str) -> None:
        """Un fragment de gène rapporté d'expédition, comme une extraction réussie."""
        lab = self._lab_state()
        key = f"{chromosome}:{allele}"
        got = lab["fragments"].get(key, 0) + 1
        if got >= LAB.fragments_needed(chromosome, allele):
            lab["fragments"].pop(key, None)
            self._add_doses(chromosome, allele, LAB.DOSES)
            self._lab_log(lab, f"Gène complet grâce à une expédition : {self._gene_label(chromosome, allele)}.")
        else:
            lab["fragments"][key] = got
        self.p.lab = lab

    def _forecast(self, t: int) -> list[dict]:
        """Météo des prochaines périodes, par biome (Observatoire)."""
        period = W.HOUR_MS * W.WEATHER_HOURS
        first = t // period + 1
        sky = self._sky()
        return [
            {"in_ms": (first + k) * period - t,
             "weather": {b: W.weather((first + k) * period, s["temp"], sky.get(b)) for b, s in C.BIOMES.items()}}
            for k in range(PR.FORECAST_PERIODS)
        ]

    def _mutations_now(self, hive: Hive, mods: dict, t: int, world: dict) -> list[dict]:
        """Mutations dont les parents et les conditions sont réunis en ce moment dans la ruche (Observatoire)."""
        if not hive.queen:
            return []
        queen, mate = G.normalize(hive.queen["genome"]), G.normalize(hive.queen["mate"])
        pairs = {frozenset((a, b)) for a in queen["species"] for b in mate["species"]}
        ctx = {**self._hive_ctx(hive, mods, t, world), "temp": mods["temp"], "queen": queen}
        mult = mods["mutation"] * G.value(queen, "stability")
        return [
            {"result": m["result"], "chance": min(1.0, m["chance"] * mult)}
            for m in C.MUTATIONS
            if frozenset((m["a"], m["b"])) in pairs and G.cond_ok(m.get("cond") or {}, ctx)
        ]

    # ---- boutique et usine ------------------------------------------------

    def _hives_bought(self) -> int:
        """Ruches achetées, quel que soit leur type (celles du départ sont offertes)."""
        return len(self.hives) - len(C.STARTER_BIOMES)

    def offer_cost(self, offer: dict, owned: int | None = None) -> dict:
        """Prix d'une offre ; `owned` remplace le nombre d'exemplaires déjà possédés."""
        if owned is None:
            # Rucher et alvéaire augmentent ensemble, à chaque ruche achetée
            owned = (self._hives_bought() if offer["kind"] == "hive"
                     else self._machine_qty(offer["machine"]) if offer["kind"] == "machine" else 0)
        # Le miel et les ressources augmentent ensemble à chaque exemplaire possédé
        factor = offer.get("scale", 1) ** max(0, owned)
        items = {item: round(n * factor) for item, n in offer.get("items", {}).items()}
        return {"honey": round(offer["honey"] * factor), "items": items}

    def offer_lock(self, offer: dict) -> str | None:
        need = offer.get("min_species", 0)
        if len(self.discovered) < need:
            return f"Découvrez {need} espèces ({len(self.discovered)}/{need})."
        if offer.get("requires_unlock") == "genetics" and (self.p.lab_level or 0) < 1:
            return "Nécessite le laboratoire de génétique."
        if offer["kind"] == "machine" and "max" in offer and self._machine_qty(offer["machine"]) >= offer["max"]:
            return "Maximum atteint."
        return None

    def buy(self, offer_id: str, qty: int = 1, biome: str = "plains") -> None:
        offer = C.OFFERS.get(offer_id)
        if offer is None:
            raise GameError("Offre inconnue.")
        lock = self.offer_lock(offer)
        if lock:
            raise GameError(lock)
        kind = offer["kind"]
        if kind not in ("bee", "item"):
            qty = 1
        if kind == "hive" and biome not in C.BIOMES:
            raise GameError("Biome inconnu.")
        self.pay(self.offer_cost(offer), qty)
        if kind == "bee":
            self.add_bee(offer["type"], G.pure_genome(offer["species"]), qty)
        elif kind == "item":
            self.add_item(offer["item"], qty)
        elif kind == "hive":
            same = sum(1 for h in self.hives if h.hive_type == offer["hive_type"] and h.biome == biome)
            hive = _new_hive(self.p, offer["hive_type"], biome, len(self.hives), same + 1)
            self.db.add(hive)
            self.hives.append(hive)
            if {h.biome for h in self.hives} >= set(C.BIOMES):
                A.unlock(self.p, "all_biomes")
        elif kind == "machine":
            machine = self.machines.get(offer["machine"])
            if machine is None:
                machine = Machine(player_id=self.p.id, machine_id=offer["machine"], qty=0)
                self.db.add(machine)
                self.machines[offer["machine"]] = machine
            machine.qty += 1

    def sell_item(self, item: str, qty: int) -> None:
        price = C.ITEMS.get(item, {}).get("sell", 0)
        if not price:
            raise GameError("Cet objet ne se vend pas.")
        self.take_item(item, qty)
        self.p.honey += price * qty

    def sell_bee(self, bee_id: str, qty: int) -> None:
        bee = self._bee(bee_id)
        price = C.BEE_SELL[bee.type]
        if bee.type == "drone" and A.bump(self.p, "drones_sold", qty) >= 100:
            A.unlock(self.p, "drones_100")
        self._take_bee(bee, qty)
        self.p.honey += price * qty

    @property
    def manual_batch(self) -> int:
        """Rayons traités par geste à la main, selon le niveau de la manivelle renforcée."""
        return C.MANUAL_BATCHES[min(self._machine_qty("manual_press"), len(C.MANUAL_BATCHES) - 1)]

    def process_manual(self, comb: str, qty: int) -> None:
        if comb not in C.RECIPES:
            raise GameError("Ce n'est pas un rayon.")
        n = min(qty, self.manual_batch, self.qty(comb))
        if n <= 0:
            raise GameError("Vous n'avez plus de ce rayon.")
        self._process(comb, n)
        A.unlock(self.p, "first_manual")
        if A.bump(self.p, "manual", n) >= 100:
            A.unlock(self.p, "manual_100")

    def rescue_available(self) -> bool:
        if self.p.honey >= C.OFFERS["bee:forest:princess"]["honey"] + C.OFFERS["bee:forest:drone"]["honey"]:
            return False
        if any(h.queen for h in self.hives):
            return False
        types = {b.type for b in self.bees}
        return not {"princess", "drone"} <= types

    def rescue(self) -> None:
        if not self.rescue_available():
            raise GameError("L'aide de secours n'est pas disponible.")
        genome = G.pure_genome("forest")
        self.add_bee("princess", genome)
        self.add_bee("drone", genome)
        A.unlock(self.p, "rescued")

    # ---- génétique --------------------------------------------------------

    @property
    def genes(self) -> set[tuple[str, str]]:
        return set(self.gene_rows)

    @property
    def lab_level(self) -> int:
        return self.p.lab_level or 0

    def _require_lab(self, level: int = 1) -> None:
        if self.lab_level < level:
            raise GameError(f"Il faut le laboratoire niveau {level} ({LAB.LEVELS[level]['label']}).")

    def _lab_state(self) -> dict:
        # Copie profonde : modifier une opération sur place laisserait la colonne JSON identique à l'ancienne valeur
        lab = copy.deepcopy(self.p.lab or {})
        lab.setdefault("fragments", {})
        lab.setdefault("log", [])
        # Avant les paillasses supplémentaires, une seule opération à la fois
        old = lab.pop("job", None)
        lab["jobs"] = list(lab.get("jobs") or ([old] if old else []))
        # Repère stable d'une opération ; une chaîne le garde d'une abeille à la suivante
        for job in lab["jobs"]:
            job.setdefault("id", str(job["start_ms"]))
        return lab

    def _machine_qty(self, machine_id: str) -> int:
        machine = self.machines.get(machine_id)
        return machine.qty if machine else 0

    @property
    def lab_benches(self) -> int:
        return 1 + self._machine_qty("lab_bench")

    def _lab_log(self, lab: dict, text: str) -> None:
        lab["log"] = [text, *lab["log"]][: LAB.LOG_SIZE]

    def _gene_label(self, chromosome: str, allele: str) -> str:
        value = C.SPECIES[allele]["label"] if chromosome == "species" else C.ALLELES[chromosome][allele]["label"]
        return f"{C.CHROMOSOMES[chromosome]} « {value} »"

    def _start_job(self, lab: dict, job: dict, seconds: int, now: int) -> None:
        if len(lab["jobs"]) >= self.lab_benches:
            raise GameError("Toutes les paillasses sont occupées : attendez la fin d'une opération.")
        lab["jobs"].append({**job, "id": _uuid(), "start_ms": now, "ready_ms": now + seconds * 1000})

    def lab_tick(self, now: int | None = None) -> None:
        """Termine, dans l'ordre, les opérations dont le temps est écoulé (et relance les chaînes)."""
        now = now or now_ms()
        lab = self._lab_state()
        done = False
        while due := [j for j in lab["jobs"] if j["ready_ms"] <= now]:
            job = min(due, key=lambda j: j["ready_ms"])
            lab["jobs"].remove(job)
            self._finish_job(lab, job)
            done = True
        if done:
            self.p.lab = lab

    def _finish_job(self, lab: dict, job: dict) -> None:
        chromosome, allele = job.get("chromosome"), job.get("allele")
        if job["op"] == "extract":
            complete = False
            if self.rng.random() < LAB.EXTRACT_FAIL:
                self._lab_log(lab, f"Extraction ratée : {self._gene_label(chromosome, allele)}. L'échantillon est perdu.")
            else:
                key = f"{chromosome}:{allele}"
                need = LAB.fragments_needed(chromosome, allele)
                got = lab["fragments"].get(key, 0) + 1
                A.bump(self.p, "extracts")
                if got >= need:
                    complete = True
                    lab["fragments"].pop(key, None)
                    self._add_doses(chromosome, allele, LAB.DOSES)
                    A.unlock(self.p, "first_extract")
                    self._lab_log(lab, f"Gène complet : {self._gene_label(chromosome, allele)} (+{LAB.DOSES} doses).")
                else:
                    lab["fragments"][key] = got
                    self._lab_log(lab, f"Fragment obtenu : {self._gene_label(chromosome, allele)} ({got}/{need}).")
            if job.get("chain") and not complete:
                self._chain_next(lab, job)
        elif job["op"] == "imprint":
            self.add_bee(job["type"], job["genome"])
            A.unlock(self.p, "first_imprint")
            A.bump(self.p, "imprints")
            self._lab_log(lab, "Impression terminée : l'abeille est revenue dans la réserve.")
        elif job["op"] == "replicate":
            self._add_doses(chromosome, allele, LAB.DOSES)
            self._lab_log(lab, f"Réplication terminée : {self._gene_label(chromosome, allele)} (+{LAB.DOSES} doses).")

    def _chain_next(self, lab: dict, job: dict) -> None:
        """Extraction en chaîne : la paillasse reprend une abeille identique dès que la précédente est traitée."""
        bee = next((b for b in self.bees if b.hive_id is None and b.type == job["bee_type"]
                    and b.genome_hash == job["bee_hash"] and b.count > 0), None)
        if bee is None or self.qty("labware") < 1:
            reason = "plus d'abeille identique en réserve" if bee is None else "plus de verrerie"
            self._lab_log(lab, f"Chaîne arrêtée ({reason}) : {self._gene_label(job['chromosome'], job['allele'])}.")
            return
        self.take_item("labware", 1)
        self._take_bee(bee)
        start = job["ready_ms"]
        lab["jobs"].append({**job, "start_ms": start, "ready_ms": start + LAB.EXTRACT_SECONDS * 1000})

    def _add_doses(self, chromosome: str, allele: str, n: int) -> None:
        row = self.gene_rows.get((chromosome, allele))
        if row is None:
            row = PlayerGene(player_id=self.p.id, chromosome=chromosome, allele=allele, doses=0)
            self.db.add(row)
            self.gene_rows[(chromosome, allele)] = row
        row.doses = (row.doses or 0) + n

    def upgrade_lab(self) -> None:
        level = self.lab_level + 1
        if level not in LAB.LEVELS:
            raise GameError("Le laboratoire est déjà au niveau maximum.")
        spec = LAB.LEVELS[level]
        need = spec["min_species"]
        if len(self.discovered) < need:
            raise GameError(f"Découvrez {need} espèces ({len(self.discovered)}/{need}).")
        self.pay(spec["cost"])
        self.p.lab_level = level

    def extract_gene(self, bee_id: str, chromosome: str, now: int | None = None, chain: bool = False) -> None:
        now = now or now_ms()
        self.lab_tick(now)
        self._require_lab(1)
        if chromosome not in C.CHROMOSOMES:
            raise GameError("Chromosome inconnu.")
        if not LAB.can_extract(self.lab_level, chromosome):
            raise GameError("Ce gène demande un laboratoire plus avancé.")
        if chain and not self._machine_qty("lab_chain"):
            raise GameError("L'extraction en chaîne demande le passeur d'échantillons.")
        lab = self._lab_state()
        bee = self._bee(bee_id)
        allele = G.normalize(bee.genome)[chromosome][0]
        # L'abeille est notée même sans chaîne : on peut l'enclencher pendant l'extraction
        job = {"op": "extract", "chromosome": chromosome, "allele": allele, "chain": chain,
               "bee_type": bee.type, "bee_hash": bee.genome_hash}
        self._start_job(lab, job, LAB.EXTRACT_SECONDS, now)
        self.take_item("labware", 1)
        self._take_bee(bee)
        self.p.lab = lab

    def set_chain(self, job_id: str, on: bool, now: int | None = None) -> None:
        """Enclenche ou coupe la chaîne d'une extraction en cours."""
        self.lab_tick(now)
        if on and not self._machine_qty("lab_chain"):
            raise GameError("L'extraction en chaîne demande le passeur d'échantillons.")
        lab = self._lab_state()
        job = next((j for j in lab["jobs"] if j["op"] == "extract" and j["id"] == job_id), None)
        if job is None:
            raise GameError("Cette extraction est déjà terminée.")
        if on and not job.get("bee_hash"):
            raise GameError("Cette extraction ne peut pas passer en chaîne.")
        job["chain"] = on
        self.p.lab = lab

    def imprint(self, bee_id: str, genes: dict[str, str], now: int | None = None) -> None:
        now = now or now_ms()
        self.lab_tick(now)
        self._require_lab(2)
        if not genes:
            raise GameError("Choisissez au moins un gène.")
        for chromosome, allele in genes.items():
            if chromosome not in C.CHROMOSOMES or not G.allele_exists(chromosome, allele):
                raise GameError("Gène inconnu.")
            if not LAB.can_imprint(self.lab_level, chromosome):
                raise GameError("Ce gène demande un laboratoire plus avancé.")
            row = self.gene_rows.get((chromosome, allele))
            if row is None or (row.doses or 0) < 1:
                raise GameError(f"Plus de dose pour {self._gene_label(chromosome, allele)}.")
        bee = self._bee(bee_id)
        genome = {c: list(a) for c, a in G.normalize(bee.genome).items()}
        # Seule la copie active change : il faudra élever pour fixer le caractère
        for chromosome, allele in genes.items():
            genome[chromosome][0] = allele
        if genome == bee.genome:
            raise GameError("Cette abeille possède déjà ces gènes.")
        lab = self._lab_state()
        self._start_job(lab, {"op": "imprint", "type": bee.type, "genome": genome}, LAB.IMPRINT_SECONDS, now)
        self.pay(LAB.imprint_cost(genes))
        for chromosome, allele in genes.items():
            self.gene_rows[(chromosome, allele)].doses -= 1
        self._take_bee(bee)
        self.p.lab = lab

    def replicate(self, chromosome: str, allele: str, now: int | None = None) -> None:
        now = now or now_ms()
        self.lab_tick(now)
        self._require_lab(2)
        if (chromosome, allele) not in self.gene_rows:
            raise GameError("Ce gène n'est pas dans votre banque.")
        lab = self._lab_state()
        self._start_job(lab, {"op": "replicate", "chromosome": chromosome, "allele": allele}, LAB.REPLICATE_SECONDS, now)
        self.pay(LAB.replicate_cost(chromosome, allele))
        self.p.lab = lab

    # ---- sérialisation ----------------------------------------------------

    # ---- carnet d'objectifs -----------------------------------------------

    def objective_progress(self, objective: dict) -> int:
        kind = objective["kind"]
        if kind == "species":
            return len(self.discovered)
        if kind == "branch":
            return sum(1 for s in self.discovered if s in C.SPECIES and C.SPECIES[s]["branch"] == objective["branch"])
        if kind == "hives":
            return len(self.hives)
        if kind == "genes":
            return len(self.genes)
        return 0

    # ---- trophées et pedigree --------------------------------------------

    def trophy_value(self, trophy: dict) -> int:
        """Valeur actuelle de la mesure suivie par un trophée."""
        metric = trophy["metric"]
        stats = self.p.stats or {}
        events = self.p.achievements or {}
        if metric == "species":
            return len(self.discovered & set(C.SPECIES))
        if metric == "branches":
            return sum(1 for members in T.BRANCHES.values() if all(s in self.discovered for s in members))
        if metric == "hives":
            return len(self.hives)
        if metric == "biomes":
            return len({h.biome for h in self.hives})
        if metric == "genes":
            return len(self.genes)
        if metric in ("combs", "honey", "manual", "drones_sold", "extracts", "imprints", "generation", "orders", "prestige_orders"):
            return stats.get(metric, 0)
        if metric == "expeditions":
            return stats.get("expeditions", 0)
        if metric == "mythic_species":
            return sum(1 for s in T.MYTHIC if s in self.discovered)
        if metric == "wild_species":
            return sum(1 for s in T.WILD if s in self.discovered)
        if metric == "museum_branches":
            return len(self._museum_done())
        if metric == "world_hive_level":
            return self._world_hive()["level"]
        if metric == "elixirs":
            return stats.get("elixirs", 0)
        if metric == "project_stages":
            return sum(p.get("stage", 0) for p in (self.p.projects or {}).values())
        if metric == "reputation_level":
            return O.level_of(self.p.reputation or 0)
        if metric.startswith("events:"):
            return sum(1 for e in T.EVENT_SETS[metric[7:]] if e in events)
        if metric.startswith("event:"):
            return int(metric[6:] in events)
        if metric.startswith("pedigree:"):
            need = int(metric[9:])
            return sum(1 for level in (self.p.pedigree or {}).values() if level >= need)
        if metric == "showcases":
            return self.db.scalar(select(func.count()).select_from(Showcase).where(Showcase.player_id == self.p.id)) or 0
        if metric == "likes":
            return self.db.scalar(
                select(func.count()).select_from(ShowcaseLike).join(Showcase, Showcase.id == ShowcaseLike.showcase_id)
                .where(Showcase.player_id == self.p.id)
            ) or 0
        return 0

    def _ensure_trophies(self) -> None:
        """Première lecture depuis les trophées : conversion des objectifs et succès, sans perte ni doublon.

        Un objectif atteint mais pas encore réclamé est payé maintenant. Ensuite, chaque palier déjà
        atteint est marqué comme reçu : les objectifs et succès d'avant l'ont déjà récompensé.
        """
        if self.p.trophies is not None:
            return
        claimed = set(self.p.claimed or [])
        for oid, objective in C.OBJECTIVES.items():
            if oid not in claimed and self.objective_progress(objective) >= objective["target"]:
                self.p.honey += objective["reward"]["honey"]
                for item, n in objective["reward"]["items"].items():
                    self.add_item(item, n)
                claimed.add(oid)
        self.p.claimed = sorted(claimed)
        self.p.trophies = {tid: T.reached(trophy, self.trophy_value(trophy)) for tid, trophy in T.TROPHIES.items()}

    def claim_trophy(self, trophy_id: str) -> None:
        """Réclame tous les paliers atteints et pas encore reçus d'un trophée."""
        self._ensure_trophies()
        trophy = T.TROPHIES.get(trophy_id)
        if trophy is None:
            raise GameError("Trophée inconnu.")
        got = dict(self.p.trophies or {})
        done = got.get(trophy_id, 0)
        reached = T.reached(trophy, self.trophy_value(trophy))
        if reached <= done:
            raise GameError("Pas de nouveau palier à réclamer.")
        for tier in trophy["tiers"][done:reached]:
            self.p.honey += tier["reward"]["honey"]
            for item, n in tier["reward"]["items"].items():
                self.add_item(item, n)
        got[trophy_id] = reached
        self.p.trophies = got

    # ---- comptoir -----------------------------------------------------------

    def _orders_ctx(self) -> dict:
        """Ce que le joueur peut déjà fournir : espèces découvertes, allèles possédés, pedigree."""
        alleles: dict[str, set[str]] = {}
        for bee in self.bees:
            for c, pair in G.normalize(bee.genome).items():
                alleles.setdefault(c, set()).update(pair)
        for c, a in self.genes:
            alleles.setdefault(c, set()).add(a)
        return {
            "discovered": self.discovered & set(C.SPECIES),
            "reserve": {G.normalize(b.genome)["species"][0] for b in self.bees if b.hive_id is None},
            "alleles": alleles,
            "pedigree": {**(self.p.pedigree or {})},
            "level": O.level_of(self.p.reputation or 0),
        }

    def orders_board(self, now: int | None = None) -> dict:
        """Tableau des commandes, complété à la lecture : commandes échues remplacées, places libres pourvues."""
        now = now or now_ms()
        data = dict(self.p.orders or {})
        counter = data.get("counter", 0)
        # Tableau neuf : tous les premiers clients arrivent ensemble ; ensuite, un par un
        fresh = not data.get("slots")
        slots = [dict(s) for s in data.get("slots") or []]
        # Heure d'arrivée du prochain client (None : aucune place libre). Avant la 1.15, chaque place libre
        # avait la sienne : on reprend la plus proche.
        if "next_ms" in data:
            next_ms = data["next_ms"]
        else:
            waiting = [s["ready_ms"] for s in slots if not s.get("order") and s.get("ready_ms") is not None]
            next_ms = min(waiting) if waiting else None
        level = O.level_of(self.p.reputation or 0)
        while len(slots) < O.slots_for(level):
            slots.append({"order": None})
            next_ms = now if next_ms is None else next_ms
        expired = [s["order"]["expires_ms"] for s in slots if s.get("order") and s["order"]["expires_ms"] <= now]
        if expired:
            slots = [s if s.get("order") and s["order"]["expires_ms"] > now else {"order": None} for s in slots]
            # Le premier client attendu arrive après la première commande échue
            if next_ms is None:
                next_ms = min(expired) + O.REFILL_DELAY
        ctx = None
        for i, slot in enumerate(slots):
            if slot.get("order"):
                continue
            if not fresh and (next_ms is None or next_ms > now):
                break
            ctx = ctx or self._orders_ctx()
            counter += 1
            order = O.generate(random.Random(f"{self.p.id}:{counter}"), ctx, now)
            if not order:
                counter -= 1
                break
            slots[i] = {"order": {**order, "id": f"o{counter}", "expires_ms": now + O.ORDER_LIFETIME}}
            if not fresh:
                next_ms += O.REFILL_DELAY
        if all(s.get("order") for s in slots):
            next_ms = None
        elif fresh or next_ms is None:
            next_ms = now + O.REFILL_DELAY
        O.schedule(slots, next_ms)
        prestige = data.get("prestige")
        week = O.week_key(now)
        if level >= 1 and (not prestige or prestige.get("week") != week):
            ctx = ctx or self._orders_ctx()
            order = O.generate(random.Random(f"{self.p.id}:{week}"), ctx, now, prestige=True)
            prestige = {"week": week, "done": False, "order": order and {**order, "id": f"p{week}", "expires_ms": O.week_end(now)}}
        new = {"counter": counter, "slots": slots, "next_ms": next_ms, "prestige": prestige}
        if new != self.p.orders:
            self.p.orders = new
        return new

    def _find_order(self, board: dict, order_id: str) -> tuple[dict, int | None]:
        for i, slot in enumerate(board["slots"]):
            if slot.get("order") and slot["order"]["id"] == order_id:
                return slot["order"], i
        prestige = board.get("prestige")
        if prestige and prestige.get("order") and prestige["order"]["id"] == order_id and not prestige.get("done"):
            return prestige["order"], None
        raise GameError("Cette commande n'est plus disponible.")

    def _bee_fits(self, bee: Bee, want: dict) -> bool:
        genome = G.normalize(bee.genome)
        return (
            bee.type == want["type"]
            and genome["species"][0] == want["species"]
            and all(genome[c][0] == a for c, a in want["alleles"].items())
        )

    def deliver_order(self, order_id: str, bee_id: str | None = None, now: int | None = None) -> None:
        now = now or now_ms()
        board = self.orders_board(now)
        order, index = self._find_order(board, order_id)
        # Tout vérifier avant de prendre quoi que ce soit
        for item, n in (order.get("items") or {}).items():
            if self.qty(item) < n:
                raise GameError(f"Il manque : {C.ITEMS[item]['label']} ×{n - self.qty(item)}")
        bee = None
        if order.get("bee"):
            if not bee_id:
                raise GameError("Choisissez l'abeille à livrer.")
            bee = self._bee(bee_id)
            if not self._bee_fits(bee, order["bee"]):
                raise GameError("Cette abeille ne correspond pas à la commande.")
        if order.get("pedigree"):
            want = order["pedigree"]
            if (self.p.pedigree or {}).get(want["species"], 0) < want["level"]:
                raise GameError("Le pedigree demandé n'est pas encore certifié.")
        for item, n in (order.get("items") or {}).items():
            self.take_item(item, n)
        if bee:
            self._take_bee(bee)
        self.p.honey += order["reward"]["honey"]
        for item, n in order["reward"]["items"].items():
            self.add_item(item, n)
        self.p.reputation = (self.p.reputation or 0) + order["rep"]
        A.bump(self.p, "orders")
        if index is None:
            A.bump(self.p, "prestige_orders")
            board["prestige"] = {**board["prestige"], "done": True}
        else:
            self._free_order_slot(board, index, now)
        self.p.orders = {**board, "slots": [dict(s) for s in board["slots"]]}

    def _free_order_slot(self, board: dict, index: int, now: int) -> None:
        """Libère une place : le prochain client arrive dans REFILL_DELAY, sauf s'il est déjà attendu."""
        board["slots"][index] = {"order": None}
        if board.get("next_ms") is None:
            board["next_ms"] = now + O.REFILL_DELAY
        O.schedule(board["slots"], board["next_ms"])

    def discard_order(self, order_id: str, now: int | None = None) -> None:
        now = now or now_ms()
        board = self.orders_board(now)
        order, index = self._find_order(board, order_id)
        if index is None:
            raise GameError("La commande de prestige ne se refuse pas : elle repart à la fin de la semaine.")
        self._free_order_slot(board, index, now)
        self.p.orders = {**board, "slots": [dict(s) for s in board["slots"]]}

    def certify(self, bee_id: str) -> int:
        """Présente une abeille au jury : son niveau de pedigree devient acquis pour l'espèce s'il est meilleur."""
        bee = self._bee(bee_id)
        genome = G.normalize(bee.genome)
        level = T.pedigree_level(genome)
        if level == 0:
            raise GameError("Une abeille hybride ne peut pas être certifiée : son gène d'espèce doit être pur.")
        species = genome["species"][0]
        pedigree = dict(self.p.pedigree or {})
        if pedigree.get(species, 0) >= level:
            raise GameError(f"Cette espèce est déjà certifiée « {T.PEDIGREE_LEVELS[pedigree[species]]['label']} ».")
        pedigree[species] = level
        self.p.pedigree = pedigree
        return level

    # ---- sérialisation ----------------------------------------------------

    def _hive_status(self, hive: Hive, mods: dict, t_ms: int) -> str:
        queen = hive.queen
        if not queen:
            return "empty"
        genome = G.normalize(queen["genome"])
        if not G.climate_ok(genome, mods["temp"]):
            return "climate"
        if not mods["light"] and W.hour(t_ms) not in W.ACTIVITY_HOURS[genome["activity"][0]]:
            return "resting"
        sheltered = mods["shelter"] or genome["weatherproof"][0] == "yes"
        if not sheltered and self._weather(hive, t_ms) != "clear":
            return "weather"
        return "working"

    def secret(self, code: str) -> None:
        """Succès secret déclenché par l'interface (code Konami, logo…)."""
        if code not in A.CLIENT_SECRETS:
            raise GameError("Rien à voir ici.")
        A.unlock(self.p, code)

    def _passive_achievements(self, t: int, statuses: list[tuple[Hive, str]]) -> None:
        """Succès qui dépendent de l'état du rucher ou du monde, vérifiés à chaque lecture."""
        for hive, status in statuses:
            if status != "working":
                continue
            weather = self._weather(hive, t)
            if weather == "storm":
                A.unlock(self.p, "storm_worker")
            if weather == "snow":
                A.unlock(self.p, "snow_worker")
            if W.phase(t) == "night":
                A.unlock(self.p, "night_worker")
        best = max((h.queen.get("generation", 1) for h in self.hives if h.queen), default=0)
        A.record(self.p, "generation", best)
        if best >= 10:
            A.unlock(self.p, "generation_10")
        if best >= 50:
            A.unlock(self.p, "generation_50")
        genomes = [b.genome for b in self.bees] + [h.queen["genome"] for h in self.hives if h.queen]
        if any(g["species"][0] != g["species"][1] for g in genomes):
            A.unlock(self.p, "hybrid")
        actives = {g.get("stability", ["normal"])[0] for g in genomes}
        if "pure" in actives:
            A.unlock(self.p, "pure_stability")
        if "chaotic" in actives:
            A.unlock(self.p, "chaotic_stability")
        if W.hour(t) == 0:
            A.unlock(self.p, "midnight")
        if self.p.honey == 0:
            A.unlock(self.p, "broke")
        likes = self.db.scalar(
            select(func.count()).select_from(ShowcaseLike).join(Showcase, Showcase.id == ShowcaseLike.showcase_id)
            .where(Showcase.player_id == self.p.id)
        )
        if likes >= 10:
            A.unlock(self.p, "liked_10")

    def state(self) -> dict:
        self.db.flush()
        t = now_ms()
        self.lab_tick(t)
        self.expeditions_tick(t)
        self._passive_achievements(t, [(h, self._hive_status(h, self._mods(h), t)) for h in self.hives])
        self._ensure_trophies()
        observatory = self.project_stage("observatory")
        world = self._world_ctx()
        hives = []
        for hive in self.hives:
            mods = self._mods(hive)
            queen = hive.queen
            status = self._hive_status(hive, mods, t)
            hives.append({
                "id": hive.id,
                "name": hive.name,
                "hive_type": hive.hive_type,
                "biome": hive.biome,
                "slots": hive.slots,
                "slot_cost": self.slot_cost(hive),
                "upgrade_cost": self.upgrade_cost(hive),
                "modules": hive.modules or [],
                "wear": self._wear(hive),
                "queen": queen,
                "output": hive.output or {},
                "keep_drones": bool((hive.settings or {}).get("keep_drones")),
                "reuse_drone": bool((hive.settings or {}).get("reuse_drone", True)),
                "line_drone": self._line_drone_state(hive),
                "greenhouse": self._greenhouse_spot(hive),
                "loadout": (hive.settings or {}).get("loadout") if hive.hive_type == "robo" else None,
                "mutations_now": self._mutations_now(hive, mods, t, world) if observatory >= 2 else None,
                "mods": mods,
                "status": status,
            })
        genes: dict[str, list[str]] = {c: [] for c in C.CHROMOSOMES}
        for chromosome, allele in sorted(self.genes):
            genes.setdefault(chromosome, []).append(allele)
        return {
            "player": {
                "id": self.p.id,
                "username": self.p.username,
                "honey": self.p.honey,
            },
            "lab": {**self._lab_state(), "level": self.lab_level, "benches": self.lab_benches, "chain": self._machine_qty("lab_chain") > 0},
            "gene_bank": {c: {a: row.doses for (cc, a), row in sorted(self.gene_rows.items()) if cc == c} for c in C.CHROMOSOMES},
            "server_time": t,
            "cycle_seconds": settings.cycle_seconds,
            "world": W.snapshot(t, C.BIOMES, self._sky()),
            "sky": {b: f for b, f in self._sky().items() if f["until"] > t},
            "manual_batch": self.manual_batch,
            "badges": B.player_badges(self.discovered, self.p.trophies),
            "achievements": dict(self.p.achievements or {}),
            "stats": dict(self.p.stats or {}),
            "trophies": {
                tid: {"progress": self.trophy_value(trophy), "claimed": (self.p.trophies or {}).get(tid, 0)}
                for tid, trophy in T.TROPHIES.items()
            },
            "pedigree": dict(self.p.pedigree or {}),
            "projects": {pid: {"stage": self.project_stage(pid), "given": (self.p.projects or {}).get(pid, {}).get("given", {})}
                         for pid in PR.PROJECTS},
            "forecast": self._forecast(t) if observatory >= 1 else None,
            "expeditions": {**self._expeditions(), "stage": self.project_stage("outpost")},
            "museum": {"given": dict(self.p.museum or {}), "complete": sorted(self._museum_done()),
                       "jar_full": L.jar_full(self.p.museum or {})},
            "world_hive": {**self._world_hive(), "multiplier": L.world_multiplier(self._world_hive()["level"])},
            "effects": {k: v for k, v in (self.p.effects or {}).items() if v > t},
            "orders": {
                **self.orders_board(t),
                "reputation": self.p.reputation or 0,
                "level": O.level_of(self.p.reputation or 0),
            },
            "inventory": {item: row.qty for item, row in self.inv.items() if row.qty > 0},
            "worn_modules": self.p.worn_modules or {},
            "bees": [
                {"id": b.id, "type": b.type, "genome": b.genome, "count": b.count, "hive_id": b.hive_id}
                for b in self.bees
            ],
            "hives": hives,
            "machines": {m: row.qty for m, row in self.machines.items()},
            "factory": self._factory(),
            "discovered": sorted(self.discovered),
            "genes": genes,
            "offers": {
                oid: {"cost": self.offer_cost(offer), "lock": self.offer_lock(offer)}
                for oid, offer in C.OFFERS.items()
            },
            "rescue_available": self.rescue_available(),
        }
