import { describe, expect, it } from 'vitest';
import { DIRECTIONS, headingForDirection, sampleLinkedThrust } from '../assets/hero-skills/2026-10-12/yasuo/q-v8-direction-picker/rig';
import { drawWeapon, gripForFrame, VIEW, WEAPON, weaponFrame, weaponPoint } from '../assets/hero-skills/2026-10-12/yasuo/q-v11-eight-wind-blade/weapon';
import { renderLinkedThrust, type RigImages } from '../assets/hero-skills/2026-10-12/yasuo/q-v7-user-linked/render';

describe('eight-direction animated wind blade attachment', () => {
  it('locks the moving grip to the wrist and keeps the complete source rectangle in frame', () => {
    for (const direction of DIRECTIONS) for (let t = 0; t <= 480; t += 4) {
      const pose = sampleLinkedThrust(headingForDirection(direction), t);
      expect(weaponPoint(pose, gripForFrame(weaponFrame(t)))).toEqual(pose.wrist);
      const rect = WEAPON.source;
      for (const x of [rect.x, rect.x + rect.width]) for (const y of [rect.y, rect.y + rect.height]) {
        const point = weaponPoint(pose, { x, y });
        expect(point.x + VIEW.foot.x).toBeGreaterThan(0); expect(point.x + VIEW.foot.x).toBeLessThan(VIEW.width);
        expect(point.y + VIEW.foot.y).toBeGreaterThan(0); expect(point.y + VIEW.foot.y).toBeLessThan(VIEW.height);
      }
    }
  });
  it('samples all 56 frames deterministically and returns to the same resting frame', () => {
    const indices = Array.from({ length: 480 }, (_, t) => weaponFrame(t));
    expect(new Set(indices).size).toBe(56);
    expect(indices.every((v, i) => i === 0 || v >= indices[i - 1])).toBe(true);
    expect(weaponFrame(0)).toBe(weaponFrame(480)); expect(weaponFrame(1000)).toBe(0);
    for (const t of [-1, NaN, Infinity]) expect(() => weaponFrame(t)).toThrow(RangeError);
  });
  it('replaces the old blade and wind, draws the hand over the hilt, and respects rear-body occlusion', () => {
    const bodies = Object.fromEntries(DIRECTIONS.map(d => [d, {}])) as RigImages['bodies'];
    const images = { bodies, upper: {}, hand: {}, sword: {} } as RigImages;
    const frames = Array.from({ length: 56 }, () => ({} as HTMLImageElement));
    const order: HTMLImageElement[] = [];
    const ctx = { save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, transform() {}, beginPath() {}, rect() {}, clip() {},
      drawImage(image: HTMLImageElement) { order.push(image); } } as unknown as CanvasRenderingContext2D;
    for (const direction of DIRECTIONS) {
      order.length = 0;
      const pose = sampleLinkedThrust(headingForDirection(direction), 200);
      renderLinkedThrust(ctx, pose, images, false, (context, p) => drawWeapon(context, p, frames));
      const blade = frames[weaponFrame(200)];
      expect(order).not.toContain(images.sword);
      expect(order.indexOf(images.hand)).toBeGreaterThan(order.indexOf(blade));
      if (pose.binding.behind) expect(order.lastIndexOf(bodies[direction])).toBeGreaterThan(order.indexOf(images.hand));
      else expect(order.indexOf(blade)).toBeGreaterThan(order.lastIndexOf(bodies[direction]));
    }
  });
});
