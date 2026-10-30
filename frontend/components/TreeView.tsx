'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { BeeIcon } from '@/components/BeeIcon';
import type { Mutation } from '@/lib/apidex';
import { useGame } from '@/lib/game';

const NODE_W = 66;
const NODE_H = 86;
const ICON = 32;
const MIN_K = 0.08;
const MAX_K = 4;
// Place laissée à la légende (en bas) quand on cadre l'arbre ; en haut, la hauteur de la barre d'outils
const BOTTOM = 40;

type View = { x: number; y: number; k: number };

function layout(ids: string[], mutations: Mutation[], tiers: Record<string, number>) {
  const shown = new Set(ids);
  const levels = [...new Set(ids.map((id) => tiers[id]))].sort((a, b) => a - b);
  const rows = levels.map((level) => ids.filter((id) => tiers[id] === level));
  const widest = Math.max(1, ...rows.map((row) => row.length));
  const pos: Record<string, { x: number; y: number }> = {};
  rows.forEach((row, r) => {
    if (r > 0) {
      // Chaque espèce se place sous ses parents pour limiter les croisements
      const anchor = (id: string) => {
        const xs = mutations
          .filter((m) => m.result === id)
          .flatMap((m) => [m.a, m.b])
          .filter((parent) => pos[parent])
          .map((parent) => pos[parent].x);
        return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
      };
      const anchors = Object.fromEntries(row.map((id) => [id, anchor(id)]));
      row.sort((a, b) => anchors[a] - anchors[b]);
    }
    const left = ((widest - row.length) * NODE_W) / 2;
    row.forEach((id, i) => {
      pos[id] = { x: left + (i + 0.5) * NODE_W, y: r * NODE_H + 8 };
    });
  });
  const edges = mutations
    .filter((m) => shown.has(m.result))
    .flatMap((m) => [m.a, m.b].filter((parent) => shown.has(parent)).map((parent) => ({ from: parent, to: m.result })));
  return { pos, edges, width: widest * NODE_W, height: rows.length * NODE_H };
}

type Content = ReturnType<typeof useGame>['content'];
type Point = { x: number; y: number };

/** Lignée d'une espèce : tous ses ancêtres, et ce que donnent ses croisements. */
function lineage(content: Content, selected: string): Set<string> {
  const keep = new Set<string>([selected]);
  const climb = (id: string) => {
    for (const m of content.mutations.filter((x) => x.result === id))
      for (const parent of [m.a, m.b])
        if (!keep.has(parent)) {
          keep.add(parent);
          climb(parent);
        }
  };
  climb(selected);
  for (const m of content.mutations.filter((x) => x.a === selected || x.b === selected)) keep.add(m.result).add(m.a).add(m.b);
  return keep;
}

/** Espèces reliées directement à la sélection : ses parents, ses partenaires et leurs descendants. */
function linkedTo(content: Content, selected: string | null): Set<string> {
  const linked = new Set<string>();
  if (!selected) return linked;
  for (const m of content.mutations) {
    if (m.result === selected) linked.add(m.a).add(m.b);
    if (m.a === selected || m.b === selected) linked.add(m.result).add(m.a).add(m.b);
  }
  return linked;
}

/** La scène occupe toute la hauteur restante de la fenêtre (ou tout l'écran en plein écran). */
function useStageHeight(stage: RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState(600);
  useEffect(() => {
    const resize = () => {
      const top = stage.current?.getBoundingClientRect().top ?? 0;
      setHeight(document.fullscreenElement ? window.innerHeight : Math.max(420, window.innerHeight - top - window.scrollY - 24));
    };
    resize();
    window.addEventListener('resize', resize);
    document.addEventListener('fullscreenchange', resize);
    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('fullscreenchange', resize);
    };
  }, [stage]);
  return height;
}

/**
 * Déplacement et zoom de la scène : molette, glisser, pincement à deux doigts.
 * `onTap` reçoit l'espèce touchée quand le geste est un simple clic (presque sans mouvement).
 */
