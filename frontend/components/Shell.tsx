'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { GameProvider, useGame } from '@/lib/game';
import { Honey } from './ui';

const TABS = [
  { href: '/', label: 'Rucher' },
  { href: '/usine', label: 'Usine' },
  { href: '/boutique', label: 'Boutique' },
  { href: '/genetique', label: 'Génétique' },
  { href: '/apidex', label: 'Apidex' },
  { href: '/jardin', label: 'Jardin' },
  { href: '/communaute', label: 'Communauté' },
];

function Header() {
  const auth = useAuth();
  const { state } = useGame();
  const pathname = usePathname();
  return (
    <header className="topbar">
      <div className="brand">🐝 Apis Imperium</div>
      <nav>
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} className={pathname === tab.href ? 'active' : ''}>
            {tab.label}
          </Link>
        ))}
      </nav>
      <div className="account">
        <Honey amount={state.player.honey} />
        <span className="muted">{auth.username}</span>
        <button onClick={auth.logout}>Quitter</button>
      </div>
    </header>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <GameProvider>
        <Header />
        <main>{children}</main>
      </GameProvider>
    </AuthProvider>
  );
}
