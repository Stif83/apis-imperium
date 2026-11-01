'use client';

import { useContent } from '@/lib/game';
import type { ProfileSettings } from '@/lib/types';
import { regionUrl } from './PlaceArt';
import { sceneUrl } from './SceneArt';
import { worldTreeUrl } from './WorldTreeArt';

// Largeur du paysage de la bannière, en pixels de jeu (les cartes de ruche en font 150)
const BANNER_W = 400;

/** Bannière de profil : le décor des cartes de ruche (ciel du moment choisi, sol du biome), par beau temps, en panorama. */
export function SceneArtBanner({ biome, phase, className = 'profile-banner small' }: { biome: string; phase: string; className?: string }) {
  const content = useContent();
  const ground = content.biomes[biome]?.color ?? '8bc34a';
  return <div className={className} style={{ backgroundImage: `url(${sceneUrl(phase, 'clear', ground, BANNER_W)})` }} aria-hidden />;
}

/** Bannière de profil selon le décor choisi : paysage du biome, arbre-monde (au niveau de la Ruche-monde) ou région. */
export function ProfileBanner({
  settings,
  worldLevel,
  className = 'profile-banner small',
}: {
  settings: Pick<ProfileSettings, 'biome' | 'phase' | 'decor'>;
  worldLevel: number;
  className?: string;
}) {
  const decor = settings.decor ?? 'scene';
  if (decor === 'scene') return <SceneArtBanner biome={settings.biome} phase={settings.phase} className={className} />;
  const src = decor === 'world' ? worldTreeUrl(worldLevel) : regionUrl(decor.slice('region:'.length));
  return <div className={`${className} pixel decor-${decor === 'world' ? 'world' : 'region'}`} style={{ backgroundImage: `url(${src})` }} aria-hidden />;
}
