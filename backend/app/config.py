from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"

    # "keycloak" (production) ou "dev" (en-tête X-Dev-User, jamais en production)
    auth_mode: str = "keycloak"
    # URL publique du realm, telle qu'elle apparaît dans le champ "iss" des jetons
    keycloak_issuer: str = "http://localhost:8080/realms/apiculteur"
    # URL interne des clés publiques ; déduite de l'issuer si vide
    keycloak_jwks_url: str = ""
    keycloak_client_id: str = "apiculteur-web"

    # Réglages de rythme du jeu
    cycle_seconds: int = 5
    production_mult: float = 2.5
    max_offline_cycles: int = 17280  # 24 h à 5 s par cycle

    @property
    def jwks_url(self) -> str:
        return self.keycloak_jwks_url or f"{self.keycloak_issuer}/protocol/openid-connect/certs"


settings = Settings()
