"""État d'un joueur et actions de jeu.

La simulation est paresseuse : à chaque requête, on rejoue les cycles écoulés depuis
la dernière visite (ce qui donne aussi la progression hors-ligne).
"""

import random
import time

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ..config import settings
from ..models import Bee, Discovery, Hive, InventoryItem, Machine, Player, PlayerGene, Plot, _uuid
from . import content as C
from . import garden as GD
from . import genetics as G


class GameError(Exception):
    pass


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
        db.add(Discovery(player_id=player.id, kind="bee", species_id=species))


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
        rows = list(db.scalars(select(Bee).where(Bee.player_id == pid).order_by(Bee.created_at, Bee.id)))
        self.bees = [r for r in rows if r.kind == "bee"]
        # Pousses d'arbres et papillons : mêmes lignes que les abeilles, distinguées par `kind`
        self.flora = [r for r in rows if r.kind != "bee"]
        self.plots = list(db.scalars(select(Plot).where(Plot.player_id == pid).order_by(Plot.position, Plot.id)))
        self.found = {"tree": set(), "butterfly": set()}
        for kind, species in db.execute(select(Discovery.kind, Discovery.species_id).where(Discovery.player_id == pid, Discovery.kind != "bee")):
            self.found.setdefault(kind, set()).add(species)
        self.hives = list(db.scalars(select(Hive).where(Hive.player_id == pid).order_by(Hive.position, Hive.id)))
        self.machines = {r.machine_id: r for r in db.scalars(select(Machine).where(Machine.player_id == pid))}
        self.discovered = set(db.scalars(select(Discovery.species_id).where(Discovery.player_id == pid, Discovery.kind == "bee")))
        self.genes = {
            (r.chromosome, r.allele)
            for r in db.scalars(select(PlayerGene).where(PlayerGene.player_id == pid, PlayerGene.kind == "bee"))
        }
        for bee in self.bees:
            fixed = G.normalize(bee.genome)
            if fixed != bee.genome:
                bee.genome = fixed
                bee.genome_hash = G.genome_hash(fixed)
        if not self.plots:
            # Premier passage au jardin (nouveau joueur, ou compte créé avant le jardin)
            for i in range(GD.STARTER_PLOTS):
                plot = Plot(id=_uuid(), player_id=pid, position=i)
                db.add(plot)
                self.plots.append(plot)
            for species, count in GD.STARTER_SAPLINGS.items():
                self.add_specimen("tree", G.pure_genome(species, "tree"), count)

    # ---- inventaire -------------------------------------------------------

    def qty(self, item: str) -> int:
        row = self.inv.get(item)
        return row.qty if row else 0

    def add_item(self, item: str, n: int) -> None:
        if n <= 0:
            return
        if item == "honey":
            self.p.honey += n
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
                self.discovered.add(species)
                self.db.add(Discovery(player_id=self.p.id, kind="bee", species_id=species))

    # ---- jardin -----------------------------------------------------------

    def add_specimen(self, kind: str, genome: dict, count: int = 1) -> None:
        h = G.genome_hash(genome)
        for row in self.flora:
            if row.kind == kind and row.genome_hash == h:
                row.count += count
                break
        else:
            row = Bee(id=_uuid(), player_id=self.p.id, kind=kind, type="sapling" if kind == "tree" else kind,
                      genome=genome, genome_hash=h, count=count)
            self.db.add(row)
            self.flora.append(row)
        for species in genome["species"]:
            if species not in self.found[kind]:
                self.found[kind].add(species)
                self.db.add(Discovery(player_id=self.p.id, kind=kind, species_id=species))

    def _specimen(self, specimen_id: str, kind: str | None = None) -> Bee:
        for row in self.flora:
            if row.id == specimen_id and (kind is None or row.kind == kind):
                return row
        raise GameError("Introuvable dans le jardin.")

    def _take_specimen(self, row: Bee, n: int = 1) -> None:
        if row.count < n:
            raise GameError("Vous n'en avez pas assez.")
        row.count -= n
        if row.count == 0:
            self.flora.remove(row)
            if row in self.db.new:
                self.db.expunge(row)
            else:
                self.db.delete(row)

    def _plot(self, plot_id: str) -> Plot:
        for plot in self.plots:
            if plot.id == plot_id:
                return plot
        raise GameError("Parcelle introuvable.")

    def plant(self, plot_id: str, sapling_id: str, pollen_id: str) -> None:
        plot = self._plot(plot_id)
        if plot.tree:
            raise GameError("Cette parcelle est déjà occupée.")
        sapling = self._specimen(sapling_id, "tree")
        pollen = self._specimen(pollen_id, "tree")
        if sapling is pollen and sapling.count < 2:
            raise GameError("Il faut deux pousses : une à planter, une pour la pollinisation.")
        genome, mate = G.normalize(sapling.genome, "tree"), G.normalize(pollen.genome, "tree")
        self._take_specimen(sapling)
        self._take_specimen(pollen)
        growth = G.value(genome, "growth", "tree")
        plot.tree = {"genome": genome, "mate": mate, "health": growth, "max_health": growth}

    def harvest(self, plot_id: str) -> dict:
        plot = self._plot(plot_id)
        tree = plot.tree
        if not tree:
            raise GameError("Rien n'est planté ici.")
        if tree["health"] > 0:
            raise GameError("L'arbre n'est pas encore mûr.")
        genome, mate = tree["genome"], tree["mate"]
        gained: dict[str, int] = {}
        rate = G.value(genome, "yield", "tree")
        for item, chance in G.products(genome, "tree"):
            made = G.binomial(self.rng, tree["max_health"], min(1.0, chance * rate))
            if made:
                self.add_item(item, made)
                gained[item] = gained.get(item, 0) + made
        for _ in range(G.value(genome, "saplings", "tree")):
            self.add_specimen("tree", G.breed(genome, mate, self.rng, kind="tree"))
        butterflies = []
        for bid, butterfly in GD.BUTTERFLIES.items():
            if genome["species"][0] in butterfly["hosts"] and self.rng.random() < butterfly["chance"]:
                self.add_specimen("butterfly", {"species": [bid, bid]})
                butterflies.append(bid)
        plot.tree = None
        return {"items": gained, "butterflies": butterflies}

    def sell_specimen(self, specimen_id: str, qty: int) -> None:
        row = self._specimen(specimen_id)
        price = GD.SAPLING_SELL if row.kind == "tree" else GD.BUTTERFLIES[row.genome["species"][0]]["sell"]
        self._take_specimen(row, qty)
        self.p.honey += price * qty

    def _hive(self, hive_id: str) -> Hive:
        for hive in self.hives:
            if hive.id == hive_id:
                return hive
        raise GameError("Ruche introuvable.")

    def _mods(self, hive: Hive) -> dict:
        return G.hive_mods(hive.hive_type, hive.biome, hive.modules or [])

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
        else:
            self.p.last_sim_ms += cycles * cycle_ms
        self.advance(cycles)

    def advance(self, cycles: int) -> None:
        for hive in self.hives:
            self._sim_hive(hive, cycles)
        for plot in self.plots:
            if plot.tree and plot.tree["health"] > 0:
                plot.tree = {**plot.tree, "health": max(0, plot.tree["health"] - cycles)}
        self._sim_factory(cycles)

    def _make_queen(self, hive: Hive, princess: dict, drone: dict, generation: int, mods: dict) -> None:
        health = max(1, round(G.value(princess, "lifespan") * mods["lifespan"]))
        hive.queen = {"genome": princess, "mate": drone, "health": health, "max_health": health, "generation": generation}

    def _sim_hive(self, hive: Hive, cycles: int) -> None:
        if not hive.queen:
            return
        mods = self._mods(hive)
        auto = mods["automation"]
        out = dict(hive.output or {})
        while cycles > 0 and hive.queen:
            queen = dict(hive.queen)
            genome, mate = G.normalize(queen["genome"]), G.normalize(queen["mate"])
            if not G.climate_ok(genome, mods["temp"]):
                break
            n = min(cycles, queen["health"])
            rate = G.value(genome, "speed") * mods["production"] * settings.production_mult
            for item, chance in G.products(genome):
                made = G.binomial(self.rng, n, min(1.0, chance * rate))
                if auto:
                    self.add_item(item, made)
                elif made:
                    out[item] = out.get(item, 0) + made
            queen["health"] -= n
            cycles -= n
            if queen["health"] > 0:
                hive.queen = queen
                break

            # La reine meurt et laisse une princesse et des faux-bourdons
            hive.queen = None
            princess = G.breed(genome, mate, self.rng, mods["mutation"], mods["temp"])
            drones = [G.breed(genome, mate, self.rng, mods["mutation"], mods["temp"]) for _ in range(G.value(genome, "fertility"))]
            if auto:
                self.discover(princess)
                self.discover(drones[0])
                self._make_queen(hive, princess, drones[0], queen.get("generation", 1) + 1, mods)
                if (hive.settings or {}).get("keep_drones"):
                    for drone in drones[1:]:
                        self.add_bee("drone", drone)
            else:
                self.add_bee("princess", princess, hive_id=hive.id)
                for drone in drones:
                    self.add_bee("drone", drone, hive_id=hive.id)
        hive.output = out

    def _process(self, comb: str, n: int) -> None:
        self.take_item(comb, n)
        for item, chance, amount in C.RECIPES[comb]:
            self.add_item(item, G.binomial(self.rng, n, chance) * amount)

    def _sim_factory(self, cycles: int) -> None:
        machine = self.machines.get("centrifuge")
        budget = (machine.qty if machine else 0) * cycles
        for comb in C.RECIPES:
            if budget <= 0:
                break
            n = min(budget, self.qty(comb))
            if n:
                self._process(comb, n)
                budget -= n

    # ---- ruches -----------------------------------------------------------

    def install(self, hive_id: str, princess_id: str, drone_id: str) -> None:
        hive = self._hive(hive_id)
        if hive.queen:
            raise GameError("Cette ruche a déjà une reine.")
        princess = self._bee(princess_id, "princess")
        drone = self._bee(drone_id, "drone")
        princess_genome, drone_genome = princess.genome, drone.genome
        self._take_bee(princess)
        self._take_bee(drone)
        self._make_queen(hive, princess_genome, drone_genome, 1, self._mods(hive))

    def eject_queen(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        if not hive.queen:
            raise GameError("Cette ruche n'a pas de reine.")
        self.add_bee("princess", G.normalize(hive.queen["genome"]))
        hive.queen = None

    def collect(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        for item, n in (hive.output or {}).items():
            self.add_item(item, n)
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
        self.take_item(module, 1)
        hive.modules = [*(hive.modules or []), module]

    def remove_module(self, hive_id: str, index: int) -> None:
        hive = self._hive(hive_id)
        modules = list(hive.modules or [])
        if not 0 <= index < len(modules):
            raise GameError("Emplacement vide.")
        self.add_item(modules.pop(index), 1)
        hive.modules = modules

    def slot_cost(self, hive: Hive) -> int | None:
        spec = C.HIVE_TYPES[hive.hive_type]
        if hive.slots >= spec["max_slots"]:
            return None
        return round(C.SLOT_COST * C.SLOT_SCALE ** (hive.slots - spec["slots"]))

    def expand(self, hive_id: str) -> None:
        hive = self._hive(hive_id)
        cost = self.slot_cost(hive)
        if cost is None:
            raise GameError("Cette ruche ne peut plus être agrandie.")
        self.pay({"honey": cost})
        hive.slots += 1

    def update_hive(self, hive_id: str, name: str | None, keep_drones: bool | None) -> None:
        hive = self._hive(hive_id)
        if name is not None:
            name = name.strip()
            if not name:
                raise GameError("Le nom ne peut pas être vide.")
            hive.name = name[:64]
        if keep_drones is not None:
            hive.settings = {**(hive.settings or {}), "keep_drones": keep_drones}

    # ---- boutique et usine ------------------------------------------------

    def offer_cost(self, offer: dict) -> dict:
        owned = 0
        if offer["kind"] == "hive":
            owned = sum(1 for h in self.hives if h.hive_type == offer["hive_type"]) - offer.get("free", 0)
        elif offer["kind"] == "machine":
            machine = self.machines.get(offer["machine"])
            owned = machine.qty if machine else 0
        elif offer["kind"] == "plot":
            owned = len(self.plots) - offer.get("free", 0)
        honey = round(offer["honey"] * offer.get("scale", 1) ** max(0, owned))
        return {"honey": honey, "items": dict(offer.get("items", {}))}

    def offer_lock(self, offer: dict) -> str | None:
        need = offer.get("min_species", 0)
        if len(self.discovered) < need:
            return f"Découvrez {need} espèces ({len(self.discovered)}/{need})."
        if offer.get("requires_unlock") == "genetics" and not self.p.genetics_unlocked:
            return "Nécessite le laboratoire de génétique."
        if offer["kind"] == "unlock" and self.p.genetics_unlocked:
            return "Déjà débloqué."
        return None

    def buy(self, offer_id: str, qty: int = 1, biome: str = "plains") -> None:
        offer = C.OFFERS.get(offer_id)
        if offer is None:
            raise GameError("Offre inconnue.")
        lock = self.offer_lock(offer)
        if lock:
            raise GameError(lock)
        kind = offer["kind"]
        if kind not in ("bee", "item", "sapling"):
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
        elif kind == "machine":
            machine = self.machines.get(offer["machine"])
            if machine is None:
                machine = Machine(player_id=self.p.id, machine_id=offer["machine"], qty=0)
                self.db.add(machine)
                self.machines[offer["machine"]] = machine
            machine.qty += 1
        elif kind == "unlock":
            self.p.genetics_unlocked = True
        elif kind == "sapling":
            self.add_specimen("tree", G.pure_genome(offer["species"], "tree"), qty)
        elif kind == "plot":
            plot = Plot(id=_uuid(), player_id=self.p.id, position=len(self.plots))
            self.db.add(plot)
            self.plots.append(plot)

    def sell_item(self, item: str, qty: int) -> None:
        price = C.ITEMS.get(item, {}).get("sell", 0)
        if not price:
            raise GameError("Cet objet ne se vend pas.")
        self.take_item(item, qty)
        self.p.honey += price * qty

    def sell_bee(self, bee_id: str, qty: int) -> None:
        bee = self._bee(bee_id)
        price = C.BEE_SELL[bee.type]
        self._take_bee(bee, qty)
        self.p.honey += price * qty

    def process_manual(self, comb: str, qty: int) -> None:
        if comb not in C.RECIPES:
            raise GameError("Ce n'est pas un rayon.")
        n = min(qty, C.MANUAL_BATCH, self.qty(comb))
        if n <= 0:
            raise GameError("Vous n'avez plus de ce rayon.")
        self._process(comb, n)

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

    # ---- génétique --------------------------------------------------------

    def _require_lab(self) -> None:
        if not self.p.genetics_unlocked:
            raise GameError("Le laboratoire de génétique n'est pas encore débloqué.")

    def extract_gene(self, bee_id: str, chromosome: str) -> None:
        self._require_lab()
        if chromosome not in C.CHROMOSOMES:
            raise GameError("Chromosome inconnu.")
        bee = self._bee(bee_id)
        allele = bee.genome[chromosome][0]
        if (chromosome, allele) in self.genes:
            raise GameError("Ce gène est déjà dans votre banque.")
        self.take_item("labware", 1)
        self._take_bee(bee)
        self.genes.add((chromosome, allele))
        self.db.add(PlayerGene(player_id=self.p.id, kind="bee", chromosome=chromosome, allele=allele))

    def imprint(self, bee_id: str, genes: dict[str, str]) -> None:
        self._require_lab()
        if not genes:
            raise GameError("Choisissez au moins un gène.")
        for chromosome, allele in genes.items():
            if (chromosome, allele) not in self.genes or not G.allele_exists(chromosome, allele):
                raise GameError("Ce gène n'est pas dans votre banque.")
        bee = self._bee(bee_id)
        genome = {c: list(a) for c, a in bee.genome.items()}
        for chromosome, allele in genes.items():
            genome[chromosome] = [allele, allele]
        if genome == bee.genome:
            raise GameError("Cette abeille possède déjà ces gènes.")
        self.pay({"honey": C.IMPRINT_HONEY_PER_GENE * len(genes), "items": {"labware": 1}})
        bee_type = bee.type
        self._take_bee(bee)
        self.add_bee(bee_type, genome)

    # ---- sérialisation ----------------------------------------------------

    def state(self) -> dict:
        self.db.flush()
        hives = []
        for hive in self.hives:
            mods = self._mods(hive)
            queen = hive.queen
            if not queen:
                status = "empty"
            elif G.climate_ok(G.normalize(queen["genome"]), mods["temp"]):
                status = "working"
            else:
                status = "climate"
            hives.append({
                "id": hive.id,
                "name": hive.name,
                "hive_type": hive.hive_type,
                "biome": hive.biome,
                "slots": hive.slots,
                "slot_cost": self.slot_cost(hive),
                "modules": hive.modules or [],
                "queen": queen,
                "output": hive.output or {},
                "keep_drones": bool((hive.settings or {}).get("keep_drones")),
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
                "genetics_unlocked": self.p.genetics_unlocked,
            },
            "server_time": now_ms(),
            "cycle_seconds": settings.cycle_seconds,
            "inventory": {item: row.qty for item, row in self.inv.items() if row.qty > 0},
            "bees": [
                {"id": b.id, "type": b.type, "genome": b.genome, "count": b.count, "hive_id": b.hive_id}
                for b in self.bees
            ],
            "hives": hives,
            "machines": {m: row.qty for m, row in self.machines.items()},
            "discovered": sorted(self.discovered),
            "genes": genes,
            "offers": {
                oid: {"cost": self.offer_cost(offer), "lock": self.offer_lock(offer)}
                for oid, offer in C.OFFERS.items()
            },
            "rescue_available": self.rescue_available(),
            "garden": {
                "plots": [
                    {
                        "id": plot.id,
                        "tree": plot.tree,
                        "status": "empty" if not plot.tree else "growing" if plot.tree["health"] > 0 else "mature",
                    }
                    for plot in self.plots
                ],
                "saplings": [
                    {"id": r.id, "genome": r.genome, "count": r.count} for r in self.flora if r.kind == "tree"
                ],
                "butterflies": [
                    {"id": r.id, "species": r.genome["species"][0], "count": r.count} for r in self.flora if r.kind == "butterfly"
                ],
                "found_trees": sorted(self.found["tree"]),
                "found_butterflies": sorted(self.found["butterfly"]),
            },
        }
