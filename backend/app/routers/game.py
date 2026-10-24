from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import current_game
from ..game import content
from ..game import lab
from ..game import orders
from ..game import projects
from ..game import expeditions
from ..game import trophies
from ..game.service import Game

router = APIRouter(prefix="/api")


def _done(game: Game) -> dict:
    state = game.state()
    game.db.commit()
    return state


class BuyIn(BaseModel):
    offer_id: str
    qty: int = Field(1, ge=1, le=100)
    biome: str = "plains"


class SellItemIn(BaseModel):
    item_id: str
    qty: int = Field(1, ge=1, le=1_000_000)


class SellBeeIn(BaseModel):
    bee_id: str
    qty: int = Field(1, ge=1, le=1_000_000)


class InstallIn(BaseModel):
    princess_id: str
    drone_id: str


class ModuleIn(BaseModel):
    module_id: str


class HiveIn(BaseModel):
    name: str | None = None
    keep_drones: bool | None = None
    reuse_drone: bool | None = None
    greenhouse: str | None = None


class ProcessIn(BaseModel):
    comb_id: str
    qty: int = Field(1, ge=1, le=100)


class FactoryIn(BaseModel):
    on: bool


class CombAutoIn(BaseModel):
    comb_id: str
    auto: bool


class ChainIn(BaseModel):
    job_id: str
    on: bool


class ExtractIn(BaseModel):
    bee_id: str
    chromosome: str
    chain: bool = False


class ImprintIn(BaseModel):
    bee_id: str
    genes: dict[str, str]


class SecretIn(BaseModel):
    code: str = Field(max_length=32)


@router.post("/secrets")
def secret(body: SecretIn, game: Game = Depends(current_game)):
    game.secret(body.code)
    return _done(game)


class TrophyIn(BaseModel):
    trophy_id: str


@router.post("/trophies/claim")
def claim_trophy(body: TrophyIn, game: Game = Depends(current_game)):
    game.claim_trophy(body.trophy_id)
    return _done(game)


class OrderIn(BaseModel):
    order_id: str
    bee_id: str | None = None


@router.post("/orders/deliver")
def deliver_order(body: OrderIn, game: Game = Depends(current_game)):
    game.deliver_order(body.order_id, body.bee_id)
    return _done(game)


@router.post("/orders/discard")
def discard_order(body: OrderIn, game: Game = Depends(current_game)):
    game.discard_order(body.order_id)
    return _done(game)


class ContributeIn(BaseModel):
    project_id: str
    item: str
    qty: int = Field(1, ge=1, le=1_000_000)


@router.post("/projects/contribute")
def contribute(body: ContributeIn, game: Game = Depends(current_game)):
    game.contribute(body.project_id, body.item, body.qty)
    return _done(game)


class ExpeditionIn(BaseModel):
    region: str
    bee_ids: list[str]


@router.post("/expeditions/launch")
def launch_expedition(body: ExpeditionIn, game: Game = Depends(current_game)):
    game.launch_expedition(body.region, body.bee_ids)
    return _done(game)


class CertifyIn(BaseModel):
    bee_id: str


@router.post("/bees/certify")
def certify(body: CertifyIn, game: Game = Depends(current_game)):
    game.certify(body.bee_id)
    return _done(game)


@router.get("/content")
def get_content():
    return {**content.public_content(), "lab": lab.public_lab(), "trophies": trophies.public_trophies(), "orders": orders.public_orders(), "projects": projects.public_projects(),
            "expeditions": expeditions.public_expeditions()}


class ReplicateIn(BaseModel):
    chromosome: str
    allele: str


@router.post("/genetics/upgrade")
def upgrade_lab(game: Game = Depends(current_game)):
    game.upgrade_lab()
    return _done(game)


@router.post("/genetics/replicate")
def replicate(body: ReplicateIn, game: Game = Depends(current_game)):
    game.replicate(body.chromosome, body.allele)
    return _done(game)


@router.get("/state")
def get_state(game: Game = Depends(current_game)):
    return _done(game)


@router.post("/shop/buy")
def buy(body: BuyIn, game: Game = Depends(current_game)):
    game.buy(body.offer_id, body.qty, body.biome)
    return _done(game)


@router.post("/shop/sell")
def sell_item(body: SellItemIn, game: Game = Depends(current_game)):
    game.sell_item(body.item_id, body.qty)
    return _done(game)


@router.post("/bees/sell")
def sell_bee(body: SellBeeIn, game: Game = Depends(current_game)):
    game.sell_bee(body.bee_id, body.qty)
    return _done(game)


@router.post("/rescue")
def rescue(game: Game = Depends(current_game)):
    game.rescue()
    return _done(game)


@router.post("/hives/{hive_id}/install")
def install(hive_id: str, body: InstallIn, game: Game = Depends(current_game)):
    game.install(hive_id, body.princess_id, body.drone_id)
    return _done(game)


@router.post("/hives/{hive_id}/eject")
def eject(hive_id: str, game: Game = Depends(current_game)):
    game.eject_queen(hive_id)
    return _done(game)


@router.post("/hives/{hive_id}/collect")
def collect(hive_id: str, game: Game = Depends(current_game)):
    game.collect(hive_id)
    return _done(game)


@router.post("/hives/{hive_id}/modules")
def add_module(hive_id: str, body: ModuleIn, game: Game = Depends(current_game)):
    game.add_module(hive_id, body.module_id)
    return _done(game)


@router.delete("/hives/{hive_id}/modules/{index}")
def remove_module(hive_id: str, index: int, game: Game = Depends(current_game)):
    game.remove_module(hive_id, index)
    return _done(game)


@router.post("/hives/{hive_id}/upgrade")
def upgrade_hive(hive_id: str, game: Game = Depends(current_game)):
    game.upgrade_hive(hive_id)
    return _done(game)


@router.post("/hives/{hive_id}/expand")
def expand(hive_id: str, game: Game = Depends(current_game)):
    game.expand(hive_id)
    return _done(game)


@router.post("/hives/{hive_id}")
def update_hive(hive_id: str, body: HiveIn, game: Game = Depends(current_game)):
    game.update_hive(hive_id, body.name, body.keep_drones, body.reuse_drone, body.greenhouse)
    return _done(game)


@router.post("/factory/process")
def process(body: ProcessIn, game: Game = Depends(current_game)):
    game.process_manual(body.comb_id, body.qty)
    return _done(game)


@router.post("/factory/settings")
def factory_settings(body: FactoryIn, game: Game = Depends(current_game)):
    game.set_factory(body.on)
    return _done(game)


@router.post("/factory/combs")
def comb_auto(body: CombAutoIn, game: Game = Depends(current_game)):
    game.set_comb_auto(body.comb_id, body.auto)
    return _done(game)


@router.post("/genetics/extract")
def extract(body: ExtractIn, game: Game = Depends(current_game)):
    game.extract_gene(body.bee_id, body.chromosome, chain=body.chain)
    return _done(game)


@router.post("/genetics/chain")
def chain(body: ChainIn, game: Game = Depends(current_game)):
    game.set_chain(body.job_id, body.on)
    return _done(game)


@router.post("/genetics/imprint")
def imprint(body: ImprintIn, game: Game = Depends(current_game)):
    game.imprint(body.bee_id, body.genes)
    return _done(game)
