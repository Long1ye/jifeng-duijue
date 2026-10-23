import { describe, expect, it } from 'vitest';
import { sampleWindCast, sampleGust, sampleWall, TIMING } from '../assets/hero-skills/2026-10-12/yasuo/w-v2-layered-e/motion';
import { transformTorso } from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/rig';

describe('east W animation study', () => {
  it('keeps feet planted, shoulder attached and bone lengths stable throughout the cast', () => {
    for (let t = 0; t <= 560; t++) {
      const p = sampleWindCast(t);
      expect(p.foot).toEqual({ x: 0, y: 0 });
      expect(p.shoulder).toEqual(transformTorso(p.restShoulder, p.torso));
      expect(Math.hypot(p.elbow.x - p.shoulder.x, p.elbow.y - p.shoulder.y)).toBeCloseTo(18);
      expect(Math.hypot(p.wrist.x - p.elbow.x, p.wrist.y - p.elbow.y)).toBeCloseTo(21);
    }
  });
  it('returns to the identical rest pose and has no joint jumps', () => {
    const start = sampleWindCast(0), end = sampleWindCast(TIMING.castEnd);
    expect(end.wrist.x).toBeCloseTo(start.wrist.x); expect(end.wrist.y).toBeCloseTo(start.wrist.y);
    expect(end.angle).toBe(start.angle);
    for (let t = 1; t <= 560; t++) {
      const a = sampleWindCast(t - 1), b = sampleWindCast(t);
      expect(Math.hypot(a.elbow.x - b.elbow.x, a.elbow.y - b.elbow.y)).toBeLessThan(1);
      expect(Math.hypot(a.wrist.x - b.wrist.x, a.wrist.y - b.wrist.y)).toBeLessThan(1);
    }
  });
  it('emits the gust only at release and lets the wall persist after the hero has recovered', () => {
    expect(sampleGust(189).active).toBe(false); expect(sampleGust(190).active).toBe(true);
    expect(sampleGust(300).x).toBe(232); expect(sampleGust(301).active).toBe(false);
    expect(sampleWall(299).active).toBe(false); expect(sampleWall(1000).opacity).toBe(1);
    expect(sampleWindCast(1000).active).toBe(false); expect(sampleWall(2240).opacity).toBe(0);
  });
  it('rejects invalid times', () => { expect(() => sampleWindCast(-1)).toThrow(); expect(() => sampleWindCast(NaN)).toThrow(); });
});
