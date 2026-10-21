import { describe, expect, it } from 'vitest';
import { LOWER_LENGTH, RIG, UPPER_LENGTH, partAngle, sampleGripThrust, solveArm, windRibbon } from '../assets/hero-skills/2026-10-12/yasuo/q-v5-small-grip-wind-e/rig';
import { LOWER_LENGTH as oldLower, UPPER_LENGTH as oldUpper } from '../assets/hero-skills/2026-10-12/yasuo/q-v3-layered-e/rig';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('smaller east-facing gripping Q', () => {
  it('uses shorter native arm segments and a smaller hand canvas', () => {
    expect(UPPER_LENGTH + LOWER_LENGTH).toBeLessThan((oldUpper + oldLower) * 0.75);
    expect(RIG.lower.width).toBeLessThan(45); expect(RIG.lower.height).toBeLessThan(19);
  });
  it('preserves limb lengths and the fixed foot through the complete motion', () => {
    for (let time = 0; time <= RIG.duration; time++) {
      const pose = sampleGripThrust(time);
      expect(distance(pose.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
      expect(pose.foot).toEqual(RIG.foot);
    }
  });
  it('attaches both the rendered fist and the sword grip to the same wrist', () => {
    for (let time = 0; time <= RIG.duration; time += 3) {
      const pose = sampleGripThrust(time);
      const angle = partAngle(pose.elbow, pose.wrist, RIG.lower.mount, RIG.lower.end);
      const x = RIG.lower.end.x - RIG.lower.mount.x;
      expect(pose.elbow.x + Math.cos(angle) * x).toBeCloseTo(pose.wrist.x, 8);
      expect(pose.elbow.y + Math.sin(angle) * x).toBeCloseTo(pose.wrist.y, 8);
      expect(pose.swordOrigin.x + RIG.sword.grip.x).toBe(pose.wrist.x);
      expect(pose.swordOrigin.y + RIG.sword.grip.y).toBe(pose.wrist.y);
      expect(pose.swordAngle).toBe(0); expect(pose.tip.y).toBe(pose.wrist.y);
    }
  });
  it('returns to the identical ready pose and rests between casts', () => {
    expect(sampleGripThrust(480).wrist).toEqual(sampleGripThrust(0).wrist);
    expect(sampleGripThrust(1100, true).phase).toBe('ready');
    expect(sampleGripThrust(1400, true)).toEqual(sampleGripThrust(0, true));
  });
  it('has continuous phase boundaries and a monotonic horizontal thrust', () => {
    expect([0, 120, 190, 240, 480].map(t => sampleGripThrust(t).phase)).toEqual(['prepare', 'thrust', 'impact', 'recover', 'ready']);
    for (const time of [120, 190, 240, 480]) expect(distance(sampleGripThrust(time - 0.001).wrist, sampleGripThrust(time).wrist)).toBeLessThan(0.01);
    for (let time = 121; time <= 190; time++) {
      expect(sampleGripThrust(time).wrist.x).toBeGreaterThanOrEqual(sampleGripThrust(time - 1).wrist.x);
      expect(sampleGripThrust(time).wrist.y).toBe(43);
    }
  });
  it('bounds moving wind to the blade and uses complementary front/back strands', () => {
    for (let time = 0; time <= 480; time += 20) {
      const one = windRibbon(time, 0), two = windRibbon(time, 1);
      expect(one.some(p => p.front)).toBe(true); expect(one.some(p => !p.front)).toBe(true);
      for (let i = 0; i < one.length; i++) {
        expect(one[i].x).toBeGreaterThanOrEqual(RIG.sword.bladeStart);
        expect(one[i].x).toBeLessThanOrEqual(RIG.sword.tip.x);
        expect(Math.abs(one[i].y - RIG.sword.grip.y)).toBeLessThanOrEqual(5);
        expect(two[i].front).toBe(!one[i].front);
      }
      expect(sampleGripThrust(time).wind).toBeGreaterThanOrEqual(0);
      expect(sampleGripThrust(time).wind).toBeLessThanOrEqual(1);
    }
    expect(sampleGripThrust(0).wind).toBe(0); expect(sampleGripThrust(480).wind).toBe(0);
  });
  it('rejects invalid input and clamps unreachable targets without stretching', () => {
    for (const time of [-1, Infinity, NaN]) {
      expect(() => sampleGripThrust(time)).toThrow(RangeError); expect(() => windRibbon(time, 0)).toThrow(RangeError);
    }
    expect(() => solveArm(RIG.shoulder, { x: NaN, y: 0 })).toThrow(RangeError);
    for (const target of [RIG.shoulder, { x: 999, y: 42 }]) {
      const pose = solveArm(RIG.shoulder, target);
      expect(distance(RIG.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
    }
  });
});
