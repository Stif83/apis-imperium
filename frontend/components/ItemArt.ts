import { type Ctx, type Mask, rect, shade, shaded, sprite } from '@/lib/pixel';
import type { Item } from '@/lib/types';

/** Icônes d'objets en pixel art (16 × 16) : une forme par famille d'objets, aux couleurs de l'objet. */

export const ITEM_PX = 16;

type Shape = 'comb' | 'ingot' | 'gem' | 'shard' | 'drop' | 'pile' | 'lump' | 'block' | 'fruit' | 'frame' | 'device'
  | 'flask' | 'potion' | 'gear' | 'chip' | 'wheat' | 'bone' | 'spool' | 'flake';

const BY_ID: Record<string, Shape> = {};
const group = (shape: Shape, ids: string) => ids.split(' ').forEach((id) => (BY_ID[id] = shape));
group('ingot', 'copper tin iron lead nickel silver gold platinum uranium');
group('gem', 'lapis emerald ruby sapphire diamond prism quartz amber moonstone sunstone ender_pearl');
group('shard', 'ice_shard energy lightning_shard chaos_shard');
group('drop', 'honeydew royal_jelly mead milk oil fuel venom acid slime maple_syrup dew mana imperial_jelly primordial_essence');
group('pile', 'pollen gunpowder glowstone sugar dye coal stardust phosphor clay');
group('block', 'wax refractory_wax propolis resin precious_wood');
group('fruit', 'fruit cherry lemon plum cocoa coffee petal');
group('gear', 'gear');
group('chip', 'circuit microprocessor');
group('wheat', 'wheat');
group('bone', 'bone');
group('spool', 'silk');
group('flake', 'snowflake');

function shapeOf(id: string, item: Item | undefined): Shape {
  if (!item) return 'lump';
  if (item.category === 'comb') return 'comb';
  if (item.category === 'elixir') return 'potion';
  if (item.category === 'consumable') return 'flask';
  if (item.category === 'module') return id.startsWith('frame_') ? 'frame' : 'device';
  return BY_ID[id] ?? 'lump';
}

const circle = (cx: number, cy: number, r: number): Mask => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const MASKS: Partial<Record<Shape, Mask>> = {
  comb: (x, y) => Math.abs(x - 7.5) <= 6.5 && Math.abs(y - 7.5) <= 7.5 - Math.abs(x - 7.5) * 0.55,
  ingot: (x, y) => y >= 5 && y <= 12 && x >= 4 - (y - 5) * 0.45 && x <= 11 + (y - 5) * 0.45,
  gem: (x, y) => y >= 3 && y <= 13 && Math.abs(x - 7.5) <= (y <= 6 ? 3.5 + (y - 3) : 6.5 - (y - 6) * 0.9),
  shard: (x, y) => Math.abs(x - 7.5) * 1.8 + Math.abs(y - 7.5) * 0.75 <= 6.2,
  drop: (x, y) => circle(7.5, 9.5, 4.8)(x, y) || (y >= 2 && y < 9 && Math.abs(x - 7.5) <= (y - 2) * 0.62),
  pile: (x, y) => y >= 6 && y <= 13 && (x - 7.5) ** 2 / 49 + (y - 13.5) ** 2 / 60 <= 1,
  lump: (x, y) => (x - 7.5) ** 2 / 36 + (y - 8.5) ** 2 / 26 <= 1,
  block: (x, y) => x >= 2 && x <= 13 && y >= 4 && y <= 12 && !((x === 2 || x === 13) && (y === 4 || y === 12)),
  fruit: circle(7.5, 9, 5.2),
  gear: (x, y) => {
    const d = Math.hypot(x - 7.5, y - 7.5);
    const a = Math.atan2(y - 7.5, x - 7.5);
    return d >= 2 && d <= (Math.cos(a * 8) > 0.2 ? 7.2 : 5.6);
  },
};

