'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { GameProvider, useGame } from '@/lib/game';
import { claimableTrophies } from '@/lib/trophies';
import { BeeIcon } from './BeeIcon';
import { Honey, Modal, ThemeToggle, WorldClock } from './ui';

type Tab = { href: string; label: string; icon: string };
type Menu = { label: string; icon: string; tabs: Tab[] };
type Hints = Record<string, { text: string; alert?: boolean } | undefined>;

/**
 * Menus : rangés dans la colonne de gauche sur ordinateur ; sur téléphone, un onglet par menu en bas de l'écran
 * et des sous-onglets en haut de la page pour ceux qui regroupent plusieurs pages.
 */
const MENUS: Menu[] = [
  { label: 'Rucher', icon: '🐝', tabs: [{ href: '/', label: 'Rucher', icon: '🐝' }] },
  {
    label: 'Atelier',
    icon: '⚙️',
    tabs: [
      { href: '/usine', label: 'Centrifugeuse', icon: '⚙️' },
      { href: '/genetique', label: 'Laboratoire', icon: '🧬' },
      { href: '/distillerie', label: 'Distillerie', icon: '⚗️' },
    ],
  },
  {
    label: 'Marché',
    icon: '🛒',
    tabs: [
      { href: '/boutique', label: 'Boutique', icon: '🛒' },
      { href: '/comptoir', label: 'Comptoir', icon: '📜' },
    ],
  },
  {
    label: 'Domaine',
    icon: '🏛️',
    tabs: [
      { href: '/projets', label: 'Grands projets', icon: '🏛️' },
      { href: '/expeditions', label: 'Expéditions', icon: '🧭' },
      { href: '/musee', label: 'Musée', icon: '🏺' },
      { href: '/ruche-monde', label: 'Ruche-monde', icon: '🌍' },
    ],
  },
  { label: 'Apidex', icon: '📖', tabs: [{ href: '/apidex', label: 'Apidex', icon: '📖' }] },
  {
    label: 'Carnet',
    icon: '🏆',
    tabs: [
      { href: '/carnet', label: 'Trophées', icon: '🏆' },
      { href: '/communaute', label: 'Communauté', icon: '👥' },
      { href: '/apiculteur/moi', label: 'Mon profil', icon: '👤' },
    ],
  },
];

