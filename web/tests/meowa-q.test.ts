import { describe, expect, it } from 'vitest';
import { meowaQPose, meowaQHitPose } from '../src/render/MeowaQPresentation';
import { YASUO_Q_HIT_SECONDS } from '../src/game/YasuoQ';
import contract from '../assets/effects/yasuo-q-meowa-2026-10-19/contract.json';

describe('Meowa Q art playback', () => {
 it('uses real generated alpha sheets with consistent cells and no resampling', () => {
  expect(contract.map(item => item.frames)).toEqual([8, 4]);
  expect(contract.map(item => item.cell)).toEqual([[512, 256], [512, 512]]);
  for (const item of contract) { expect(item.job).toMatch(/^job_/); expect(item.alpha[0]).toBe(0); expect(item.alpha[1]).toBeGreaterThan(200); expect(item.resampled).toBe(false); }
 });
 it('prepares extension before contact, shows the full blade at the hit, and ends on time', () => {
  expect(meowaQPose(YASUO_Q_HIT_SECONDS - .03, 0).visible).toBe(false);
  expect(meowaQPose(YASUO_Q_HIT_SECONDS - .01, 0)).toMatchObject({ visible: true, frame: 1 });
  expect(meowaQPose(YASUO_Q_HIT_SECONDS + .012, 0)).toMatchObject({ visible: true, frame: 2, alpha: 1 });
  expect(meowaQPose(YASUO_Q_HIT_SECONDS + .181, 0).visible).toBe(false);
  expect(meowaQPose(YASUO_Q_HIT_SECONDS, Math.PI).hand.x).toBeLessThan(0);
  expect(meowaQHitPose(-.001).visible).toBe(false); expect(meowaQHitPose(.12)).toMatchObject({ visible: true, frame: 2 }); expect(meowaQHitPose(.2).visible).toBe(false);
 });
});
