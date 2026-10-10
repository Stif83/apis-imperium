from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text

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
