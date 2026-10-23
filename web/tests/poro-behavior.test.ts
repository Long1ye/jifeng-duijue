import { expect, it } from 'vitest';
import { PORO_PLACEMENTS, PoroBehavior, poroDirection } from '../src/render-three/PoroBehavior';
import { ART_BRUSHES } from '../src/render-three/PaintedMapLayout';
import { bridgePoint, onPlayableBridge } from '../src/game/Bridge';

it('keeps entire wander enclosures in the shoulder, clear of brush and other poros', () => {
  for (const p of PORO_PLACEMENTS) {
    const b = p.bounds;
    // Sweep the complete enclosure, including routes that future waypoints use.
    for (let u = b.minU; u <= b.maxU; u += .5) for (let v = b.minV; v <= b.maxV; v += .5) {
      expect(onPlayableBridge(bridgePoint(u, v), 12)).toBe(true);
      expect(v).toBeLessThanOrEqual(p.id.includes('road-resident') ? -57 : -93);
      expect(ART_BRUSHES.some(grass => Math.abs(u - grass.u) < grass.length / 2 + 12 && Math.abs(v - grass.v) < grass.width / 2 + 12)).toBe(false);
    }
  }
  const residents = PORO_PLACEMENTS.map(p => new PoroBehavior(p));
  const moved = residents.map(() => false);
  for (let frame = 0; frame <= 60 * 180; frame++) {
    residents.forEach((r, i) => {
      r.update(frame / 60, []); moved[i] ||= Math.abs(r.u - r.home.u) > 1;
      expect(r.u).toBeGreaterThanOrEqual(r.home.bounds.minU); expect(r.u).toBeLessThanOrEqual(r.home.bounds.maxU);
      expect(r.v).toBeGreaterThanOrEqual(r.home.bounds.minV); expect(r.v).toBeLessThanOrEqual(r.home.bounds.maxV);
    });
    const [a, b] = residents.map(r => bridgePoint(r.u, r.v));
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(32);
  }
  expect(moved.every(Boolean)).toBe(true);
});

it('stops to watch nearby heroes, resists threshold flicker and resumes its own route', () => {
  const r = new PoroBehavior(PORO_PLACEMENTS[2]);
  for (let t = 0; t <= 6; t += 1 / 60) r.update(t, []);
  const before = { u: r.u, v: r.v }, point = bridgePoint(r.u, r.v);
  r.update(6.1, [{ x: point.x - 100, y: point.y + 10 }]);
  expect(r.attention).toBe(true); expect(r.moving).toBe(false); expect(r.facing.x).toBeLessThan(0);
  for (let t = 6.2; t < 10; t += .1) r.update(t, [{ x: point.x + 160, y: point.y }]);
  expect(r.attention).toBe(true); expect(r.u).toBe(before.u); expect(r.v).toBe(before.v);
  r.update(10.1, [{ x: point.x + 180, y: point.y }]); expect(r.attention).toBe(false);
  for (let t = 10.2; t < 16; t += .1) r.update(t, []);
  expect(Math.abs(r.u - before.u) + Math.abs(r.v - before.v)).toBeGreaterThan(1);
  const frozen = { u: r.u, v: r.v };
  r.update(16, []); const paused = { u: r.u, v: r.v }; r.update(16, []); expect({ u: r.u, v: r.v }).toEqual(paused);
  expect(frozen.u).toBeGreaterThanOrEqual(r.home.bounds.minU);
  r.update(0, []); expect(r.u).toBe(r.home.u); expect(r.v).toBe(r.home.v);
});

it('always shows a front-facing pose across all movement and attention directions', () => {
  expect([.7, 2.4, -.7, -2.4].map(a => poroDirection(a))).toEqual([0, 1, 0, 1]);
  for (let angle = -Math.PI; angle <= Math.PI; angle += .01) {
    expect([0, 1]).toContain(poroDirection(angle));
  }
  expect(poroDirection(Math.PI / 2 + .01, 0)).toBe(0);
  expect(poroDirection(-Math.PI / 2 + .01, 1)).toBe(1);
});

it('preserves walk poses on presentation frames sharing the same simulation time', () => {
  const r = new PoroBehavior(PORO_PLACEMENTS[2]);
  let time = 0;
  for (; time < 10; time += 1 / 60) { r.update(time, []); if (r.moving) break; }
  expect(r.moving).toBe(true);
  const position = { u: r.u, v: r.v };
  for (let frame = 0; frame < 120; frame++) r.update(time, []);
  expect(r.moving).toBe(true); expect({ u: r.u, v: r.v }).toEqual(position);
});
