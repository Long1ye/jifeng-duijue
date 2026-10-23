import { describe, expect, it } from 'vitest';
import { DirectionPlayer } from '../assets/hero-skills/2026-10-12/yasuo/q-v8-direction-picker/player';
import { BINDINGS, DIRECTIONS, RIG, headingForDirection, sampleLinkedThrust, type Direction } from '../assets/hero-skills/2026-10-12/yasuo/q-v8-direction-picker/rig';
import { BINDINGS as ORIGINAL_BINDINGS, LOWER_LENGTH, UPPER_LENGTH, bladePoint, sampleLinkedThrust as sampleOriginal, transformTorso } from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/rig';
import { renderLinkedThrust, type RigImages } from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/render';

describe('direction-selectable Q presentation', () => {
  it('plays the current motion in each of the eight selectable directions', () => {
    const player = new DirectionPlayer();
    for (const direction of DIRECTIONS) {
      player.select(direction);
      expect(player.direction).toBe(direction); expect(player.elapsed).toBe(0); expect(player.playing).toBe(true);
      player.advance(100); player.advance(100);
      expect(sampleLinkedThrust(headingForDirection(player.direction), player.elapsed, true, player.repeating))
        .toEqual(sampleLinkedThrust(headingForDirection(direction), 200, true, true));
    }
  });
  it('keeps the other five directions unchanged while adjusting the downward-facing arm profiles', () => {
    for (const direction of DIRECTIONS) {
      if (direction === 'nw' || direction === 'ne') {
        expect({ ...BINDINGS[direction], shoulder: ORIGINAL_BINDINGS[direction].shoulder }).toEqual(ORIGINAL_BINDINGS[direction]);
      } else if (direction === 'n') for (let t = 0; t <= 480; t += 32) {
        expect(sampleLinkedThrust(headingForDirection(direction), t)).toEqual(sampleOriginal(headingForDirection(direction), t));
      } else if (direction === 'e' || direction === 'w') for (const t of [190, 200, 220, 240]) {
        const previous = sampleOriginal(headingForDirection(direction), t), current = sampleLinkedThrust(headingForDirection(direction), t);
        expect({ ...current, binding: previous.binding }).toEqual(previous);
      }
    }
    expect(BINDINGS.e).toEqual({ ...ORIGINAL_BINDINGS.e, ready: { x: 20, y: 8 }, pulled: { x: 18, y: 6 }, upperInFront: true });
    expect(BINDINGS.w).toEqual({ ...ORIGINAL_BINDINGS.w, ready: { x: -20, y: 8 }, pulled: { x: -18, y: 6 }, upperInFront: true });
  });
  it('reveals a shoulder-connected upper arm and keeps the starting elbow and wrist on the outer side', () => {
    for (const direction of ['e', 'se', 's', 'sw', 'w'] as const) {
      expect(BINDINGS[direction].upperInFront).toBe(true);
      const outward = direction === 'sw' || direction === 'w' ? -1 : 1;
      for (let t = 0; t <= 120; t += 4) {
        const pose = sampleLinkedThrust(headingForDirection(direction), t);
        expect((pose.elbow.x - pose.waist.x) * outward).toBeGreaterThan(5);
        expect((pose.wrist.x - pose.waist.x) * outward).toBeGreaterThan(10);
        expect(transformTorso(pose.restShoulder, pose.torso)).toEqual(pose.shoulder);
      }
    }
  });
  it('keeps downward-facing elbows outside the shoulder without switching IK branches or lifting above the head', () => {
    for (const direction of ['se', 's', 'sw'] as const) {
      const outward = direction === 'sw' ? -1 : 1;
      const expectedPole = direction === 'sw' ? 1 : -1;
      expect(BINDINGS[direction].elbowBend).toBe(expectedPole);
      for (let t = 0; t <= 480; t++) {
        const pose = sampleLinkedThrust(headingForDirection(direction), t);
        expect((pose.elbow.x - pose.shoulder.x) * outward).toBeGreaterThan(8);
        expect(pose.elbow.y - pose.shoulder.y).toBeGreaterThan(-2);
        const cross = (pose.wrist.x - pose.shoulder.x) * (pose.elbow.y - pose.shoulder.y)
          - (pose.wrist.y - pose.shoulder.y) * (pose.elbow.x - pose.shoulder.x);
        expect(Math.sign(cross)).toBe(expectedPole);
        if (t > 0) {
          const previous = sampleLinkedThrust(headingForDirection(direction), t - 1);
          expect(Math.hypot(pose.elbow.x - previous.elbow.x, pose.elbow.y - previous.elbow.y)).toBeLessThan(1);
        }
      }
    }
  });
  it('actually paints the frontal upper arm after the torso instead of hiding its shoulder connection', () => {
    const bodies = Object.fromEntries(DIRECTIONS.map(direction => [direction, {}])) as Record<Direction, HTMLImageElement>;
    const images = { bodies, upper: {}, hand: {}, sword: {} } as RigImages;
    const order: HTMLImageElement[] = [];
    const context = {
      save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, transform() {},
      beginPath() {}, rect() {}, clip() {}, drawImage(image: HTMLImageElement) { order.push(image); },
    } as unknown as CanvasRenderingContext2D;
    for (const direction of DIRECTIONS) {
      order.length = 0;
      renderLinkedThrust(context, sampleLinkedThrust(headingForDirection(direction), 0), images);
      if (BINDINGS[direction].upperInFront) {
        expect(order.indexOf(images.upper)).toBeGreaterThan(order.lastIndexOf(bodies[direction]));
        expect(order.indexOf(images.hand)).toBeGreaterThan(order.indexOf(images.upper));
      } else {
        expect(order.indexOf(images.upper)).toBeLessThan(order.indexOf(bodies[direction]));
      }
    }
  });
  it('keeps bone lengths, grip lock and exact recovery for every direction throughout the updated cast', () => {
    for (const direction of DIRECTIONS) {
      for (let t = 0; t <= 480; t += 4) {
        const pose = sampleLinkedThrust(headingForDirection(direction), t);
        expect(Math.hypot(pose.elbow.x - pose.shoulder.x, pose.elbow.y - pose.shoulder.y)).toBeCloseTo(UPPER_LENGTH, 8);
        expect(Math.hypot(pose.wrist.x - pose.elbow.x, pose.wrist.y - pose.elbow.y)).toBeCloseTo(LOWER_LENGTH, 8);
        expect(bladePoint(pose, RIG.sword.grip)).toEqual(pose.wrist);
      }
      const initial = sampleLinkedThrust(headingForDirection(direction), 0), final = sampleLinkedThrust(headingForDirection(direction), 480);
      expect(final.wrist).toEqual(initial.wrist); expect(final.elbow).toEqual(initial.elbow);
    }
  });
  it('puts each upper-diagonal sword arm on the opposite side from the original braced hand', () => {
    for (const direction of ['nw', 'ne'] as const) {
      const binding = BINDINGS[direction], nearSideX = ORIGINAL_BINDINGS[direction].shoulder.x;
      expect((binding.shoulder.x - binding.waist.x) * (nearSideX - binding.waist.x)).toBeLessThan(0);
      for (let t = 0; t <= 480; t += 4) {
        const pose = sampleLinkedThrust(headingForDirection(direction), t);
        expect((pose.wrist.x - pose.waist.x) * (nearSideX - binding.waist.x)).toBeLessThan(0);
        expect(transformTorso(pose.restShoulder, pose.torso)).toEqual(pose.shoulder);
        expect(Math.hypot(pose.elbow.x - pose.shoulder.x, pose.elbow.y - pose.shoulder.y)).toBeCloseTo(UPPER_LENGTH, 8);
        expect(Math.hypot(pose.wrist.x - pose.elbow.x, pose.wrist.y - pose.elbow.y)).toBeCloseTo(LOWER_LENGTH, 8);
        expect(bladePoint(pose, RIG.sword.grip)).toEqual(pose.wrist);
        expect(pose.foot).toEqual({ x: 0, y: 0 });
      }
      expect(sampleLinkedThrust(headingForDirection(direction), 480).wrist).toEqual(sampleLinkedThrust(headingForDirection(direction), 0).wrist);
    }
  });
  it('pauses without losing progress and resumes from the same point', () => {
    const player = new DirectionPlayer(); player.advance(100); player.togglePause(); player.advance(80);
    expect(player.elapsed).toBe(100); player.togglePause(); player.advance(80); expect(player.elapsed).toBe(180);
  });
  it('stops a single cast exactly at 480ms and restarts when resumed', () => {
    const player = new DirectionPlayer(); player.start(false);
    for (let i = 0; i < 6; i++) player.advance(100);
    expect(player.elapsed).toBe(RIG.duration); expect(player.playing).toBe(false);
    player.togglePause(); expect(player.elapsed).toBe(0); expect(player.playing).toBe(true);
  });
  it('loops with the original 1400ms cast and idle period', () => {
    const player = new DirectionPlayer(); for (let i = 0; i < 15; i++) player.advance(100);
    expect(player.elapsed).toBe(100); expect(player.playing).toBe(true);
  });
  it('keeps playback speed and single/loop mode when changing direction', () => {
    const player = new DirectionPlayer(); player.setSpeed(0.5); player.start(false); player.select('n'); player.advance(100);
    expect(player.elapsed).toBe(50); expect(player.repeating).toBe(false); expect(player.speed).toBe(0.5);
    player.setSpeed(0.25); player.advance(100); expect(player.elapsed).toBe(75);
  });
  it('scrubs to a paused exact frame and clamps to the cast range', () => {
    const player = new DirectionPlayer(); player.seek(200); player.advance(100);
    expect(player.elapsed).toBe(200); expect(player.playing).toBe(false); expect(player.repeating).toBe(false);
    player.seek(-10); expect(player.elapsed).toBe(0); player.seek(1000); expect(player.elapsed).toBe(480);
  });
  it('rejects invalid controls and limits background-tab time jumps', () => {
    const player = new DirectionPlayer(); expect(() => player.select('missing' as Direction)).toThrow(RangeError);
    expect(() => player.seek(NaN)).toThrow(RangeError); expect(() => player.setSpeed(0)).toThrow(RangeError);
    expect(() => player.advance(-1)).toThrow(RangeError); player.advance(10000); expect(player.elapsed).toBe(100);
  });
});
