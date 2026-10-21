import { expect, it } from 'vitest';
import { SNOW_KINDS, snowPlacementBounds, snowVarietyGeometry, snowVarietyPlacements } from '../src/render-three/SnowVarieties';
import { SNOW_RESERVES, snowBoundsOverlap, snowReserveApplies } from '../src/render-three/SnowClearance';
import { SNOW_BANK_PLACEMENTS } from '../src/render-three/SnowBanks';
import { ART_BRAZIERS, ART_BRUSHES } from '../src/render-three/PaintedMapLayout';
import manifest from '../assets/map-modules/howling-snow-varieties-v1/manifest.json';
import { bridgePoint } from '../src/game/Bridge';

it('places all eight forms, binds melt and root forms to existing objects, and leaves the central lane clear', () => {
  const placements = snowVarietyPlacements(SNOW_BANK_PLACEMENTS);
  expect(new Set(placements.map(p => p.kind))).toEqual(new Set(SNOW_KINDS));
  for (const p of placements.filter(p => p.kind === 'melt')) expect(ART_BRAZIERS.some(b => p.u === b.u && p.v === b.v)).toBe(true);
  for (const p of placements.filter(p => p.kind === 'roots')) expect(ART_BRUSHES.some(b => p.u === b.u && Math.abs(p.v - b.v) <= 9)).toBe(true);
  expect(placements.filter(p => p.kind === 'post').length).toBeGreaterThan(0);
  for (const p of placements) { expect(Math.abs(p.v)).toBeGreaterThanOrEqual(65); expect(p.width).toBeGreaterThan(0); }
});

it('keeps snow silhouettes clear of entire poro routes and crystal silhouettes, without moving original objects', () => {
  const originals = snowVarietyPlacements(SNOW_BANK_PLACEMENTS, false), fitted = snowVarietyPlacements(SNOW_BANK_PLACEMENTS);
  expect(originals.some(p => SNOW_RESERVES.some(r => r.id.startsWith('poro:') && snowBoundsOverlap(snowPlacementBounds(p), r)))).toBe(true);
  expect(originals.some(p => SNOW_RESERVES.some(r => r.id.startsWith('crystal:') && snowBoundsOverlap(snowPlacementBounds(p), r)))).toBe(true);
  for (const p of fitted) for (const reserve of SNOW_RESERVES) {
    if (snowReserveApplies(p, reserve)) expect(snowBoundsOverlap(snowPlacementBounds(p), reserve), `${p.kind}@${p.u} overlaps ${reserve.id}`).toBe(false);
  }
  for (const p of fitted) {
    const g = snowVarietyGeometry(p.kind, p.width), pos = g.getAttribute('position'), bounds = snowPlacementBounds(p);
    // The analytic reserve must contain every rendered mesh vertex.
    const origin = bridgePoint(p.u, p.v);
    for (let i = 0; i < pos.count; i++) {
      const x = origin.x + pos.getX(i), up = (pos.getY(i) - pos.getZ(i) + .8 - origin.y) / Math.SQRT2;
      expect(x).toBeGreaterThan(bounds.left); expect(x).toBeLessThan(bounds.right);
      expect(up).toBeGreaterThan(bounds.bottom); expect(up).toBeLessThan(bounds.top);
    }
    g.dispose();
  }
});

it('samples complete atlas regions, with bounded shallow snow heights and valid finite geometry', () => {
  for (const kind of SNOW_KINDS) {
    const spec = manifest.assets.find(a => a.id === kind)!, geometry = snowVarietyGeometry(kind, 170);
    try {
      const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      const xs = [], ys = [];
      for (let i = 0; i < p.count; i++) {
        expect(Number.isFinite(p.getX(i) + p.getY(i) + p.getZ(i))).toBe(true);
        expect(p.getY(i)).toBeGreaterThan(1); expect(p.getY(i)).toBeLessThan(spec.maxHeight + 1.201);
        xs.push(uv.getX(i)); ys.push(uv.getY(i));
      }
      expect(Math.min(...xs)).toBeCloseTo(spec.crop[0] / manifest.size[0]);
      expect(Math.max(...xs)).toBeCloseTo(spec.crop[2] / manifest.size[0]);
      expect(Math.max(...ys)).toBeCloseTo(1 - spec.crop[1] / manifest.size[1]);
      expect(Math.min(...ys)).toBeCloseTo(1 - spec.crop[3] / manifest.size[1]);
    } finally { geometry.dispose(); }
  }
});
