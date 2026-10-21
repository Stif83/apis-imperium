import uuid
from datetime import datetime

from sqlalchemy import JSON, BigInteger, Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def _uuid() -> str:
    return str(uuid.uuid4())


class Base(DeclarativeBase):
    pass


class Player(Base):
    __tablename__ = "players"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    sub: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    username: Mapped[str] = mapped_column(String(255))
    honey: Mapped[int] = mapped_column(BigInteger, default=0)
    genetics_unlocked: Mapped[bool] = mapped_column(Boolean, default=False)
    # Niveau du laboratoire (0 = pas construit) et travaux en cours : opération, fragments, journal
    lab_level: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    lab: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    last_sim_ms: Mapped[int] = mapped_column(BigInteger)
    # Objectifs du carnet dont la récompense a été reçue
    claimed: Mapped[list | None] = mapped_column(JSON, nullable=True)
    # Compteurs (rayons récoltés, miel gagné…) et succès débloqués {id: horodatage ms}
    stats: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    achievements: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Modules démontés avant d'être usés : {module: [générations restantes, ...]}, pris en premier au remontage
    worn_modules: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    # Trophées : {id: nombre de paliers réclamés} ; pedigree : {espèce: meilleur niveau certifié}
    trophies: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    pedigree: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class InventoryItem(Base):
    __tablename__ = "inventory_items"

    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
    item_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    qty: Mapped[int] = mapped_column(BigInteger, default=0)


class Hive(Base):
    __tablename__ = "hives"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), index=True)
    hive_type: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(64))
    biome: Mapped[str] = mapped_column(String(32))
    slots: Mapped[int] = mapped_column(Integer)
    position: Mapped[int] = mapped_column(Integer, default=0)
    modules: Mapped[list] = mapped_column(JSON, default=list)
    queen: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    output: Mapped[dict] = mapped_column(JSON, default=dict)
    settings: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Bee(Base):
    """Un individu (ou une pile d'individus génétiquement identiques).

    `kind` vaut "bee" aujourd'hui ; "tree" et "butterfly" sont prévus pour le jardin.
    """

    __tablename__ = "bees"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), index=True)
    kind: Mapped[str] = mapped_column(String(16), default="bee")
    type: Mapped[str] = mapped_column(String(16))
    genome: Mapped[dict] = mapped_column(JSON)
    genome_hash: Mapped[str] = mapped_column(String(40))
    count: Mapped[int] = mapped_column(Integer, default=1)
    # Renseigné tant que l'abeille attend dans la sortie d'une ruche
    hive_id: Mapped[str | None] = mapped_column(ForeignKey("hives.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Plot(Base):
    """Parcelle du jardin ; `tree` décrit l'arbre planté, ou vaut NULL si elle est libre."""

    __tablename__ = "plots"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer, default=0)
    tree: Mapped[dict | None] = mapped_column(JSON(none_as_null=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Machine(Base):
    __tablename__ = "machines"

    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
    machine_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, default=0)


class Discovery(Base):
    __tablename__ = "discoveries"

    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), primary_key=True, default="bee")
    species_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    discovered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PlayerGene(Base):
    __tablename__ = "player_genes"

    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
    kind: Mapped[str] = mapped_column(String(16), primary_key=True, default="bee")
    chromosome: Mapped[str] = mapped_column(String(32), primary_key=True)
    allele: Mapped[str] = mapped_column(String(64), primary_key=True)
    # Nombre d'impressions encore possibles avec ce gène
    doses: Mapped[int] = mapped_column(Integer, default=3, server_default="3")


class Showcase(Base):
    __tablename__ = "showcases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    entries: Mapped[list] = mapped_column(JSON, default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ShowcaseLike(Base):
    __tablename__ = "showcase_likes"

    showcase_id: Mapped[str] = mapped_column(ForeignKey("showcases.id", ondelete="CASCADE"), primary_key=True)
    player_id: Mapped[str] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"), primary_key=True)
