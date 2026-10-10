'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
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
};

const GameContext = createContext<Game | null>(null);
const POLL_MS = 5000;

export function GameProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const [content, setContent] = useState<Content | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
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
          notify(typeof data.detail === 'string' ? data.detail : 'Action impossible.');
          return null;
        }
        return data as T;
      } catch {
        notify('Le serveur de jeu est injoignable.');
        return null;
      }
    },
    [auth, notify],
  );

  const request = useCallback(
    async <T extends GameState>(path: string, body?: unknown, method = 'POST') => {
      const next = await call<T>(path, body ?? {}, method);
      if (next) setState(next);
      return next;
    },
    [call],
  );

  const act = useCallback(
    async (path: string, body?: unknown, method = 'POST') => (await request(path, body, method)) !== null,
    [request],
  );

  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const next = await call<GameState>('/state');
      if (alive && next) setState(next);
    };
    call<Content>('/content').then((c) => alive && c && setContent(c));
    refresh();
    const timer = setInterval(refresh, POLL_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [call]);

  return (
    <>
      {content && state ? (
        <GameContext.Provider value={{ content, state, act, request, call }}>{children}</GameContext.Provider>
      ) : (
        <div className="splash">Ouverture du rucher…</div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

export function useGame(): Game {
  const game = useContext(GameContext);
  if (!game) throw new Error('useGame doit être utilisé sous GameProvider');
  return game;
}
