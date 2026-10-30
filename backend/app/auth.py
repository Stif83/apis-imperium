import hashlib
import hmac
import logging
import os
import ssl
import time
from functools import lru_cache

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .config import settings
from .db import get_db
from .game.service import Game, get_or_create_player

log = logging.getLogger("apiculteur.auth")

# Tolérance sur les dates du jeton (horloges de Keycloak et du serveur de jeu un peu décalées)
CLOCK_LEEWAY = 60
# Jetons des comptes locaux : signés par le serveur de jeu lui-même, valables une semaine
LOCAL_ISSUER = "apis-imperium-local"
LOCAL_TOKEN_SECONDS = 7 * 24 * 3600


def _local_secret() -> bytes:
    # Stable d'un redémarrage à l'autre sans réglage de plus : DATABASE_URL contient le mot de passe de la base
    raw = settings.local_auth_secret or f"apis-local-auth|{settings.database_url}"
    return hashlib.sha256(raw.encode()).digest()


def local_login(username: str, password: str) -> dict:
    """Connexion par un compte local (LOCAL_ACCOUNTS) ; renvoie un jeton signé par le serveur de jeu."""
    expected = settings.local_users.get(username)
    if expected is None or not hmac.compare_digest(expected.encode(), password.encode()):
        raise HTTPException(401, "Pseudo ou mot de passe incorrect.")
    now = int(time.time())
    claims = {"iss": LOCAL_ISSUER, "sub": f"local:{username}", "preferred_username": username, "iat": now, "exp": now + LOCAL_TOKEN_SECONDS}
    return {"token": jwt.encode(claims, _local_secret(), algorithm="HS256"), "username": username, "expires": claims["exp"]}


def _local_identity(token: str) -> tuple[str, str]:
    try:
        claims = jwt.decode(token, _local_secret(), algorithms=["HS256"], issuer=LOCAL_ISSUER, leeway=CLOCK_LEEWAY)
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Session expirée : reconnectez-vous.") from exc
    username = claims.get("preferred_username", "")
    # Compte retiré de LOCAL_ACCOUNTS : ses jetons ne valent plus rien
    if username not in settings.local_users:
        raise HTTPException(401, "Ce compte n'existe plus.")
    return claims["sub"], username


def _ssl_context() -> ssl.SSLContext:
    """Autorités du système, plus celle de KEYCLOAK_CA_FILE (Keycloak signé par une autorité interne)."""
    context = ssl.create_default_context()
    if settings.keycloak_ca_file and os.path.exists(settings.keycloak_ca_file):
        context.load_verify_locations(settings.keycloak_ca_file)
    return context


@lru_cache
def _jwks_client() -> jwt.PyJWKClient:
    return jwt.PyJWKClient(settings.jwks_url, cache_keys=True, lifespan=3600, timeout=10, ssl_context=_ssl_context())


def auth_diagnostic() -> dict:
    """État de la configuration SSO, pour vérifier un déploiement (aucun secret)."""
    out = {
        "mode": settings.auth_mode,
        "issuer": settings.keycloak_issuer,
        "jwks_url": settings.jwks_url,
        "client_id": settings.keycloak_client_id,
        "ca_file": settings.keycloak_ca_file or None,
        "ca_file_found": bool(settings.keycloak_ca_file) and os.path.exists(settings.keycloak_ca_file),
        "local_accounts": len(settings.local_users),
    }
    if settings.auth_mode == "dev":
        return out
    try:
        keys = _jwks_client().get_jwk_set(refresh=True).keys
        out.update(jwks_ok=True, keys=len(keys))
    except jwt.PyJWKClientError as exc:
        out.update(jwks_ok=False, error=str(exc))
    return out


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
        unverified_iss = jwt.decode(token, options={"verify_signature": False}).get("iss")
    except jwt.PyJWTError as exc:
        raise HTTPException(401, "Jeton invalide ou expiré.") from exc
    if unverified_iss == LOCAL_ISSUER:
        return _local_identity(token)
    try:
        key = _jwks_client().get_signing_key_from_jwt(token)
    except jwt.PyJWKClientConnectionError as exc:
        # Le serveur de jeu n'arrive pas à lire les clés de Keycloak : ce n'est pas la faute du joueur
        log.error("Clés Keycloak injoignables (%s) : %s", settings.jwks_url, exc)
        raise HTTPException(503, "Le serveur de jeu ne joint pas le service d'authentification.") from exc
    except jwt.PyJWTError as exc:
        log.warning("Jeton refusé (clé de signature) : %s", exc)
        raise HTTPException(401, "Jeton invalide ou expiré.") from exc
    try:
        claims = jwt.decode(
            token,
            key.key,
            algorithms=["RS256"],
            issuer=settings.keycloak_issuer,
            leeway=CLOCK_LEEWAY,
            options={"verify_aud": False},
        )
    except jwt.InvalidIssuerError as exc:
        got = jwt.decode(token, options={"verify_signature": False}).get("iss")
        log.error("Émetteur du jeton inattendu : reçu %r, attendu %r (KEYCLOAK_ISSUER)", got, settings.keycloak_issuer)
        raise HTTPException(401, "Jeton émis par un autre Keycloak que celui configuré.") from exc
    except jwt.PyJWTError as exc:
        log.warning("Jeton refusé : %s", exc)
        raise HTTPException(401, "Jeton invalide ou expiré.") from exc
    if claims.get("azp") != settings.keycloak_client_id:
        log.error("Jeton émis pour le client %r, attendu %r (KEYCLOAK_CLIENT_ID)", claims.get("azp"), settings.keycloak_client_id)
        raise HTTPException(401, "Jeton émis pour un autre client.")
    return claims["sub"], claims.get("preferred_username") or claims["sub"]


def current_player(identity: tuple[str, str] = Depends(current_identity), db: Session = Depends(get_db)):
    return get_or_create_player(db, *identity)


def current_game(player=Depends(current_player), db: Session = Depends(get_db)) -> Game:
    game = Game(db, player)
    game.simulate()
    return game
