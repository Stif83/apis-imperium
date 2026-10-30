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
// Session d'un compte local (jeton signé par le serveur de jeu), et Keycloak retenu après une connexion réussie
const LOCAL_KEY = 'apiculteur.localSession';
const SSO_KEY = 'apiculteur.sso';

type LocalSession = { token: string; username: string; expires: number };

function savedLocal(): LocalSession | null {
  try {
    const session = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') as LocalSession | null;
    return session && session.expires * 1000 > Date.now() + 60_000 ? session : null;
  } catch {
    return null;
  }
}

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
  // Formulaire : comptes locaux proposés à côté de Keycloak
  const [loginForm, setLoginForm] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ keycloakUrl: string; keycloakRealm: string; keycloakClientId: string } | null>(null);

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

  const enterLocal = (session: LocalSession) => {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(session));
    setLoginForm(false);
    setAuth({
      username: session.username,
      headers: async () => ({ Authorization: `Bearer ${session.token}` }),
      logout: () => {
        localStorage.removeItem(LOCAL_KEY);
        setAuth(null);
        setLoginForm(true);
      },
    });
  };

  const enterKeycloak = async (config: { keycloakUrl: string; keycloakRealm: string; keycloakClientId: string }) => {
    const where = `Keycloak (${config.keycloakUrl}, realm « ${config.keycloakRealm} », client « ${config.keycloakClientId} »)`;
    try {
      keycloakPromise ??= startKeycloak(config);
      const kc = await keycloakPromise;
      localStorage.setItem(SSO_KEY, '1');
      setAuth({
        username: kc.tokenParsed?.preferred_username ?? 'apiculteur',
        headers: async () => {
          await kc.updateToken(30).catch(() => kc.login());
          return { Authorization: `Bearer ${kc.token}` };
        },
        logout: () => {
          localStorage.removeItem(SSO_KEY);
          kc.logout({ redirectUri: window.location.origin });
        },
      });
    } catch {
      // Au prochain chargement, le formulaire est de nouveau proposé
      localStorage.removeItem(SSO_KEY);
      keycloakPromise = null;
      setError(
        `Impossible de joindre ${where}. Vérifiez l'adresse de Keycloak, et dans le client : « Valid redirect URIs » et « Web origins » doivent contenir l'adresse du jeu.`,
      );
    }
  };

  useEffect(() => {
    (async () => {
      const config = await (await fetch('/config')).json();
      setCfg(config);
      if (config.authMode === 'dev') {
        const saved = localStorage.getItem(DEV_USER_KEY);
        if (saved) enterDev(saved);
        else setDevLogin(true);
        return;
      }
      const session = savedLocal();
      if (session) return enterLocal(session);
      // Retour de Keycloak (réponse dans le fragment de l'adresse), ou joueur déjà connecté par Keycloak
      if (/[#&]state=/.test(window.location.hash) || localStorage.getItem(SSO_KEY)) return enterKeycloak(config);
      const local = await fetch('/api/auth/local')
        .then((res) => (res.ok ? res.json() : { enabled: false }))
        .catch(() => ({ enabled: false }));
      if (local.enabled) setLoginForm(true);
      else await enterKeycloak(config);
    })().catch(() => setError('Impossible de lire la configuration (/config).'));
  }, []);

  if (error) {
    return (
      <div className="splash">
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Réessayer</button>
      </div>
    );
  }
  if (loginForm) {
    const submit = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const form = new FormData(e.currentTarget);
      setLoginError(null);
      try {
        const res = await fetch('/api/auth/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: String(form.get('username') ?? ''), password: String(form.get('password') ?? '') }),
        });
        const data = await res.json();
        if (res.ok) enterLocal(data);
        else setLoginError(typeof data.detail === 'string' ? data.detail : 'Connexion impossible.');
      } catch {
        setLoginError('Le serveur de jeu est injoignable.');
      }
    };
    return (
      <div className="splash">
        <h1>Apis Imperium</h1>
        <form className="login-form" onSubmit={submit}>
          <input name="username" placeholder="Pseudo" autoComplete="username" maxLength={64} required autoFocus />
          <input name="password" type="password" placeholder="Mot de passe" autoComplete="current-password" maxLength={256} required />
          {loginError && <p className="login-error">{loginError}</p>}
          <button className="primary">Se connecter</button>
        </form>
        {cfg && (
          <button
            onClick={() => {
              setLoginForm(false);
              enterKeycloak(cfg);
            }}
          >
            Se connecter avec Keycloak
          </button>
        )}
      </div>
    );
  }
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