/** Dessine l'icône d'un objet ; `unknown` : simple silhouette grise. */
export function drawItem(ctx: Ctx, id: string, item: Item | undefined, unknown = false) {
  const shape = shapeOf(id, item);
  const color = unknown ? '#b8b2a0' : `#${item?.color ?? '888888'}`;
  const W = ITEM_PX;
  // Silhouette d'un objet inconnu : sa forme si elle en a une, sinon une simple boule
  const mask = unknown ? MASKS[shape] ?? MASKS.lump : MASKS[shape];
  if (mask) {
    const pattern: Mask | undefined =
      shape === 'comb' ? (x, y) => y % 3 === 0 && (x + (Math.floor(y / 3) % 2) * 2) % 4 === 1 : shape === 'pile' ? (x, y) => (x * 3 + y * 5) % 7 === 0 : undefined;
    shaded(ctx, W, W, mask, color, { pattern });
  }
  if (unknown) return;
  const white = '#ffffff';
  switch (shape) {
    case 'gem':
    case 'shard':
    case 'ingot':
      rect(ctx, 6, shape === 'ingot' ? 6 : 5, 2, 1, white);
      break;
    case 'drop':
    case 'lump':
      rect(ctx, 5, 8, 1, 2, white);
      break;
    case 'fruit':
      sprite(ctx, ['..kk', '.Lk.', 'LL..'], 7, 1, { k: '#5d3a1a', L: '#5aa02c' });
      rect(ctx, 5, 7, 1, 2, white);
      break;
    case 'frame': {
      shaded(ctx, W, W, (x, y) => x >= 1 && x <= 14 && y >= 2 && y <= 13, '#a0703c');
      shaded(ctx, W, W, (x, y) => x >= 3 && x <= 12 && y >= 4 && y <= 11, color, {
        pattern: (x, y) => y % 2 === 0 && (x + y) % 3 === 0,
      });
      break;
    }
    case 'device': {
      shaded(ctx, W, W, (x, y) => x >= 1 && x <= 14 && y >= 3 && y <= 13, '#90a4ae');
      shaded(ctx, W, W, (x, y) => x >= 4 && x <= 11 && y >= 5 && y <= 10, color);
      for (const [x, y] of [[2, 4], [13, 4], [2, 12], [13, 12]]) rect(ctx, x, y, 1, 1, '#546e7a');
      rect(ctx, 5, 6, 2, 1, white);
      break;
    }
    case 'flask':
    case 'potion': {
      const glass = '#d7eef5';
      const body: Mask = shape === 'flask'
        ? (x, y) => (y >= 2 && y <= 6 && x >= 6 && x <= 9) || (y > 6 && y <= 14 && Math.abs(x - 7.5) <= 2 + (y - 6) * 0.7)
        : (x, y) => (y >= 3 && y <= 6 && x >= 6 && x <= 9) || circle(7.5, 10, 4.8)(x, y);
      shaded(ctx, W, W, body, glass, { outline: '#6f98a6' });
      shaded(ctx, W, W, (x, y) => body(x, y) && y >= (shape === 'flask' ? 10 : 9) && body(x - 1, y) && body(x + 1, y) && body(x, y + 1), color);
      if (shape === 'potion') rect(ctx, 6, 1, 4, 2, '#8d6e63');
      rect(ctx, 6, shape === 'flask' ? 8 : 7, 1, 2, white);
      break;
    }
    case 'chip': {
      shaded(ctx, W, W, (x, y) => x >= 3 && x <= 12 && y >= 3 && y <= 12, '#263238');
      for (let k = 4; k <= 11; k += 2) {
        rect(ctx, k, 1, 1, 2, '#cfd8dc');
        rect(ctx, k, 13, 1, 2, '#cfd8dc');
        rect(ctx, 1, k, 2, 1, '#cfd8dc');
        rect(ctx, 13, k, 2, 1, '#cfd8dc');
      }
      shaded(ctx, W, W, (x, y) => x >= 6 && x <= 9 && y >= 6 && y <= 9, color);
      break;
    }
    case 'gear':
      rect(ctx, 7, 7, 2, 2, shade(color, -0.55));
      break;
    case 'wheat':
      sprite(
        ctx,
        ['......b.', '.....bbb', '...b..b.', '..bbb.k.', '...b.k..', '.b..k...', 'bbbk....', '.bk.....', '.k......', 'k.......'],
        4,
        3,
        { b: color, k: '#9c7a2b' },
      );
      break;
    case 'bone':
      sprite(ctx, ['oo......oo', 'obo....obo', '.obbbbbbo.', '.obbbbbbo.', 'obo....obo', 'oo......oo'], 3, 5, { o: '#8c8573', b: color });
      break;
    case 'spool':
      shaded(ctx, W, W, (x, y) => x >= 4 && x <= 11 && y >= 4 && y <= 11, color, { pattern: (_, y) => y % 2 === 0 });
      rect(ctx, 3, 2, 10, 2, '#8a5a2b');
      rect(ctx, 3, 12, 10, 2, '#8a5a2b');
      break;
    case 'flake':
      sprite(
        ctx,
        ['...b...b...', '....b.b....', '.b...b...b.', '..b..b..b..', '...bbbbb...', 'bbbbb.bbbbb', '...bbbbb...', '..b..b..b..', '.b...b...b.', '....b.b....', '...b...b...'],
        2,
        2,
        { b: color },
      );
      break;
  }
}
