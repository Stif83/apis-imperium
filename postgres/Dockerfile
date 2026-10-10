# PostgreSQL officiel (Docker Hub) avec la création de la base Keycloak embarquée.
FROM postgres:16
COPY init-keycloak-db.sh /docker-entrypoint-initdb.d/10-keycloak.sh
RUN chmod 755 /docker-entrypoint-initdb.d/10-keycloak.sh
# Sous-dossier : le point de montage du volume n'est pas forcément vide ni possédé par l'UID courant
ENV PGDATA=/var/lib/postgresql/data/pgdata
