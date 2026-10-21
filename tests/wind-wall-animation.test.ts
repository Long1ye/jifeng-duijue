import {describe,it,expect} from 'vitest';
import {windWallPose,windWallAxes} from '../src/render/WindWallAnimation';
import {W_DURATION} from '../src/game/WindWall';
describe('generated wind wall presentation',()=>{
 it('rises, loops, fades and ends on the real blocking lifetime',()=>{
  expect(windWallPose(-.1).alpha).toBe(0);expect(windWallPose(0).grow).toBe(0);
  expect(windWallPose(.4).grow).toBe(1);expect(windWallPose(.4).alpha).toBe(1);
  expect(windWallPose(.5).frame).toBe(windWallPose(1.5).frame);
  expect(windWallPose(W_DURATION-.1).alpha).toBeLessThan(.2);
  expect(windWallPose(W_DURATION).active).toBe(false);expect(windWallPose(W_DURATION).alpha).toBe(0);
 });
 it('retains a visible upright plane at every cast angle',()=>{
  for(let i=0;i<360;i++){
   const axis=windWallAxes(i*Math.PI/180);
   expect(Math.abs(axis.x)).toBeGreaterThanOrEqual(.16);
   expect(Number.isFinite(axis.y)).toBe(true);
   expect(Math.hypot(axis.normalX,axis.normalY)).toBeCloseTo(1);
  }
 });
});
