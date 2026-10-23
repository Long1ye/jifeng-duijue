import { describe, expect, it } from 'vitest';
import { LOWER_LENGTH, RIG, UPPER_LENGTH, sampleThrust, solveArm } from '../assets/hero-skills/2026-10-12/yasuo/q-v3-layered-e/rig';

const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('east-only layered Q proof', () => {
  it('has the intended phase boundaries and returns to the identical ready pose', () => {
    expect([0, 90, 150, 190, 400].map(time => sampleThrust(time).phase)).toEqual(['prepare', 'thrust', 'impact', 'recover', 'ready']);
    expect(sampleThrust(400).wrist).toEqual(sampleThrust(0).wrist);
    expect(sampleThrust(999).active).toBe(false);
  });
  it('preserves both limb lengths through every sampled millisecond', () => {
    for (let time = 0; time <= RIG.duration; time++) {
      const pose = sampleThrust(time);
      expect(distance(pose.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
      expect(pose.foot).toEqual(RIG.foot);
    }
  });
  it('keeps the sword pointing east and aligns its grip with the wrist', () => {
    for (let time = 0; time <= RIG.duration; time += 7) {
      const pose = sampleThrust(time);
      expect(pose.swordAngle).toBe(0);
      expect(pose.tip.y).toBe(pose.wrist.y);
      expect(pose.tip.x - pose.wrist.x).toBeCloseTo(85, 8);
    }
  });
  it('does not jump at phase boundaries', () => {
    for (const time of [90, 150, 190, 400]) expect(distance(sampleThrust(time - 0.001).wrist, sampleThrust(time).wrist)).toBeLessThan(0.01);
  });
  it('moves forward along a line during the thrust and pauses at maximum extension', () => {
    let previous = sampleThrust(90);
    for (let time = 91; time <= 150; time++) {
      const pose = sampleThrust(time);
      expect(pose.wrist.x).toBeGreaterThanOrEqual(previous.wrist.x);
      expect(pose.wrist.y).toBeLessThanOrEqual(previous.wrist.y);
      previous = pose;
    }
    expect(sampleThrust(189).wrist).toEqual(sampleThrust(150).wrist);
  });
  it('rests between loops instead of starting a second thrust during recovery', () => {
    expect(sampleThrust(800, true).phase).toBe('ready');
    expect(sampleThrust(1200, true).wrist).toEqual(sampleThrust(0).wrist);
  });
  it('clamps unreachable targets without stretching or producing NaN', () => {
    for (const target of [{ x: 999, y: 42 }, RIG.shoulder]) {
      const joints = solveArm(RIG.shoulder, target);
      expect(distance(RIG.shoulder, joints.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(joints.elbow, joints.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
    }
  });
  it('rejects invalid timing and coordinates', () => {
    for (const value of [-1, NaN, Infinity]) expect(() => sampleThrust(value)).toThrow(RangeError);
    expect(() => solveArm(RIG.shoulder, { x: NaN, y: 0 })).toThrow(RangeError);
  });
});
