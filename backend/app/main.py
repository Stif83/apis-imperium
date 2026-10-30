from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy import text

from .auth import auth_diagnostic, local_login
from .config import settings
from .db import engine
from .game.service import GameError
from .routers import community, game

app = FastAPI(title="Apis Imperium")
app.include_router(game.router)
app.include_router(community.router)


@app.exception_handler(GameError)
def game_error(request: Request, exc: GameError):
    return JSONResponse(status_code=400, content={"detail": str(exc)})


@app.get("/api/health")
def health():
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/api/health/auth")
def health_auth():
    """Vérifie que le serveur de jeu lit bien les clés de Keycloak (configuration SSO d'un déploiement)."""
    diag = auth_diagnostic()
    return JSONResponse(status_code=200 if diag.get("jwks_ok", True) else 503, content=diag)


class LoginIn(BaseModel):
    username: str = Field(max_length=64)
    password: str = Field(max_length=256)


@app.get("/api/auth/local")
def local_auth_enabled():
    """Le formulaire de connexion par compte local est-il proposé ?"""
    return {"enabled": settings.auth_mode != "dev" and bool(settings.local_users)}


@app.post("/api/auth/local")
def local_auth(body: LoginIn):
    if settings.auth_mode == "dev" or not settings.local_users:
        return JSONResponse(status_code=404, content={"detail": "Pas de compte local sur ce serveur."})
    return local_login(body.username.strip(), body.password)
