# Image autonome : toutes les dépendances sont installées au build, rien n'est
# téléchargé au démarrage. Base tirée de Docker Hub (pas de quay.io).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

# OKD lance les conteneurs avec un UID arbitraire appartenant au groupe 0
RUN chgrp -R 0 /app && chmod -R g=u /app
USER 1001

EXPOSE 8000
# Les migrations sont appliquées avant chaque démarrage : mise à jour sans perte de données
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
