import {describe,it,expect} from 'vitest';
import {compactPoseAt,armLengths} from '../assets/hero-skills/2026-10-13/yasuo/q-v27-upright-se/motion';
describe('compact Q arm gesture',()=>{
 it('keeps fixed bone lengths, tucked reach and restrained wrist rotation',()=>{
  for(let t=0;t<=480;t++){
   const p=compactPoseAt(t);
   expect(Math.hypot(p.elbow.x-p.shoulder.x,p.elbow.y-p.shoulder.y)).toBeCloseTo(armLengths.upper,6);
   expect(Math.hypot(p.wrist.x-p.elbow.x,p.wrist.y-p.elbow.y)).toBeCloseTo(armLengths.lower,6);
   expect(p.wrist.x).toBeLessThanOrEqual(88.5);
   expect(Math.hypot(p.wrist.x-86,p.wrist.y-84)).toBeLessThan(2.6);
   expect(Math.abs(p.swordAngle-Math.PI/4)).toBeLessThanOrEqual(2.01*Math.PI/180);
  }
 });
 it('returns to the same grip and body pose without a loop jump',()=>{
  expect(compactPoseAt(480)).toEqual(compactPoseAt(0));
 });
});
