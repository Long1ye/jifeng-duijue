import {describe,it,expect} from 'vitest';
import {poseAt,DURATION} from '../assets/hero-skills/2026-10-13/yasuo/q-v15-source-layered-se/rig';
describe('source-pixel Q rig',()=>{
  it('preserves limb lengths throughout the cast',()=>{
    for(let t=0;t<=DURATION;t+=5){
      const {shoulder:s,elbow:e,wrist:w}=poseAt(t);
      expect(Math.hypot(e.x-s.x,e.y-s.y)).toBeCloseTo(Math.hypot(3,11));
      expect(Math.hypot(w.x-e.x,w.y-e.y)).toBeCloseTo(Math.hypot(1,10));
    }
  });
  it('returns exactly to the native source joints',()=>{
    for(const t of [0,DURATION]){
      const p=poseAt(t);
      expect(p.wrist.x).toBeCloseTo(16);expect(p.wrist.y).toBeCloseTo(72);
      expect(p.elbow.x).toBeCloseTo(17);expect(p.elbow.y).toBeCloseTo(62);
    }
  });
});
