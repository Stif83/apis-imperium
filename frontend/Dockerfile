# Image autonome : le serveur Next.js "standalone" embarque ses dépendances.
# Bases tirées de Docker Hub (pas de quay.io) ; rien n'est téléchargé au démarrage.
FROM node:22-alpine AS build
WORKDIR /src
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000
COPY --from=build /src/.next/standalone ./
COPY --from=build /src/.next/static ./.next/static
COPY --from=build /src/public ./public
# OKD lance les conteneurs avec un UID arbitraire appartenant au groupe 0
RUN chgrp -R 0 /app && chmod -R g=u /app
USER 1001
EXPOSE 3000
CMD ["node", "server.js"]
