import {describe,it,expect} from 'vitest';
import {poseAt,UPPER,LOWER} from '../assets/hero-skills/2026-10-13/yasuo/q-v18-crouched-layered-se/rig';
describe('crouched Q layered rig',()=>{
 it('keeps both arms connected at fixed lengths',()=>{
  for(let t=0;t<=480;t+=5){const p=poseAt(t);
   for(const [s,a] of [[p.shoulder,p],[p.support,p.supportArm]] as const){
    expect(Math.hypot(a.elbow.x-s.x,a.elbow.y-s.y)).toBeCloseTo(UPPER);
    expect(Math.hypot(a.wrist.x-a.elbow.x,a.wrist.y-a.elbow.y)).toBeCloseTo(LOWER);
   }
  }
 });
 it('extends southeast then returns to the starting pose',()=>{
  const a=poseAt(0),b=poseAt(210),z=poseAt(480);
  expect(b.wrist.x-a.wrist.x).toBeGreaterThan(12);
  expect(b.wrist.y-a.wrist.y).toBeGreaterThan(10);
  expect(z.wrist).toEqual(a.wrist);expect(z.shoulder).toEqual(a.shoulder);
 });
});
