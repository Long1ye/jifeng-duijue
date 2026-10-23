import { describe, expect, it } from 'vitest';
import { BODIES, DIRECTIONS, LOWER_LENGTH, MissingDirectionError, RIG, UPPER_LENGTH, bladePoint, directionForAngle, headingForDirection, normalizeAngle, partAngle, sampleAimedThrust, sampleDirectionalThrust, solveDirectionalArm } from '../assets/hero-skills/2026-10-12/yasuo/q-v6-eight-directions/rig';
import { sampleGripThrust } from '../assets/hero-skills/2026-10-12/yasuo/q-v5-small-grip-wind-e/rig';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const available = DIRECTIONS.filter(d => BODIES[d]);
describe('multi-directional layered Q', () => {
  it('quantizes eight body sectors with correct wraparound and tie boundaries', () => {
    expect(DIRECTIONS.map(d => directionForAngle(headingForDirection(d)))).toEqual([...DIRECTIONS]);
    expect(directionForAngle(337.5)).toBe('e'); expect(directionForAngle(22.5)).toBe('se');
    expect(directionForAngle(-45)).toBe('ne'); expect(normalizeAngle(720)).toBe(0);
  });
  it('leaves north explicitly missing, without falling back to another body', () => {
    expect(available).toHaveLength(7); expect(BODIES.n).toBeNull();
    for (const angle of [247.5, 260, 270, 292.49]) expect(() => sampleAimedThrust(angle, 200)).toThrow(MissingDirectionError);
  });
  it('retains approved east motion exactly after translating to a foot-centred frame', () => {
    for (let t = 0; t <= 480; t += 3) {
      const previous = sampleGripThrust(t), pose = sampleDirectionalThrust('e', t);
      expect(pose.wrist.x).toBeCloseTo(previous.wrist.x - 36, 8);
      expect(pose.wrist.y).toBeCloseTo(previous.wrist.y - 91, 8);
      expect(pose.phase).toBe(previous.phase); expect(pose.wind).toBe(previous.wind);
    }
  });
  it('keeps the two native small-arm lengths and fixed foot for every direction', () => {
    for (const direction of available) for (let t = 0; t <= RIG.duration; t += 4) {
      const pose = sampleDirectionalThrust(direction, t);
      expect(distance(pose.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
      expect(pose.foot).toEqual({ x: 0, y: 0 });
    }
  });
  it('attaches the transformed hilt and fist to the same wrist in all directions', () => {
    for (const direction of available) for (let t = 0; t <= RIG.duration; t += 8) {
      const pose = sampleDirectionalThrust(direction, t), grip = bladePoint(pose, RIG.sword.grip);
      expect(distance(grip, pose.wrist)).toBe(0);
      const angle = partAngle(pose.elbow, pose.wrist, RIG.lower.mount, RIG.lower.end);
      expect(distance({ x: pose.elbow.x + Math.cos(angle) * LOWER_LENGTH, y: pose.elbow.y + Math.sin(angle) * LOWER_LENGTH }, pose.wrist)).toBeLessThan(1e-8);
    }
  });
  it('aims precisely between body sectors and applies bounded perspective shortening', () => {
    for (let angle = 0; angle < 360; angle++) {
      if (!BODIES[directionForAngle(angle)]) continue;
      const pose = sampleAimedThrust(angle, 200), dx = pose.tip.x - pose.wrist.x, dy = pose.tip.y - pose.wrist.y;
      expect(dx * pose.forward.y - dy * pose.forward.x).toBeCloseTo(0, 8);
      expect(dx * pose.forward.x + dy * pose.forward.y).toBeGreaterThan(0);
      expect(pose.swordScale).toBeGreaterThanOrEqual(0.72); expect(pose.swordScale).toBeLessThanOrEqual(1);
    }
  });
  it('returns to the exact ready pose with continuous phase boundaries', () => {
    for (const direction of available) {
      expect(sampleDirectionalThrust(direction, 480).wrist).toEqual(sampleDirectionalThrust(direction, 0).wrist);
      expect(sampleDirectionalThrust(direction, 1400, true)).toEqual(sampleDirectionalThrust(direction, 0, true));
      for (const t of [120, 190, 240, 480]) expect(distance(sampleDirectionalThrust(direction, t - 0.001).wrist, sampleDirectionalThrust(direction, t).wrist)).toBeLessThan(0.01);
    }
  });
  it('selects behind-body occlusion for back and far-arm views', () => {
    expect(BODIES.ne?.behindBody).toBe(true); expect(BODIES.nw?.behindBody).toBe(true); expect(BODIES.w?.behindBody).toBe(true);
    expect(BODIES.s?.behindBody).toBe(false); expect(BODIES.se?.behindBody).toBe(false);
    for (const direction of available) expect((BODIES[direction]!.height - 4) * BODIES[direction]!.scale).toBeCloseTo(90, 8);
  });
  it('clamps unreachable targets and rejects invalid values', () => {
    for (const bend of [1, -1] as const) for (const target of [{ x: 0, y: 0 }, { x: 999, y: 999 }]) {
      const pose = solveDirectionalArm({ x: 0, y: 0 }, target, bend);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
    }
    for (const value of [Infinity, NaN]) expect(() => sampleAimedThrust(value, 0)).toThrow(RangeError);
    for (const value of [-1, Infinity, NaN]) expect(() => sampleAimedThrust(0, value)).toThrow(RangeError);
  });
});
