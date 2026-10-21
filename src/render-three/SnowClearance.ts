import { BRIDGE, bridgePoint } from '../game/Bridge';
import { ICE_PLACEMENTS } from './ArchitecturalIce';
import { PORO_PLACEMENTS } from './PoroBehavior';
import { ART_BRAZIERS, ART_BRUSHES, ART_GUARDIANS, artEdgeV } from './PaintedMapLayout';
import type { SnowPlacement } from './SnowVarieties';

export interface SnowViewBounds { left: number; right: number; bottom: number; top: number; }
export interface SnowReserve extends SnowViewBounds { id: string; }
const point = (u: number, v: number) => { const p = bridgePoint(u, v); return { x: p.x, up: -p.y / Math.SQRT2 }; };
export const SNOW_RESERVES: SnowReserve[] = [
  ...PORO_PLACEMENTS.map(p => {
    const corners = [p.bounds.minU, p.bounds.maxU].flatMap(u => [p.bounds.minV, p.bounds.maxV].map(v => point(u, v)));
    // Reserve the complete authored route, including the wider walking atlas,
    // head and feet. A single current-position circle misses later movement.
    return { id: `poro:${p.id}`, left: Math.min(...corners.map(c => c.x)) - p.width * .8 - 8,
      right: Math.max(...corners.map(c => c.x)) + p.width * .8 + 8,
      bottom: Math.min(...corners.map(c => c.up)) - 7, top: Math.max(...corners.map(c => c.up)) + p.width * 1.5 + 8 };
  }),
  ...ICE_PLACEMENTS.filter(p => p.attachment === 'ground' || p.attachment === 'pillar').map((p, i) => {
    const c = point(p.u, p.side * (artEdgeV(p.u) - p.inset)), up = c.up + p.height / Math.SQRT2;
    return { id: `crystal:${i}`, left: c.x - p.width * .65 - 5, right: c.x + p.width * .65 + 5,
      bottom: up - p.width * .15 - 5, top: up + p.width * 2 + 5 };
  }),
  ...ART_BRAZIERS.map((b, i) => { const c = point(b.u, b.v); return { id: `brazier:${i}`, left: c.x - 34, right: c.x + 34, bottom: c.up - 9, top: c.up + 58 }; }),
  ...ART_BRUSHES.map(b => { const c = point(b.u, b.v), width = b.length * Math.abs(BRIDGE.projection.along[0]) + b.width * Math.abs(BRIDGE.projection.across[0]);
    return { id: `brush:${b.id}`, left: c.x - width * .5, right: c.x + width * .5, bottom: c.up - 13, top: c.up + 82 }; }),
  ...ART_GUARDIANS.map(g => { const c = point(g.u, g.v); return { id: `guardian:${g.id}`, left: c.x - 38, right: c.x + 38, bottom: c.up - 15, top: c.up + 130 }; }),
];

export function snowBoundsOverlap(a: SnowViewBounds, b: SnowViewBounds): boolean {
  return a.left < b.right && a.right > b.left && a.bottom < b.top && a.top > b.bottom;
}

export function snowReserveApplies(p: SnowPlacement, reserve: SnowReserve): boolean {
  // Snow rings intentionally wrap their own real fixture; preserve that
  // relationship while excluding other decorations and all roaming animals.
  if (p.kind === 'melt' && reserve.id.startsWith('brazier:')) {
    const b = ART_BRAZIERS[Number(reserve.id.split(':')[1])];
    if (b.u === p.u && b.v === p.v) return false;
  }
  if (p.kind === 'roots' && reserve.id.startsWith('brush:') && ART_BRUSHES.some(b => reserve.id === `brush:${b.id}` && b.u === p.u)) return false;
  return true;
}

/** Layout-only fitting at the game's fixed 45-degree camera. Original sprite
 * depth, shaders and resident paths stay intact; no forced foreground layer. */
export function fitSnowClearance(placements: readonly SnowPlacement[], bounds: (p: SnowPlacement) => SnowViewBounds): SnowPlacement[] {
  const fitted: SnowPlacement[] = [];
  for (const original of placements) {
    const fixed = ['post', 'melt', 'roots'].includes(original.kind);
    let match: SnowPlacement | undefined;
    for (const scale of [1, .85, .7, .55]) {
      for (const shift of fixed ? [0] : [0, -8, 8, -16, 16, -24, 24, -32, 32]) {
        const u = original.u + shift, inset = artEdgeV(original.u) - Math.abs(original.v);
        const p = { ...original, u, v: Math.sign(original.v) * (artEdgeV(u) - inset), width: original.width * scale };
        if (Math.abs(u) > 710 || Math.abs(p.v) < 65) continue;
        const box = bounds(p);
        if (SNOW_RESERVES.some(reserve => snowReserveApplies(p, reserve) && snowBoundsOverlap(box, reserve))) continue;
        if (['thick', 'rubble', 'wind'].includes(p.kind) && fitted.some(other => ['thick', 'rubble', 'wind'].includes(other.kind) && snowBoundsOverlap(box, bounds(other)))) continue;
        match = p; break;
      }
      if (match) break;
    }
    if (match) fitted.push(match);
  }
  return fitted;
}