function usePanZoom(stage: RefObject<HTMLDivElement | null>, onTap: (id: string) => void) {
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const pointers = useRef(new Map<number, Point>());
  const drag = useRef({ moved: 0, node: null as string | null });

  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    setView((v) => {
      const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
      return { k, x: px - (px - v.x) * (k / v.k), y: py - (py - v.y) * (k / v.k) };
    });
  }, []);

  // Molette : écouteur non passif pour empêcher la page de défiler
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const box = el.getBoundingClientRect();
      zoomAt(e.clientX - box.left, e.clientY - box.top, Math.exp(-e.deltaY * 0.0015));
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, [stage, zoomAt]);

  const local = (e: { clientX: number; clientY: number }): Point => {
    const box = stage.current?.getBoundingClientRect();
    return { x: e.clientX - (box?.left ?? 0), y: e.clientY - (box?.top ?? 0) };
  };

  // Pincement : rapport des écarts entre les deux doigts
  const pinch = (pointerId: number, prev: Point, p: Point) => {
    const other = [...pointers.current.entries()].find(([id]) => id !== pointerId)?.[1];
    if (!other) return;
    const before = Math.hypot(prev.x - other.x, prev.y - other.y);
    const after = Math.hypot(p.x - other.x, p.y - other.y);
    drag.current.moved += 10;
    if (before > 0) zoomAt((p.x + other.x) / 2, (p.y + other.y) / 2, after / before);
  };

  const handlers = {
    onPointerDown: (e: ReactPointerEvent) => {
      if ((e.target as Element).closest('.tree-toolbar, .tree-card')) return;
      pointers.current.set(e.pointerId, local(e));
      drag.current = { moved: 0, node: (e.target as Element).closest<SVGGElement>('[data-id]')?.dataset.id ?? null };
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const prev = pointers.current.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      if (pointers.current.size === 1) {
        drag.current.moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
        setView((v) => ({ ...v, x: v.x + p.x - prev.x, y: v.y + p.y - prev.y }));
      } else if (pointers.current.size === 2) pinch(e.pointerId, prev, p);
      pointers.current.set(e.pointerId, p);
    },
    onPointerUp: (e: ReactPointerEvent) => {
      if (!pointers.current.delete(e.pointerId)) return;
      const id = drag.current.node;
      if (pointers.current.size === 0 && drag.current.moved < 6 && id) onTap(id);
    },
  };

  return { view, setView, zoomAt, handlers };
}

/** Une espèce dans l'arbre : icône, nom tronqué, et halo selon son lien avec la sélection. */
function TreeNode({ id, pos, mark, known }: { id: string; pos: Point; mark: string; known: boolean }) {
  const { content } = useGame();
  const s = content.species[id];
  const label = known ? s.label : '???';
  const { x, y } = pos;
  return (
    <g data-id={id} className={`tree-node ${mark}`}>
      <title>{label}</title>
      <rect className="halo" x={x - NODE_W / 2 + 2} y={y - 2} width={NODE_W - 4} height={ICON + 18} rx={6} />
      <BeeIcon species={id} color={s.color} secondary={s.secondary} type="queen" size={ICON} x={x - ICON / 2} y={y} unknown={!known} />
      <text x={x} y={y + ICON + 10}>
        {label.length > 11 ? `${label.slice(0, 10)}…` : label}
      </text>
    </g>
  );
}

/** Espèce sélectionnée, en bas de la scène, avec un lien vers sa fiche. */
function TreeCard({ id, onClose }: { id: string; onClose: () => void }) {
  const { content, state } = useGame();
  const species = content.species[id];
  if (!species) return null;
  const known = state.discovered.includes(id);
  return (
    <div className="tree-card">
      <BeeIcon species={id} color={species.color} secondary={species.secondary} type="queen" size={40} unknown={!known} />
      <div className="grow">
        <b>{known ? species.label : '???'}</b>
        <div className="muted">{known ? species.branch : 'Espèce inconnue'}</div>
      </div>
      <Link className="link-button" href={`/apidex/${id}`}>
        Ouvrir la fiche
      </Link>
      <button className="small" aria-label="Désélectionner" onClick={onClose}>
        ×
      </button>
    </div>
  );
}

function TreeLegend() {
  return (
    <div className="tree-legend muted">
      <span className="legend">
        <i style={{ background: 'var(--info)' }} /> parents
      </span>
      <span className="legend">
        <i style={{ background: 'var(--accent)' }} /> mutations
      </span>
      <span>Molette ou pincement : zoom · glisser : se déplacer · double-clic : fiche</span>
    </div>
  );
}

