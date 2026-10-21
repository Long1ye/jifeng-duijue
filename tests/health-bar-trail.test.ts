import {describe,it,expect} from 'vitest';
import {HealthBarTrail} from '../src/render/HealthBarTrail';
describe('health bar damage trail',()=>{
 it('holds recent damage briefly, then catches up without changing HP',()=>{
  const bar=new HealthBarTrail();expect(bar.sample(1,100,100,0)).toBe(1);
  expect(bar.sample(1,60,100,1)).toBe(1);expect(bar.sample(1,60,100,1.1)).toBe(1);
  const trail=bar.sample(1,60,100,1.3);expect(trail).toBeGreaterThan(.6);expect(trail).toBeLessThan(1);
  expect(bar.sample(1,60,100,2)).toBe(.6);
 });
 it('does not drain during pause, and resets for healing and restarted matches',()=>{
  const bar=new HealthBarTrail();bar.sample(1,100,100,0);bar.sample(1,40,100,1);
  expect(bar.sample(1,40,100,1)).toBe(1);expect(bar.sample(1,90,100,1.1)).toBe(.9);
  expect(bar.sample(1,40,100,0)).toBe(.4);bar.reset();expect(bar.sample(1,20,100,1)).toBe(.2);
 });
 it('keeps units independent and clears removed units',()=>{
  const bar=new HealthBarTrail();bar.sample(1,100,100,0);bar.sample(2,90,100,0);
  expect(bar.sample(1,40,100,1)).toBe(1);expect(bar.sample(2,90,100,1)).toBe(.9);
  bar.retain(new Set([2]));expect(bar.sample(1,10,100,1)).toBe(.1);
 });
});
