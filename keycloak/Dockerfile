# Keycloak construit depuis l'archive officielle publiée sur GitHub, sur une base
# Docker Hub : aucune image n'est tirée de quay.io.
FROM eclipse-temurin:21-jre AS build
ARG KEYCLOAK_VERSION=26.0.7
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL "https://github.com/keycloak/keycloak/releases/download/${KEYCLOAK_VERSION}/keycloak-${KEYCLOAK_VERSION}.tar.gz" \
       | tar -xz -C /opt \
    && mv "/opt/keycloak-${KEYCLOAK_VERSION}" /opt/keycloak
COPY realm-apiculteur.json /opt/keycloak/data/import/realm-apiculteur.json
# Options fixées au build pour un démarrage rapide ("--optimized")
RUN /opt/keycloak/bin/kc.sh build --db=postgres --health-enabled=true

FROM eclipse-temurin:21-jre
COPY --from=build /opt/keycloak /opt/keycloak
# OKD lance les conteneurs avec un UID arbitraire appartenant au groupe 0
RUN chgrp -R 0 /opt/keycloak && chmod -R g=u /opt/keycloak
USER 1001
ENV KC_HTTP_ENABLED=true
EXPOSE 8080 9000
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
# Le realm n'est importé que s'il n'existe pas : une mise à jour ne l'écrase jamais
CMD ["start", "--optimized", "--import-realm"]
