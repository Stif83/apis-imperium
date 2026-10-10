from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .game.service import Game, get_or_create_player


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(settings.jwks_url, cache_keys=True, lifespan=3600)


def current_identity(request: Request) -> tuple[str, str]:
    """Renvoie (identifiant stable, pseudo) de l'utilisateur connecté."""
    if settings.auth_mode == "dev":
        name = request.headers.get("x-dev-user", "").strip()[:64]
        if not name:
            raise HTTPException(401, "En-tête X-Dev-User manquant.")
        return f"dev:{name}", name

    header = request.headers.get("authorization", "")
    if not header.lower().startswith("bearer "):
        raise HTTPException(401, "Authentification requise.")
    token = header[7:]
    try:
        key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["RS256"],
            issuer=settings.keycloak_issuer,
            options={"verify_aud": False},
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Jeton invalide ou expiré.") from exc
    if claims.get("azp") != settings.keycloak_client_id:
        raise HTTPException(401, "Jeton émis pour un autre client.")
    return claims["sub"], claims.get("preferred_username") or claims["sub"]


def current_player(identity: tuple[str, str] = Depends(current_identity), db: Session = Depends(get_db)):
    return get_or_create_player(db, *identity)


def current_game(player=Depends(current_player), db: Session = Depends(get_db)) -> Game:
    game = Game(db, player)
    game.simulate()
    return game
