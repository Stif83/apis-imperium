'use client';

import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type Keycloak from 'keycloak-js';

type Auth = {
  username: string;
  headers: () => Promise<Record<string, string>>;
  logout: () => void;
};

const AuthContext = createContext<Auth | null>(null);
const DEV_USER_KEY = 'apiculteur.devUser';

// Initialisé une seule fois, même si React monte le composant deux fois en développement
let keycloakPromise: Promise<Keycloak> | null = null;

async function startKeycloak(cfg: { keycloakUrl: string; keycloakRealm: string; keycloakClientId: string }) {
  const { default: KeycloakClient } = await import('keycloak-js');
  const kc = new KeycloakClient({ url: cfg.keycloakUrl, realm: cfg.keycloakRealm, clientId: cfg.keycloakClientId });
  await kc.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
  return kc;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [devLogin, setDevLogin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enterDev = (name: string) => {
    localStorage.setItem(DEV_USER_KEY, name);
    setDevLogin(false);
    setAuth({
      username: name,
      headers: async () => ({ 'X-Dev-User': name }),
      logout: () => {
        localStorage.removeItem(DEV_USER_KEY);
        setAuth(null);
        setDevLogin(true);
      },
    });
  };

  useEffect(() => {
    (async () => {
      const cfg = await (await fetch('/config')).json();
      if (cfg.authMode === 'dev') {
        const saved = localStorage.getItem(DEV_USER_KEY);
        if (saved) enterDev(saved);
        else setDevLogin(true);
        return;
      }
      keycloakPromise ??= startKeycloak(cfg);
      const kc = await keycloakPromise;
      setAuth({
        username: kc.tokenParsed?.preferred_username ?? 'apiculteur',
        headers: async () => {
          await kc.updateToken(30).catch(() => kc.login());
          return { Authorization: `Bearer ${kc.token}` };
        },
        logout: () => kc.logout({ redirectUri: window.location.origin }),
      });
    })().catch(() => setError("Impossible de joindre le service d'authentification."));
  }, []);

  if (error) return <div className="splash">{error}</div>;
  if (devLogin) {
    const submit = (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const name = String(new FormData(e.currentTarget).get('name') ?? '').trim();
      if (name) enterDev(name);
    };
    return (
      <form className="splash" onSubmit={submit}>
        <h1>Apis Imperium</h1>
        <p className="muted">Mode développement : choisissez un pseudo.</p>
        <input name="name" placeholder="Pseudo" maxLength={32} autoFocus />
        <button className="primary">Entrer</button>
      </form>
    );
  }
  if (!auth) return <div className="splash">Connexion…</div>;
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth(): Auth {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('useAuth doit être utilisé sous AuthProvider');
  return auth;
}
