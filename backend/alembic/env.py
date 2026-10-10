from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, text

from app.config import settings
from app.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_online() -> None:
    engine = create_engine(settings.database_url)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata, render_as_batch=engine.dialect.name == "sqlite")
        with context.begin_transaction():
            if engine.dialect.name == "postgresql":
                # Un seul pod migre à la fois lors d'un déploiement à plusieurs réplicas
                connection.execute(text("SELECT pg_advisory_xact_lock(7426001)"))
            context.run_migrations()


run_migrations_online()
