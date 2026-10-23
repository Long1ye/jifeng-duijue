import {describe,it,expect} from 'vitest';
import {poseAt,rigs} from '../assets/hero-skills/2026-10-13/yasuo/q-v29-meowa-layered/rig';

describe.each(['sw','s'] as const)('Meowa Q %s arm',dir=>{
 it('keeps a lowered elbow, a bend reserve and connected bones through the cycle',()=>{
  for(let t=0;t<=480;t+=5){
   const p=poseAt(dir,t),r=rigs[dir];
   expect(p.elbow.y).toBeGreaterThan(p.shoulder.y+8);
   expect(p.wrist.y).toBeGreaterThan(p.elbow.y+3);
   expect(Math.abs(p.elbow.x-p.shoulder.x)).toBeLessThan(7);
   expect(Math.hypot(p.wrist.x-p.shoulder.x,p.wrist.y-p.shoulder.y)).toBeLessThan(24.5);
   expect(Math.hypot(p.elbow.x-p.shoulder.x,p.elbow.y-p.shoulder.y)).toBeCloseTo(r.upper,6);
   expect(Math.hypot(p.wrist.x-p.elbow.x,p.wrist.y-p.elbow.y)).toBeCloseTo(r.lower,6);
  }
 });
 it('returns to the same resting pose',()=>{expect(poseAt(dir,480)).toEqual(poseAt(dir,0));});
});
