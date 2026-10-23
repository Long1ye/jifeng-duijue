import { describe, expect, it } from 'vitest';
import { direction, stormPosition, FLIGHT_MS } from '../assets/hero-skills/2026-10-12/yasuo/q-v12-storm-preview/storm';
describe('upright Q3 preview', () => {
  it.each([0, 45, 90, 135, 180, 225, 270, 315, 17, 123, 359])('moves along %s degrees without rotating the artwork', angle => {
    const d = direction(angle), a = stormPosition(angle, 0), b = stormPosition(angle, FLIGHT_MS);
    expect(Math.hypot(d.x, d.y)).toBeCloseTo(1);
    expect(b.x - a.x).toBeCloseTo(d.x * 145); expect(b.y - a.y).toBeCloseTo(d.y * 145);
    expect(b.rotation).toBe(0); expect(b.progress).toBe(1);
  });
  it('clamps flight at both ends', () => { expect(stormPosition(0, -20).progress).toBe(0); expect(stormPosition(0, 2000).progress).toBe(1); });
});
