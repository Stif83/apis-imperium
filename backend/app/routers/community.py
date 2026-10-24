from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..auth import current_player
from ..db import get_db
from ..game import content
from ..game import achievements as A
from ..game.badges import player_badges
from ..models import Bee, Discovery, Player, Showcase, ShowcaseLike

router = APIRouter(prefix="/api/community")


class ShowcaseIn(BaseModel):
    title: str = Field(min_length=1, max_length=80)
    description: str = Field("", max_length=1000)
    bee_ids: list[str] = Field(min_length=1, max_length=content.SHOWCASE_MAX_ENTRIES)


def _list(db: Session, me: Player) -> list[dict]:
    likes = dict(db.execute(select(ShowcaseLike.showcase_id, func.count()).group_by(ShowcaseLike.showcase_id)).all())
    mine = set(db.scalars(select(ShowcaseLike.showcase_id).where(ShowcaseLike.player_id == me.id)))
    rows = db.execute(
        select(Showcase, Player)
        .join(Player, Player.id == Showcase.player_id)
        .order_by(Showcase.created_at.desc())
        .limit(100)
    ).all()
    # Badges de chaque auteur, calculés une fois par auteur
    authors = {p.id: p for _, p in rows}
    found: dict[str, set[str]] = {pid: set() for pid in authors}
    if authors:
        query = select(Discovery.player_id, Discovery.species_id).where(Discovery.player_id.in_(authors))
        for pid, species in db.execute(query):
            found[pid].add(species)
    badges = {pid: player_badges(found[pid], p.trophies) for pid, p in authors.items()}
    return [
        {
            "id": s.id,
            "title": s.title,
            "description": s.description,
            "author": author.username,
            "badges": badges[author.id],
            "mine": s.player_id == me.id,
            "entries": s.entries,
            "likes": likes.get(s.id, 0),
            "liked": s.id in mine,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s, author in rows
    ]


@router.get("/showcases")
def list_showcases(me: Player = Depends(current_player), db: Session = Depends(get_db)):
    out = _list(db, me)
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
