'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './auth';
import type { Content, GameState } from './types';

type Game = {
  content: Content;
  state: GameState;
  /** Appelle l'API ; renvoie true si l'action a réussi. Les erreurs sont affichées en notification. */
  act: (path: string, body?: unknown, method?: string) => Promise<boolean>;
  /** Comme `act`, mais renvoie la réponse complète (état du jeu et champs supplémentaires). */
  request: <T extends GameState>(path: string, body?: unknown) => Promise<T | null>;
  /** Appel d'API générique (onglet communautaire). */
  call: <T>(path: string, body?: unknown, method?: string) => Promise<T | null>;
  /** Découvertes à fêter (nouvelle espèce, exploit), la plus ancienne en tête. */
  celebrations: Discovery[];
  dismissCelebration: () => void;
};

type Discovery = { kind: 'bee' | 'achievement'; id: string };

function discoveries(state: GameState): Set<string> {
  return new Set([
    ...state.discovered.map((id) => `bee:${id}`),
    ...Object.keys(state.achievements ?? {}).map((id) => `achievement:${id}`),
  ]);
}

const GameContext = createContext<Game | null>(null);
// Le contenu ne change pas pendant la partie : les composants qui n'ont besoin que de lui (icônes, portraits)
// ne sont pas redessinés à chaque sondage de l'état
const ContentContext = createContext<Content | null>(null);
const POLL_MS = 5000;

/** Piste pour l'administrateur quand le jeu ne se charge pas (le détail est dans les journaux du backend). */
const FAILURE_HINTS: Record<number, string> = {
  0: 'Le frontend ne joint pas le backend : vérifiez que le pod backend tourne et la variable BACKEND_URL.',
  401: "Le jeton de connexion est refusé : vérifiez KEYCLOAK_ISSUER (il doit être identique au champ « issuer » de Keycloak) et KEYCLOAK_CLIENT_ID. L'adresse /api/health/auth aide au diagnostic.",
  502: 'Le backend ne répond pas : vérifiez le pod backend et ses journaux.',
  503: "Le backend ne lit pas les clés de Keycloak : vérifiez KEYCLOAK_JWKS_URL et, si Keycloak a un certificat interne, KEYCLOAK_CA_FILE. L'adresse /api/health/auth donne l'erreur exacte.",
};

export function GameProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Dernière erreur d'appel : affichée à la place de l'écran d'attente si le jeu n'a pas pu se charger
  const [failure, setFailure] = useState<{ status: number; message: string } | null>(null);
  const [celebrations, setCelebrations] = useState<Discovery[]>([]);
  const known = useRef<Set<string> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const notify = useCallback((message: string) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const call = useCallback(
    async <T,>(path: string, body?: unknown, method?: string): Promise<T | null> => {
      try {
        const res = await fetch(`/api${path}`, {
          method: method ?? (body === undefined ? 'GET' : 'POST'),
          headers: { ...(await auth.headers()), 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          const message = typeof data.detail === 'string' ? data.detail : 'Action impossible.';
          notify(message);
          setFailure({ status: res.status, message });
          return null;
        }
        return data as T;
      } catch {
        notify('Le serveur de jeu est injoignable.');
        setFailure({ status: 0, message: 'Le serveur de jeu est injoignable.' });
        return null;
      }
    },
    [auth, notify],
  );

  // Toute nouvelle découverte depuis l'état précédent est fêtée ; rien au premier chargement
  const receive = useCallback((next: GameState) => {
    const now = discoveries(next);
    if (known.current) {
      const fresh = [...now].filter((key) => !known.current!.has(key));
      if (fresh.length) {
        setCelebrations((queue) => [
          ...queue,
          ...fresh.map((key) => {
            const [kind, id] = key.split(':');
            return { kind: kind as Discovery['kind'], id };
          }),
        ]);
      }
    }
    known.current = now;
    setState(next);
  }, []);

  const request = useCallback(
    async <T extends GameState>(path: string, body?: unknown, method = 'POST') => {
      const next = await call<T>(path, body ?? {}, method);
      if (next) receive(next);
      return next;
    },
    [call, receive],
  );

  const act = useCallback(
    async (path: string, body?: unknown, method = 'POST') => (await request(path, body, method)) !== null,
    [request],
  );

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const next = await call<GameState>('/state');
      if (alive && next) receive(next);
    };
    call<Content>('/content').then((c) => alive && c && setContent(c));
    refresh();
    // Onglet caché : pas de sondage ; au retour, l'état est rafraîchi tout de suite
    const timer = setInterval(() => document.hidden || refresh(), POLL_MS);
    const onVisible = () => document.hidden || refresh();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [call, receive]);

  const dismissCelebration = useCallback(() => setCelebrations((queue) => queue.slice(1)), []);
  // Une notification ne doit pas redessiner tout le jeu : la valeur ne change qu'avec ce qu'elle contient
  const game = useMemo(
    () => (content && state ? { content, state, act, request, call, celebrations, dismissCelebration } : null),
    [content, state, act, request, call, celebrations, dismissCelebration],
  );

  return (
    <>
      {game ? (
        <ContentContext.Provider value={game.content}>
          <GameContext.Provider value={game}>{children}</GameContext.Provider>
        </ContentContext.Provider>
      ) : failure ? (
        <div className="splash">
          <b>Le rucher ne s'ouvre pas</b>
          <span>{failure.message}</span>
          <span className="muted">{FAILURE_HINTS[failure.status] ?? FAILURE_HINTS[0]}</span>
          <button className="primary" onClick={() => window.location.reload()}>
            Réessayer
          </button>
        </div>
      ) : (
        <div className="splash">Ouverture du rucher…</div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

/** Le contenu du jeu seul ; à préférer à useGame dans les composants qui n'affichent pas l'état. */
export function useContent(): Content {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useContent doit être utilisé sous GameProvider');
  return content;
}

export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame doit être utilisé sous GameProvider');
  return game;
}
