'use client';

import { useEffect, useRef, type DependencyList } from 'react';

/**
 * Petit moteur de pixel art : on dessine à basse résolution sur un <canvas>, que le CSS agrandit sans lissage
 * (image-rendering: pixelated). Les sprites s'écrivent en texte, un caractère par pixel ('.' = transparent).
 */

export type Ctx = CanvasRenderingContext2D;
export type Palette = Record<string, string>;

export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), w, h);
}

/** Éclaircit (f > 0) ou assombrit (f < 0) une couleur « rrggbb » ou « #rrggbb » ; renvoie « #rrggbb ». */
export function shade(hex: string, f: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const mix = (c: number) => Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f));
  const hex2 = (c: number) => mix(c).toString(16).padStart(2, '0');
  return `#${hex2((n >> 16) & 255)}${hex2((n >> 8) & 255)}${hex2(n & 255)}`;
}

/** Dessine un sprite ; `pick` peut remplacer la couleur d'un pixel (par exemple pour un remplissage partiel). */
export function sprite(
  ctx: Ctx,
  rows: string[],
  x: number,
  y: number,
  pal: Palette,
  pick?: (ch: string, col: number, row: number) => string | undefined,
) {
  rows.forEach((line, j) => {
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '.') continue;
      const color = pick?.(ch, i, j) ?? pal[ch];
      if (color) rect(ctx, x + i, y + j, 1, 1, color);
    }
  });
}

export type Mask = (x: number, y: number) => boolean;

/**
 * Remplit une forme (masque de w × h pixels) avec un ombrage en quatre tons : contour sombre, reflet en haut
 * à gauche, ombre en bas à droite. `pattern` assombrit certains pixels intérieurs (alvéoles, veines…).
 */
export function shaded(
  ctx: Ctx,
  w: number,
  h: number,
  mask: Mask,
  color: string,
  opts: { x?: number; y?: number; outline?: string; pattern?: Mask } = {},
) {
  const { x: ox = 0, y: oy = 0 } = opts;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask(x, y);
  const tones = { edge: opts.outline ?? shade(color, -0.55), light: shade(color, 0.35), dark: shade(color, -0.28), deep: shade(color, -0.18) };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y)) continue;
      let c = color;
      if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) c = tones.edge;
      else if (!inside(x - 2, y) || !inside(x, y - 2)) c = tones.light;
      else if (!inside(x + 2, y) || !inside(x, y + 2)) c = tones.dark;
      else if (opts.pattern?.(x, y)) c = tones.deep;
      rect(ctx, ox + x, oy + y, 1, 1, c);
    }
  }
}

const urls = new Map<string, string>();

/**
 * Image (data URL) d'un dessin de w × h pixels, calculée une seule fois par clé : des centaines d'icônes ne
 * coûtent qu'autant de dessins qu'il y a d'objets différents. Chaîne vide côté serveur.
 */
export function pixelUrl(key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  const hit = urls.get(key);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const url = canvas.toDataURL();
  urls.set(key, url);
  return url;
}

/** Bruit déterministe 0..1, pour disperser étoiles, brins de paille ou touffes d'herbe toujours au même endroit. */
export function noise(x: number, y: number, seed = 0) {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

/** Canvas de w × h pixels, redessiné quand `deps` change. */
export function usePixelCanvas(w: number, h: number, draw: (ctx: Ctx) => void, deps: DependencyList) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, ...deps]);
  return ref;
}
