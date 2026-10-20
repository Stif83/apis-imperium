from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..auth import current_game
from ..game import content
from ..game import lab
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


class ProcessIn(BaseModel):
    comb_id: str
    qty: int = Field(1, ge=1, le=100)


class PlantIn(BaseModel):
    sapling_id: str
    pollen_id: str


class SellSpecimenIn(BaseModel):
    specimen_id: str
    qty: int = Field(1, ge=1, le=1_000_000)


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


class ClaimIn(BaseModel):
    objective_id: str


@router.post("/objectives/claim")
def claim_objective(body: ClaimIn, game: Game = Depends(current_game)):
    game.claim_objective(body.objective_id)
    return _done(game)


@router.get("/content")
def get_content():
    return {**content.public_content(), "lab": lab.public_lab()}


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
    game.update_hive(hive_id, body.name, body.keep_drones, body.reuse_drone)
    return _done(game)


@router.post("/factory/process")
def process(body: ProcessIn, game: Game = Depends(current_game)):
    game.process_manual(body.comb_id, body.qty)
    return _done(game)


@router.post("/garden/plots/{plot_id}/plant")
def plant(plot_id: str, body: PlantIn, game: Game = Depends(current_game)):
    game.plant(plot_id, body.sapling_id, body.pollen_id)
    return _done(game)


@router.post("/garden/plots/{plot_id}/harvest")
def harvest(plot_id: str, game: Game = Depends(current_game)):
    gained = game.harvest(plot_id)
    return {**_done(game), "harvest": gained}


@router.post("/garden/sell")
def sell_specimen(body: SellSpecimenIn, game: Game = Depends(current_game)):
    game.sell_specimen(body.specimen_id, body.qty)
    return _done(game)


@router.post("/genetics/extract")
def extract(body: ExtractIn, game: Game = Depends(current_game)):
    game.extract_gene(body.bee_id, body.chromosome, chain=body.chain)
    return _done(game)


@router.post("/genetics/imprint")
def imprint(body: ImprintIn, game: Game = Depends(current_game)):
    game.imprint(body.bee_id, body.genes)
    return _done(game)
