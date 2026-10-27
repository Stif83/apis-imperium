from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .auth import auth_diagnostic
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
