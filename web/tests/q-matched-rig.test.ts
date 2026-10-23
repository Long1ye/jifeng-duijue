import {describe,it,expect} from 'vitest';
import {poseAt,UPPER,LOWER} from '../assets/hero-skills/2026-10-13/yasuo/q-v19-matched-parts-se/rig';
describe('matched Q arms',()=>{
 it('keeps shorter limbs connected through the entire cast',()=>{
  for(let t=0;t<=480;t+=5){const p=poseAt(t);
   for(const [s,a] of [[p.shoulder,p],[p.support,p.supportArm]] as const){
    expect(Math.hypot(a.elbow.x-s.x,a.elbow.y-s.y)).toBeCloseTo(UPPER);
    expect(Math.hypot(a.wrist.x-a.elbow.x,a.wrist.y-a.elbow.y)).toBeCloseTo(LOWER);
   }
  }
 });
 it('recovers the original wrist position',()=>expect(poseAt(480).wrist).toEqual(poseAt(0).wrist));
 it('thrusts outside the body and separates the free hand',()=>{
  for(let t=0;t<=480;t+=5){const p=poseAt(t);
   expect(p.wrist.x).toBeGreaterThan(70);
   expect(p.supportArm.wrist.x).toBeLessThan(26);
   expect(p.wrist.x-p.supportArm.wrist.x).toBeGreaterThan(45);
  }
  expect(poseAt(210).wrist.x).toBeGreaterThan(84);
 });
});
