import type { Metadata } from 'next';
import { Fredoka, Nunito } from 'next/font/google';
import type { ReactNode } from 'react';
import { Shell } from '@/components/Shell';
import './globals.css';

// Polices téléchargées au moment du build et servies par le frontend : aucune requête externe à l'exécution
const display = Fredoka({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display' });
const body = Nunito({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--font-body' });

const THEME_SCRIPT = `try{var t=localStorage.getItem('apis.theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export const metadata: Metadata = {
  title: 'Apis Imperium',
  icons: '/favicon.svg',
  description: "Élevez, croisez et sélectionnez vos abeilles.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        {/* Applique le thème choisi avant le premier affichage, pour éviter un flash clair la nuit */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
