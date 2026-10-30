"""SSO : validation des jetons Keycloak, avec de vrais jetons RS256 signés pour l'occasion."""

import time
from types import SimpleNamespace

import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi import HTTPException

from app import auth
from app.config import settings

ISSUER = "https://sso.example.org/realms/prod"
CLIENT = "apisimperium-web"
KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)


class FakeJwks:
    def __init__(self, fail=False):
        self.fail = fail

    def get_signing_key_from_jwt(self, token):
        if self.fail:
            raise jwt.PyJWKClientConnectionError("certificate verify failed")
        return SimpleNamespace(key=KEY.public_key())


@pytest.fixture
def keycloak(monkeypatch):
    monkeypatch.setattr(settings, "auth_mode", "keycloak")
    monkeypatch.setattr(settings, "keycloak_issuer", ISSUER)
    monkeypatch.setattr(settings, "keycloak_client_id", CLIENT)
    jwks = FakeJwks()
    monkeypatch.setattr(auth, "_jwks_client", lambda: jwks)
    return jwks


def _request(**claims):
    now = int(time.time())
    body = {"sub": "u-1", "preferred_username": "nathan", "iss": ISSUER, "azp": CLIENT, "iat": now, "exp": now + 300, **claims}
    token = jwt.encode(body, KEY, algorithm="RS256")
    return SimpleNamespace(headers={"authorization": f"Bearer {token}"})


def _status(request):
    with pytest.raises(HTTPException) as err:
        auth.current_identity(request)
    return err.value.status_code, err.value.detail


def test_valid_token(keycloak):
    assert auth.current_identity(_request()) == ("u-1", "nathan")
    # Horloge du serveur de jeu un peu en retard sur Keycloak : le jeton reste accepté
    assert auth.current_identity(_request(iat=int(time.time()) + 30))[0] == "u-1"


def test_rejected_tokens(keycloak):
    assert _status(_request(iss="https://autre.example.org/realms/prod")) == (401, "Jeton émis par un autre Keycloak que celui configuré.")
    assert _status(_request(azp="autre-client")) == (401, "Jeton émis pour un autre client.")
    assert _status(_request(exp=int(time.time()) - 3600))[0] == 401
    assert _status(SimpleNamespace(headers={}))[0] == 401


def test_keycloak_unreachable(keycloak):
    # Certificat inconnu ou réseau coupé : erreur du serveur, pas du joueur
    keycloak.fail = True
    assert _status(_request()) == (503, "Le serveur de jeu ne joint pas le service d'authentification.")


@pytest.fixture
def local(keycloak, monkeypatch):
    monkeypatch.setattr(settings, "local_accounts", "test:test")
    return keycloak


def _bearer(token):
    return SimpleNamespace(headers={"authorization": f"Bearer {token}"})


def test_local_account(local):
    token = auth.local_login("test", "test")["token"]
    assert auth.current_identity(_bearer(token)) == ("local:test", "test")
    # Les jetons Keycloak restent acceptés à côté
    assert auth.current_identity(_request())[0] == "u-1"


def test_local_account_rejected(local, monkeypatch):
    with pytest.raises(HTTPException) as err:
        auth.local_login("test", "mauvais")
    assert err.value.status_code == 401
    with pytest.raises(HTTPException):
        auth.local_login("inconnu", "test")
    token = auth.local_login("test", "test")["token"]
    # Jeton local signé avec une autre clé : refusé
    forged = jwt.encode({**jwt.decode(token, options={"verify_signature": False}), "sub": "local:admin"}, "autre-cle-de-32-octets-au-moins!!", algorithm="HS256")
    assert _status(_bearer(forged))[0] == 401
    # Compte retiré de la configuration : ses jetons ne valent plus rien
    monkeypatch.setattr(settings, "local_accounts", "")
    assert _status(_bearer(token)) == (401, "Ce compte n'existe plus.")
