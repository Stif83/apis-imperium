import { NextResponse } from 'next/server';

// Lue à l'exécution : la même image sert tous les environnements
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({
    authMode: process.env.AUTH_MODE ?? 'keycloak',
    keycloakUrl: process.env.KEYCLOAK_URL ?? 'http://localhost:8080',
    keycloakRealm: process.env.KEYCLOAK_REALM ?? 'apiculteur',
    keycloakClientId: process.env.KEYCLOAK_CLIENT_ID ?? 'apiculteur-web',
  });
}
