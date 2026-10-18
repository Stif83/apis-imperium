'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { GameProvider, useGame } from '@/lib/game';
import { BeeIcon } from './BeeIcon';
import { ButterflyIcon, TreeIcon } from './garden';
import { Honey, ThemeToggle, WorldClock } from './ui';

const TABS = [
  { href: '/', label: 'Rucher' },
  { href: '/usine', label: 'Usine' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/genetique', label: 'Génétique' },
  { href: '/apidex', label: 'Apidex' },
  { href: '/carnet', label: 'Carnet' },
  { href: '/communaute', label: 'Communauté' },
];

function Header() {
  const auth = useAuth();
  const { content, state } = useGame();
  const pathname = usePathname();
  // Pastille sur le Carnet quand une récompense attend
  const rewards = content.objectives.some((o) => {
    const p = state.objectives[o.id];
    return p && !p.claimed && p.progress >= o.target;
  });
  return (
    <header className="topbar" data-phase={state.world.phase}>
      <div className="brand">
        <BeeIcon color="ffb81c" secondary="3b2f1c" type="queen" size={28} />
        Apis Imperium
      </div>
      <nav>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'active' : ''}>
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
  if (next.kind === 'bee') {
    const s = content.species[next.id];
    if (!s) return null;
    icon = <BeeIcon color={s.color} secondary={s.secondary} type="queen" size={112} />;
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

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <Header />
        <main>{children}</main>
        <Celebration />
      </GameProvider>
    </AuthProvider>
  );
}
