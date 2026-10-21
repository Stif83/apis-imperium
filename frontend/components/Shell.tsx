'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { GameProvider, useGame } from '@/lib/game';
import { claimableTrophies } from '@/lib/trophies';
import { BeeIcon } from './BeeIcon';
import { ButterflyIcon, TreeIcon } from './garden';
import { Honey, ThemeToggle, WorldClock } from './ui';

const TABS = [
  { href: '/', label: 'Rucher' },
  { href: '/usine', label: 'Usine' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/comptoir', label: 'Comptoir' },
  { href: '/projets', label: 'Projets' },
  { href: '/expeditions', label: 'Expéditions' },
  { href: '/genetique', label: 'Génétique' },
  { href: '/apidex', label: 'Apidex' },
  { href: '/carnet', label: 'Carnet' },
  { href: '/communaute', label: 'Communauté' },
];

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

function Header() {
  const auth = useAuth();
  const { content, state, act } = useGame();
  const pathname = usePathname();
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
  // Pastille sur le Carnet quand une récompense attend
  const rewards = claimableTrophies(content, state).length > 0;
  return (
    <header className="topbar" data-phase={state.world.phase}>
      <div className="brand">
        <span className={`logo-bee${buzzing ? ' buzzing' : ''}`} onClick={tease}>
          <BeeIcon color="ffb81c" secondary="3b2f1c" type="queen" size={32} />
        </span>
        Apis Imperium
      </div>
      {rain && <BeeRain onDone={stopRain} />}
      <nav>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={(tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)) ? 'active' : ''}>
            {tab.label}
            {tab.href === '/carnet' && rewards && <span className="dot" title="Récompense à réclamer" />}
          </Link>
        ))}
      </nav>
      <div className="account">
        <WorldClock />
        <ThemeToggle />
        <span className="honey-pill">
          <Honey amount={state.player.honey} />
        </span>
        <button className="small" onClick={auth.logout} title={`Connecté en tant que ${auth.username}`}>
          Quitter
        </button>
      </div>
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
  } else if (next.kind === 'bee') {
    const s = content.species[next.id];
    if (!s) return null;
    icon = <BeeIcon species={next.id} color={s.color} secondary={s.secondary} type="queen" size={128} />;
    name = s.label;
    detail = `Branche ${s.branch}`;
  } else if (next.kind === 'tree') {
    const t = content.garden.trees[next.id];
    if (!t) return null;
    icon = <TreeIcon color={t.color} secondary={t.secondary} size={112} />;
    name = t.label;
    kicker = "Nouvel arbre !";
    detail = t.branch;
  } else {
    const b = content.garden.butterflies[next.id];
    if (!b) return null;
    icon = <ButterflyIcon color={b.color} secondary={b.secondary} size={112} />;
    name = b.label;
    kicker = 'Nouveau papillon !';
  }
  return (
    <div className="overlay" onClick={dismissCelebration}>
      <div key={`${next.kind}:${next.id}`} className="reveal" role="dialog" aria-label={kicker} onClick={(e) => e.stopPropagation()}>
        <span className="kicker">{kicker}</span>
        {icon}
        <span className="species">{name}</span>
        {detail && <span className="muted">{detail}</span>}
        <button className="primary" autoFocus onClick={dismissCelebration}>
          {celebrations.length > 1 ? `Suivante (${celebrations.length - 1})` : 'Super !'}
        </button>
      </div>
    </div>
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

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <Header />
        <main>{children}</main>
        <Celebration />
        <Season />
      </GameProvider>
    </AuthProvider>
  );
}
