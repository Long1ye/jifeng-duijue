import { describe, expect, it } from 'vitest';
import { LOWER_LENGTH, RIG, UPPER_LENGTH, sampleWindCast } from '../assets/hero-skills/2026-10-12/yasuo/q-v4-wind-cast-e/rig';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('open-palm wind-cast sample', () => {
  it('keeps the entire palm sprite away from the entire floating sword throughout the cast', () => {
    for (let time = 0; time <= 480; time++) {
      const pose = sampleWindCast(time);
      expect(pose.gap).toBeGreaterThanOrEqual(RIG.minimumGap - 1e-8);
      expect(Math.round(pose.sword.x) - pose.handBounds.right).toBeGreaterThan(14);
    }
  });
  it('preserves arm lengths and a fixed body anchor', () => {
    for (let time = 0; time <= 480; time += 3) {
      const pose = sampleWindCast(time);
      expect(distance(pose.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
      expect(pose.foot).toEqual(RIG.foot);
    }
  });
  it('gathers, releases, holds, dissipates, and finishes hidden', () => {
    expect([0, 120, 190, 240, 480].map(t => sampleWindCast(t).phase)).toEqual(['gather', 'release', 'impact', 'recover', 'ready']);
    expect(sampleWindCast(0).opacity).toBe(0);
    expect(sampleWindCast(190).opacity).toBe(1);
    expect(sampleWindCast(480).opacity).toBe(0);
    expect(sampleWindCast(1400, true)).toEqual(sampleWindCast(0));
  });
  it('moves the sword independently from the hand without rotating it', () => {
    expect(sampleWindCast(190).sword.x).toBeGreaterThan(sampleWindCast(120).sword.x);
    for (let time = 0; time <= 480; time++) {
      const pose = sampleWindCast(time);
      expect(pose.swordAngle).toBe(0); expect(pose.sword.y).toBe(48);
      expect(pose.opacity).toBeGreaterThanOrEqual(0); expect(pose.opacity).toBeLessThanOrEqual(1);
    }
  });
  it('fits the blade and wind envelope inside the native preview canvas', () => {
    for (let time = 0; time <= 480; time++) {
      const pose = sampleWindCast(time);
      expect(7 + Math.round(pose.sword.x) + RIG.sword.width).toBeLessThan(256);
      expect(47 + pose.sword.y - 10).toBeGreaterThan(0);
      expect(47 + pose.sword.y + 10).toBeLessThan(160);
    }
  });
  it('has no discontinuities at phase boundaries', () => {
    for (const time of [120, 190, 240, 480]) {
      const before = sampleWindCast(time - 0.001), after = sampleWindCast(time);
      expect(distance(before.wrist, after.wrist)).toBeLessThan(0.01);
      expect(distance(before.sword, after.sword)).toBeLessThan(0.01);
      expect(Math.abs(before.opacity - after.opacity)).toBeLessThan(0.001);
    }
  });
  it('rejects invalid timing', () => { for (const t of [-1, NaN, Infinity]) expect(() => sampleWindCast(t)).toThrow(RangeError); });
});
