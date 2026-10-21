import {describe,it,expect} from 'vitest';
import {passiveShieldPose} from '../src/render/PassiveShieldPose';
describe('passive shield animation',()=>{
 it('appears only after the real trigger, grows, and disappears at shield expiry',()=>{
  expect(passiveShieldPose(.9,1,2).active).toBe(false);
  expect(passiveShieldPose(1,1,2).scale).toBe(.84);
  expect(passiveShieldPose(1.2,1,2).scale).toBe(1);
  expect(passiveShieldPose(1.95,1,2).alpha).toBeLessThan(.4);
  expect(passiveShieldPose(2,1,2).active).toBe(false);
 });
 it('releases immediately when broken instead of displaying a false active shield',()=>{
  expect(passiveShieldPose(1.4,1,2,1.4).frame).toBe(6);
  expect(passiveShieldPose(1.5,1,2,1.4).alpha).toBeLessThan(.4);
  expect(passiveShieldPose(1.55,1,2,1.4).active).toBe(false);
 });
 it('keeps the one-second sequence inside its eight-frame atlas',()=>{
  for(let t=0;t<1;t+=.01){const pose=passiveShieldPose(t,0,1);expect(pose.frame).toBeGreaterThanOrEqual(0);expect(pose.frame).toBeLessThan(8);}
 });
});
