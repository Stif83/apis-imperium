from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import current_player
from ..db import get_db
from ..game import content
from ..game import achievements as A
from ..game import profiles
from ..game.service import Game
from ..game.badges import player_badges
from ..models import Bee, Discovery, Player, Showcase, ShowcaseLike

router = APIRouter(prefix="/api/community")


class ShowcaseIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    description: str = Field("", max_length=1000)
    bee_ids: list[str] = Field(min_length=1, max_length=content.SHOWCASE_MAX_ENTRIES)


def _badges(db: Session, players: list[Player]) -> dict[str, dict]:
    """Badges de chaque joueur (rang selon les espèces découvertes, meilleurs trophées)."""
    by_id = {p.id: p for p in players}
    found: dict[str, set[str]] = {pid: set() for pid in by_id}
    if by_id:
        query = select(Discovery.player_id, Discovery.species_id).where(Discovery.player_id.in_(by_id))
        for pid, species in db.execute(query):
            found[pid].add(species)
    return {pid: player_badges(found[pid], p.trophies) for pid, p in by_id.items()}


def _list(db: Session, me: Player, author_id: str | None = None, by_likes: bool = False) -> list[dict]:
    """Vitrines (les 100 premières), d'un auteur ou de tous, des plus récentes ou des plus aimées aux autres."""
    counts = select(ShowcaseLike.showcase_id, func.count().label("n")).group_by(ShowcaseLike.showcase_id).subquery()
    mine = set(db.scalars(select(ShowcaseLike.showcase_id).where(ShowcaseLike.player_id == me.id)))
    query = (select(Showcase, Player, func.coalesce(counts.c.n, 0))
             .join(Player, Player.id == Showcase.player_id)
             .outerjoin(counts, counts.c.showcase_id == Showcase.id))
    if author_id:
        query = query.where(Showcase.player_id == author_id)
    order = [Showcase.created_at.desc()]
    if by_likes:
        order.insert(0, func.coalesce(counts.c.n, 0).desc())
    rows = db.execute(query.order_by(*order).limit(100)).all()
    # Badges de chaque auteur, calculés une fois par auteur
    badges = _badges(db, [p for _, p, _ in rows])
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "author": author.username,
            "author_id": author.id,
            "badges": badges[author.id],
            "mine": s.player_id == me.id,
            "entries": s.entries,
            "likes": n,
            "liked": s.id in mine,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, author, n in rows
    ]


@router.get("/showcases")
def list_showcases(sort: str = "recent", me: Player = Depends(current_player), db: Session = Depends(get_db)):
    """`sort` : « recent » (défaut), « liked » (les plus aimées) ou « mine » (celles du joueur)."""
    out = _list(db, me, author_id=me.id if sort == "mine" else None, by_likes=sort == "liked")
    db.commit()
    return out


@router.post("/showcases")
def create_showcase(body: ShowcaseIn, me: Player = Depends(current_player), db: Session = Depends(get_db)):
    bees = {b.id: b for b in db.scalars(select(Bee).where(Bee.player_id == me.id, Bee.id.in_(body.bee_ids)))}
    if len(bees) != len(set(body.bee_ids)):
        raise HTTPException(400, "Certaines abeilles sont introuvables.")
    # On enregistre une copie : la vitrine survit à la mort ou à la vente des abeilles
    entries = [{"type": bees[i].type, "genome": bees[i].genome} for i in dict.fromkeys(body.bee_ids)]
    db.add(Showcase(player_id=me.id, title=body.title.strip(), description=body.description.strip(), entries=entries))
    A.unlock(me, "first_showcase")
    db.flush()
    out = _list(db, me)
    db.commit()
    return out


@router.delete("/showcases/{showcase_id}")
def delete_showcase(showcase_id: str, me: Player = Depends(current_player), db: Session = Depends(get_db)):
    showcase = db.get(Showcase, showcase_id)
    if showcase is None or showcase.player_id != me.id:
        raise HTTPException(404, "Vitrine introuvable.")
    db.delete(showcase)
    db.flush()
    out = _list(db, me)
    db.commit()
    return out


@router.post("/showcases/{showcase_id}/like")
def toggle_like(showcase_id: str, me: Player = Depends(current_player), db: Session = Depends(get_db)):
    if db.get(Showcase, showcase_id) is None:
        raise HTTPException(404, "Vitrine introuvable.")
    like = db.get(ShowcaseLike, (showcase_id, me.id))
    if like:
        db.delete(like)
    else:
        db.add(ShowcaseLike(showcase_id=showcase_id, player_id=me.id))
    db.flush()
    out = _list(db, me)
    db.commit()
    return out


# ---- profils d'apiculteur ----------------------------------------------------


class ProfileIn(BaseModel):
    bio: str = Field("", max_length=profiles.BIO_MAX + 50)
    biome: str
    phase: str
    featured: list[str] = Field(default_factory=list, max_length=profiles.MAX_FEATURED)
    # None : garder l'abeille préférée ; "" : l'enlever ; sinon l'identifiant d'une abeille de la réserve
    favorite_bee_id: str | None = None


@router.get("/profiles")
def list_profiles(me: Player = Depends(current_player), db: Session = Depends(get_db)):
    """Annuaire des apiculteurs : nom, badges, abeille préférée, par ordre alphabétique."""
    players = list(db.scalars(select(Player).order_by(func.lower(Player.username)).limit(500)))
    badges = _badges(db, players)
    out = []
    for p in players:
        settings = profiles.settings_of(p)
        out.append({"id": p.id, "name": p.username, "badges": badges[p.id], "favorite": settings["favorite"],
                    "biome": settings["biome"], "mine": p.id == me.id})
    db.commit()
    return out


@router.get("/profiles/{player_id}")
def get_profile(player_id: str, me: Player = Depends(current_player), db: Session = Depends(get_db)):
    """Profil public d'un joueur (« moi » : le sien), avec ses vitrines."""
    player = me if player_id == "moi" else db.get(Player, player_id)
    if player is None:
        raise HTTPException(404, "Apiculteur introuvable.")
    out = {**Game.viewer(db, player).profile(), "mine": player.id == me.id, "showcases": _list(db, me, player.id)}
    db.commit()
    return out


@router.put("/profile")
def update_profile(body: ProfileIn, me: Player = Depends(current_player), db: Session = Depends(get_db)):
    game = Game(db, me)
    game.update_profile(body.bio, body.biome, body.phase, body.featured, body.favorite_bee_id)
    out = {**game.profile(), "mine": True, "showcases": _list(db, me, me.id)}
    db.commit()
    return out
