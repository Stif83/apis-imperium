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

/**
 * Canvas de w × h pixels redessiné quand `deps` change. Avec `animate`, `draw` reçoit le temps (ms) environ
 * dix fois par seconde, et l'animation s'arrête quand l'onglet est caché ou que l'appareil demande moins de mouvement.
 */
export function usePixelCanvas(w: number, h: number, draw: (ctx: Ctx, t: number) => void, deps: DependencyList, animate = false) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    canvas.width = w;
    canvas.height = h;
    ctx.imageSmoothingEnabled = false;
    const paint = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      draw(ctx, t);
    };
    paint(0);
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || still) return;
    let frame = 0;
    let last = 0;
    const loop = (t: number) => {
      frame = requestAnimationFrame(loop);
      if (document.hidden || t - last < 100) return;
      last = t;
      paint(t);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [w, h, animate, ...deps]);
  return ref;
}
