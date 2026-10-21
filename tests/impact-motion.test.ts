import {describe,it,expect} from 'vitest';
import {impactMotion} from '../src/render/ImpactMotion';
describe('pixel impact timing',()=>{
 it('fades completely at the end and before spawn',()=>{
  expect(impactMotion(-.1,0,true).alpha).toBe(0);
  expect(impactMotion(.28,0,false).alpha).toBe(0);
  expect(impactMotion(.42,0,true).alpha).toBe(0);
 });
 it('is deterministic for pause and keeps heavy hits compact',()=>{
  expect(impactMotion(.12,3,true)).toEqual(impactMotion(.12,3,true));
  for(let i=0;i<10;i++)for(const age of [0,.1,.3,.42]){
   const p=impactMotion(age,i,true);expect(Math.abs(p.x)).toBeLessThanOrEqual(25);expect(Math.abs(p.y)).toBeLessThan(24);
  }
 });
});
