'use client';

import { useContent } from '@/lib/game';
import { sceneUrl } from './SceneArt';

// Largeur du paysage de la bannière, en pixels de jeu (les cartes de ruche en font 150)
const BANNER_W = 400;

/** Bannière de profil : le décor des cartes de ruche (ciel du moment choisi, sol du biome), par beau temps, en panorama. */
export function SceneArtBanner({ biome, phase, className = 'profile-banner small' }: { biome: string; phase: string; className?: string }) {
  const content = useContent();
  const ground = content.biomes[biome]?.color ?? '8bc34a';
  return <div className={className} style={{ backgroundImage: `url(${sceneUrl(phase, 'clear', ground, BANNER_W)})` }} aria-hidden />;
}