const isActive = (href: string, pathname: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
const menuOf = (pathname: string) => MENUS.find((m) => m.tabs.some((t) => isActive(t.href, pathname)));

/** Petite info d'état à côté d'un sous-onglet, pour savoir où il y a quelque chose à faire. */
function useTabHints(): Hints {
  const { content, state } = useGame();
  const combs = Object.keys(content.recipes).reduce((n, c) => n + (state.inventory[c] ?? 0), 0);
  const centrifuges = state.machines.centrifuge ?? 0;
  const busy = state.lab.jobs.filter((j) => j.ready_ms > state.server_time).length;
  return {
    '/usine': centrifuges && !state.factory.on ? { text: '⏸ arrêt', alert: true } : combs ? { text: `${combs} rayons` } : undefined,
    // En rouge seulement si une paillasse libre peut vraiment servir
    '/genetique': state.lab.level
      ? { text: `${busy}/${state.lab.benches}`, alert: busy < state.lab.benches && (state.inventory.labware ?? 0) > 0 }
      : undefined,
    '/distillerie': Object.keys(state.effects ?? {}).length ? { text: `${Object.keys(state.effects).length} en cours` } : undefined,
    '/ruche-monde': state.world_hive.level ? { text: `niv. ${state.world_hive.level}` } : undefined,
    '/musee': state.museum.complete.length ? { text: `${state.museum.complete.length} / ${Object.keys(content.late.museum.collections).length}` } : undefined,
    '/carnet': claimableTrophies(content, state).length ? { text: 'à réclamer', alert: true } : undefined,
  };
}

/** Menu latéral (ordinateur) : tous les menus et leurs pages, avec les indications d'état. */
function Sidebar({ hints }: { hints: Hints }) {
  const pathname = usePathname();
  return (
    <nav className="sidebar" aria-label="Menu principal">
      {MENUS.map((menu) => (
        <div key={menu.label} className="side-group">
          {menu.tabs.length > 1 && <span className="side-title">{menu.label}</span>}
          {menu.tabs.map((tab) => {
            const hint = hints[tab.href];
            return (
              <Link key={tab.href} href={tab.href} className={`side-link${isActive(tab.href, pathname) ? ' active' : ''}`}>
                <span className="side-icon" aria-hidden>
                  {tab.icon}
                </span>
                <span className="grow">{tab.label}</span>
                {hint && <span className={`subnav-hint${hint.alert ? ' alert' : ''}`}>{hint.text}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Barre d'onglets du bas (téléphone) : un onglet par menu. */
function BottomNav({ hints }: { hints: Hints }) {
  const pathname = usePathname();
  const current = menuOf(pathname);
  return (
    <nav className="bottomnav" aria-label="Menu principal">
      {MENUS.map((menu) => {
        const alert = menu.tabs.some((t) => hints[t.href]?.alert);
        return (
          <Link key={menu.label} href={menu.tabs[0].href} className={current === menu ? 'active' : ''}>
            <span className="bottom-icon" aria-hidden>
              {menu.icon}
            </span>
            <span>{menu.label}</span>
            {alert && <span className="dot" title="Quelque chose vous attend" />}
          </Link>
        );
      })}
    </nav>
  );
}

function SubNav({ hints }: { hints: Hints }) {
  const pathname = usePathname();
  const menu = menuOf(pathname);
  if (!menu || menu.tabs.length < 2) return null;
  return (
    <nav className="subnav" aria-label={menu.label}>
      {menu.tabs.map((tab) => {
        const hint = hints[tab.href];
        return (
          <Link key={tab.href} href={tab.href} className={isActive(tab.href, pathname) ? 'active' : ''}>
            <span aria-hidden>{tab.icon}</span> {tab.label}
            {hint && <span className={`subnav-hint${hint.alert ? ' alert' : ''}`}>{hint.text}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];

/** Pluie d'abeilles, pour fêter un code secret. */
function BeeRain({ onDone }: { onDone: () => void }) {
  const { content } = useGame();
  const ids = Object.keys(content.species);
  useEffect(() => {
    const timer = setTimeout(onDone, 4500);
    return () => clearTimeout(timer);
  }, [onDone]);
  return (
    <div className="bee-rain" aria-hidden>
      {Array.from({ length: 28 }, (_, i) => {
        const id = ids[(i * 37) % ids.length];
        const s = content.species[id];
        return (
          <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 7) * 0.35}s` }}>
            <BeeIcon species={id} color={s.color} secondary={s.secondary} type="drone" size={40 + (i % 3) * 12} />
          </span>
        );
      })}
    </div>
  );
}

/** Easter eggs côté navigateur : code Konami, logo taquiné, partie nocturne. */
function useEasterEggs() {
  const { state, act } = useGame();
  const [rain, setRain] = useState(false);
  const typed = useRef<string[]>([]);
  const has = (id: string) => id in (state.achievements ?? {});

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      typed.current = [...typed.current, e.key.length === 1 ? e.key.toLowerCase() : e.key].slice(-KONAMI.length);
      if (typed.current.join() === KONAMI.join()) {
        typed.current = [];
        setRain(true);
        act('/secrets', { code: 'konami' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [act]);

  useEffect(() => {
    if (new Date().getHours() === 3 && !has('insomniac')) act('/secrets', { code: 'insomniac' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rain, stopRain: () => setRain(false), has };
}

/** Aide, horloge, thème et déconnexion : à droite de l'en-tête, ou dans le tiroir sur téléphone (`onPick` le ferme). */
function Tools({ onPick }: { onPick?: () => void }) {
  const auth = useAuth();
  const pathname = usePathname();
  return (
    <>
      <Link
        href="/aide"
        className={`help-link${pathname.startsWith('/aide') ? ' active' : ''}`}
        title="Aide : comment fonctionne chaque mécanisme"
        onClick={onPick}
      >
        ❔ Aide
      </Link>
      <WorldClock />
      <ThemeToggle />
      <button className="small" onClick={auth.logout} title={`Connecté en tant que ${auth.username}`}>
        Quitter
      </button>
    </>
  );
}

function Header() {
  const auth = useAuth();
  const { state, act } = useGame();
  const [drawer, setDrawer] = useState(false);
  const { rain, stopRain, has } = useEasterEggs();
  const clicks = useRef<number[]>([]);
  const [buzzing, setBuzzing] = useState(false);
  // Dix clics rapides sur l'abeille du logo
  const tease = () => {
    const now = Date.now();
    clicks.current = [...clicks.current.filter((t) => now - t < 4000), now];
    setBuzzing(true);
    setTimeout(() => setBuzzing(false), 400);
    if (clicks.current.length >= 10) {
      clicks.current = [];
      if (!has('buzz')) act('/secrets', { code: 'buzz' });
    }
  };
  return (
    <header className="topbar" data-phase={state.world.phase}>
      <div className="brand">
        <button type="button" className={`logo-bee${buzzing ? ' buzzing' : ''}`} onClick={tease} aria-label="L'abeille du logo">
          <BeeIcon color="ffb81c" secondary="3b2f1c" type="queen" size={32} />
        </button>
        Apis Imperium
      </div>
      {rain && <BeeRain onDone={stopRain} />}
      <div className="account">
        <span className="account-tools">
          <Tools />
        </span>
        <span className="honey-pill">
          <Honey amount={state.player.honey} />
        </span>
        <button type="button" className="menu-btn" aria-label="Menu" onClick={() => setDrawer(true)}>
          ☰
        </button>
      </div>
      {drawer && (
        <Modal label="Menu" onClose={() => setDrawer(false)}>
          <div className="drawer">
            <div className="row between">
              <b>{auth.username}</b>
              <button className="help-btn" aria-label="Fermer" onClick={() => setDrawer(false)}>
                ×
              </button>
            </div>
            <Tools onPick={() => setDrawer(false)} />
          </div>
        </Modal>
      )}
    </header>
  );
}

/** Carte qui se retourne pour annoncer une nouvelle espèce. */
function Celebration() {
  const { content, celebrations, dismissCelebration } = useGame();
  const next = celebrations[0];
  if (!next) return null;
  let icon: ReactNode = null;
  let name = next.id;
  let kicker = 'Nouvelle espèce !';
  let detail = '';
  if (next.kind === 'achievement') {
    const a = content.achievements.find((x) => x.id === next.id);
    if (!a) return null;
    icon = <span className="achievement-icon big">{a.icon}</span>;
    name = a.label;
    kicker = a.secret ? 'Secret découvert !' : 'Exploit !';
    detail = `${a.desc} · Un trophée vous attend dans le Carnet.`;
  } else {
    const s = content.species[next.id];
    if (!s) return null;
    icon = <BeeIcon species={next.id} color={s.color} secondary={s.secondary} type="queen" size={128} />;
    name = s.label;
    detail = `Branche ${s.branch}`;
  }
  return (
    <Modal label={kicker} onClose={dismissCelebration}>
      <div key={`${next.kind}:${next.id}`} className="reveal">
        <span className="kicker">{kicker}</span>
        {icon}
        <span className="species">{name}</span>
        {detail && <span className="muted">{detail}</span>}
        <button className="primary" onClick={dismissCelebration}>
          {celebrations.length > 1 ? `Suivante (${celebrations.length - 1})` : 'Super !'}
        </button>
      </div>
    </Modal>
  );
}

/** Le 1er avril, les abeilles volent à reculons. */
function useSeason() {
  useEffect(() => {
    const d = new Date();
    document.documentElement.classList.toggle('avril', d.getMonth() === 3 && d.getDate() === 1);
  }, []);
}

function Season() {
  useSeason();
  return null;
}

/** Menus et sous-onglets partagent les mêmes indications, calculées une fois par rendu. */
function Layout({ children }: { children: ReactNode }) {
  const hints = useTabHints();
  return (
    <>
      <Header />
      <div className="app">
        <Sidebar hints={hints} />
        <main>
          <SubNav hints={hints} />
          {children}
        </main>
      </div>
      <BottomNav hints={hints} />
    </>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <Layout>{children}</Layout>
        <Celebration />
        <Season />
      </GameProvider>
    </AuthProvider>
  );
}