/** Arbre des mutations plein écran : molette ou pincement pour zoomer, glisser pour se déplacer. */
export function TreeView({ tiers, initial }: { tiers: Record<string, number>; initial?: string | null }) {
  const { content, state } = useGame();
  const router = useRouter();
  const known = useMemo(() => new Set(state.discovered), [state.discovered]);
  const [selected, setSelected] = useState<string | null>(initial ?? null);
  const [partial, setPartial] = useState(!!initial);
  const [query, setQuery] = useState('');
  const stage = useRef<HTMLDivElement>(null);
  const toolbar = useRef<HTMLDivElement>(null);
  const height = useStageHeight(stage);
  const { view, setView, zoomAt, handlers } = usePanZoom(stage, (id) => setSelected((s) => (id === s ? null : id)));

  const ids = useMemo(() => {
    const all = Object.keys(content.species);
    if (!partial || !selected) return all;
    const keep = lineage(content, selected);
    return all.filter((id) => keep.has(id));
  }, [partial, selected, content]);
  const tree = useMemo(() => layout(ids, content.mutations, tiers), [ids, content, tiers]);

  const fit = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return;
    const top = (toolbar.current?.offsetHeight ?? 40) + 16;
    const room = box.height - top - BOTTOM;
    const k = Math.max(MIN_K, Math.min(1.5, Math.min(box.width / tree.width, room / tree.height) * 0.97));
    setView({ k, x: (box.width - tree.width * k) / 2, y: top + (room - tree.height * k) / 2 });
  }, [tree, setView]);

  const focus = (id: string, k = 1.6) => {
    const box = stage.current?.getBoundingClientRect();
    const p = tree.pos[id];
    if (!box || !p) return;
    setView({ k, x: box.width / 2 - p.x * k, y: box.height / 2 - (p.y + ICON / 2) * k });
  };

  // Nouvel arbre (complet ou lignée) ou nouvelle taille : on le recadre en entier
  useEffect(fit, [fit, height]);

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else stage.current?.requestFullscreen?.();
  };

  const linked = linkedTo(content, selected);
  const knownList = Object.keys(content.species).filter((id) => known.has(id));
  const go = (text: string) => {
    setQuery(text);
    const id = knownList.find((s) => content.species[s].label.toLowerCase() === text.trim().toLowerCase());
    if (!id) return;
    setSelected(id);
    if (tree.pos[id]) focus(id);
    else setPartial(false);
  };
  const zoomCenter = (factor: number) => zoomAt((stage.current?.clientWidth ?? 0) / 2, height / 2, factor);
  const markOf = (id: string) => (id === selected ? 'selected' : linked.has(id) ? 'linked' : selected ? 'dim' : '');

  return (
    <div
      ref={stage}
      className="tree-stage"
      style={{ height }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
      onPointerCancel={handlers.onPointerUp}
      onPointerLeave={handlers.onPointerUp}
      onDoubleClick={(e) => {
        const id = (e.target as Element).closest<SVGGElement>('[data-id]')?.dataset.id;
        if (id) router.push(`/apidex/${id}`);
      }}
    >
      <svg width="100%" height="100%">
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {tree.edges.map((edge) => {
            const a = tree.pos[edge.from];
            const b = tree.pos[edge.to];
            const kind = edge.to === selected ? 'parent' : edge.from === selected ? 'child' : selected ? 'dim' : '';
            const y1 = a.y + ICON + 16;
            const y2 = b.y - 2;
            const mid = (y1 + y2) / 2;
            return <path key={`${edge.from}>${edge.to}`} className={`tree-edge ${kind}`} d={`M${a.x},${y1} C${a.x},${mid} ${b.x},${mid} ${b.x},${y2}`} />;
          })}
          {ids.map((id) => (
            <TreeNode key={id} id={id} pos={tree.pos[id]} mark={markOf(id)} known={known.has(id)} />
          ))}
        </g>
      </svg>

      <div ref={toolbar} className="tree-toolbar">
        <button className="small" title="Zoomer" onClick={() => zoomCenter(1.3)}>
          +
        </button>
        <button className="small" title="Dézoomer" onClick={() => zoomCenter(1 / 1.3)}>
          −
        </button>
        <button className="small" onClick={fit}>
          Ajuster
        </button>
        <button className="small" onClick={fullscreen}>
          Plein écran
        </button>
        <button className={partial ? 'small' : 'small primary'} onClick={() => setPartial(false)}>
          Arbre complet
        </button>
        <button className={partial ? 'small primary' : 'small'} disabled={!selected} onClick={() => setPartial(true)}>
          Lignée
        </button>
        <input list="tree-species" placeholder="Aller à…" value={query} onChange={(e) => go(e.target.value)} aria-label="Aller à une espèce" />
        <datalist id="tree-species">
          {knownList.map((id) => (
            <option key={id} value={content.species[id].label} />
          ))}
        </datalist>
        <span className="muted zoom-level">{Math.round(view.k * 100)} %</span>
      </div>

      <TreeLegend />

      {selected && <TreeCard id={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
