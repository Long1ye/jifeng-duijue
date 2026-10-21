import {describe,it,expect} from 'vitest';
import {pavingPatches,PAVING_BANDS} from '../src/render/BridgePaving';
describe('bridge paving layout',()=>{
 it('is deterministic and confines the worn route to the center',()=>{
  expect(pavingPatches()).toEqual(pavingPatches());
  for(const p of pavingPatches()){
   expect(Math.abs(p.v)).toBeLessThanOrEqual(6);
   expect(Math.abs(p.u)).toBeLessThanOrEqual(630);
   expect([0,3]).toContain(p.variant);
  }
 });
 it('places balanced structural bands without filling the central duel area',()=>{
  expect(PAVING_BANDS.every(u=>PAVING_BANDS.includes(-u as typeof PAVING_BANDS[number]))).toBe(true);
  expect(PAVING_BANDS.every(u=>Math.abs(u)>100)).toBe(true);
 });
});
