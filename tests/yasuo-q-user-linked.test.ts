import { describe, expect, it } from 'vitest';
import { BINDINGS, DIRECTIONS, LOWER_LENGTH, RIG, UPPER_LENGTH, bladePoint, headingForDirection, sampleLinkedThrust, transformTorso } from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/rig';
import inspection from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/source-inspection.json';
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
describe('user-body coupled Q', () => {
  it('uses eight distinct user originals, including the replacement southeast', () => {
    expect(inspection.entries).toHaveLength(8); expect(inspection.missing_direction).toBeNull();
    expect(new Set(inspection.entries.map(e => e.source_sha256)).size).toBe(8);
    expect(inspection.entries.every(e => e.source_byte_exact)).toBe(true);
  });
  it('keeps the waist and feet fixed while the shoulder follows the rendered torso', () => {
    for (const direction of DIRECTIONS) for (let t = 0; t <= 480; t += 4) {
      const pose = sampleLinkedThrust(headingForDirection(direction), t);
      expect(pose.foot).toEqual({ x: 0, y: 0 });
      expect(transformTorso(pose.waist, pose.torso)).toEqual(pose.waist);
      expect(transformTorso(pose.restShoulder, pose.torso)).toEqual(pose.shoulder);
      expect(distance(pose.shoulder, pose.elbow)).toBeCloseTo(UPPER_LENGTH, 8);
      expect(distance(pose.elbow, pose.wrist)).toBeCloseTo(LOWER_LENGTH, 8);
    }
  });
  it('has actual torso contribution and a fixed-body control with identical limb lengths', () => {
    for (const direction of DIRECTIONS) {
      const angle = headingForDirection(direction), linked = sampleLinkedThrust(angle, 200), fixed = sampleLinkedThrust(angle, 200, false);
      expect(distance(linked.shoulder, fixed.shoulder)).toBeGreaterThan(1);
      expect(fixed.shoulder).toEqual(fixed.restShoulder);
      expect(fixed.torso.shearX).toBe(0); expect(fixed.torso.shearY).toBe(0);
    }
  });
  it('starts the body burst before the arm thrust and has a balanced arm ratio', () => {
    expect(sampleLinkedThrust(0, 112).phase).toBe('prepare');
    expect(sampleLinkedThrust(0, 115).torso.shearX).not.toBe(sampleLinkedThrust(0, 110).torso.shearX);
    expect(LOWER_LENGTH / UPPER_LENGTH).toBeLessThan(1.2);
  });
  it('returns to precisely the original torso and hand pose without boundary jumps', () => {
    for (const direction of DIRECTIONS) {
      const angle = headingForDirection(direction), initial = sampleLinkedThrust(angle, 0), final = sampleLinkedThrust(angle, 480);
      expect(final.wrist).toEqual(initial.wrist); expect(final.shoulder).toEqual(initial.shoulder); expect(final.torso).toEqual(initial.torso);
      for (const t of [110, 120, 190, 195, 240, 480]) {
        expect(distance(sampleLinkedThrust(angle, t - 0.001).wrist, sampleLinkedThrust(angle, t).wrist)).toBeLessThan(0.01);
      }
      expect(sampleLinkedThrust(angle, 1400, true, true)).toEqual(sampleLinkedThrust(angle, 0, true, true));
    }
  });
  it('locks the blade grip to the fist for every degree, with no missing north sector', () => {
    for (let angle = 0; angle < 360; angle++) {
      const pose = sampleLinkedThrust(angle, 200);
      expect(distance(bladePoint(pose, RIG.sword.grip), pose.wrist)).toBe(0);
      const dx = pose.tip.x - pose.wrist.x, dy = pose.tip.y - pose.wrist.y;
      expect(dx * pose.forward.y - dy * pose.forward.x).toBeCloseTo(0, 8);
    }
  });
  it('uses body-relative measured shoulders and rejects invalid input', () => {
    expect(Object.keys(BINDINGS).sort()).toEqual([...DIRECTIONS].sort());
    for (const angle of [NaN, Infinity]) expect(() => sampleLinkedThrust(angle, 0)).toThrow(RangeError);
    for (const time of [-1, NaN, Infinity]) expect(() => sampleLinkedThrust(0, time)).toThrow(RangeError);
  });
});
