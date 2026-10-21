import {describe,it,expect} from 'vitest';
import {order,rigs,poseAt} from '../assets/hero-skills/2026-10-13/yasuo/q-v26-user-eight/rig';
import {BLADE_ROOT,swordAxisX} from '../assets/hero-skills/2026-10-13/yasuo/q-v26-user-eight/sword';
describe('eight direction held Q',()=>{
 it('triples the original blade from the guard without moving or stretching the grip',()=>{
  for(const x of [-10,0,10,BLADE_ROOT])expect(swordAxisX(x)).toBe(x);
  for(const length of [1,25,100])expect(swordAxisX(BLADE_ROOT+length)-BLADE_ROOT).toBe(length*3);
 });
 it('keeps both bones fixed and wrist travel small in every view',()=>{for(const d of order){const r=rigs[d];for(let t=0;t<=480;t+=5){const p=poseAt(d,t);expect(Math.hypot(p.elbow.x-p.shoulder.x,p.elbow.y-p.shoulder.y)).toBeCloseTo(r.upper,6);expect(Math.hypot(p.wrist.x-p.elbow.x,p.wrist.y-p.elbow.y)).toBeCloseTo(r.lower,6);expect(Math.hypot(p.wrist.x-r.wrist.x,p.wrist.y-r.wrist.y)).toBeLessThanOrEqual(3.00001);}}});
 it('returns to the starting wrist position',()=>{for(const d of order)expect(poseAt(d,480).wrist).toEqual(poseAt(d,0).wrist);});
});
