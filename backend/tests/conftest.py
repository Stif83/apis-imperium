"""Réglages communs, posés avant tout import de l'application (la configuration est lue une fois)."""

import os

os.environ["DATABASE_URL"] = "sqlite://"
os.environ["AUTH_MODE"] = "dev"
