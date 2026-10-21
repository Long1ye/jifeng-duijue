import { describe, expect, it } from 'vitest';
import { meowaStormPose, meowaStormHitPose } from '../src/render/MeowaStormPresentation';
import contract from '../assets/effects/yasuo-q3-meowa-2026-10-19/contract.json';

describe('Meowa Q3 animation', () => {
 it('has transparent generated source sheets and registers the eight foot points without resampling', () => {
  expect(contract.map(c => c.frames)).toEqual([8, 4]);
  expect(contract.map(c => c.cell)).toEqual([[256, 512], [512, 512]]);
  for (const c of contract) { expect(c.job).toMatch(/^job_/); expect(c.alpha[0]).toBe(0); expect(c.alpha[1]).toBeGreaterThan(200); expect(c.resampled).toBe(false); }
  expect(contract[0].bounds.every(b => b[3] === 460)).toBe(true);
 });
 it('cycles through all eight frames and fades on actual projectile birth and range exhaustion', () => {
  const frames = Array.from({ length: 8 }, (_, i) => meowaStormPose((i + .1) / 16, 100).frame);
  expect(frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(meowaStormPose(.5, 100).frame).toBe(0);
  expect(meowaStormPose(0, 290).alpha).toBe(0); expect(meowaStormPose(.1, 100).alpha).toBeGreaterThan(.8);
  expect(meowaStormPose(.5, 2).alpha).toBeLessThan(.1); expect(meowaStormPose(1, 0).visible).toBe(false);
  expect(meowaStormPose(.5, 100).height / meowaStormPose(.5, 100).width).toBe(2);
 });
 it('shows a short upright hit sequence then completely releases it', () => {
  expect(meowaStormHitPose(-.01).visible).toBe(false);
  expect([0, .08, .16, .24].map(age => meowaStormHitPose(age).frame)).toEqual([0, 1, 2, 3]);
  expect(meowaStormHitPose(.32)).toMatchObject({ visible: false, alpha: 0 });
 });
});
