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
    # Autorité (PEM) qui signe le certificat HTTPS de Keycloak, si elle n'est pas publique ; s'ajoute à celles du système
    keycloak_ca_file: str = ""

    # Comptes locaux « pseudo:mot de passe », séparés par des virgules (ex. « test:test ») : formulaire de
    # connexion en plus de Keycloak. Vide : pas de formulaire.
    local_accounts: str = ""
    # Clé qui signe les jetons des comptes locaux ; déduite de DATABASE_URL (qui contient un mot de passe) si vide
    local_auth_secret: str = ""

    # Réglages de rythme du jeu
    cycle_seconds: int = 5
    production_mult: float = 2.5
    max_offline_cycles: int = 17280  # 24 h à 5 s par cycle

    @property
    def local_users(self) -> dict[str, str]:
        pairs = (entry.split(":", 1) for entry in self.local_accounts.split(",") if ":" in entry)
        return {name.strip(): password for name, password in pairs if name.strip()}

    @property
    def jwks_url(self) -> str:
        return self.keycloak_jwks_url or f"{self.keycloak_issuer}/protocol/openid-connect/certs"


settings = Settings()
