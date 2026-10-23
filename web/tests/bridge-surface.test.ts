import {describe,it,expect} from 'vitest';
import {edgeSnowPatch,edgeChips,BRIDGE_SURFACE} from '../src/render/BridgeSurface';
describe('bridge surface decoration',()=>{
 it('keeps damage shallow and stable along both outer edges',()=>{
  expect(edgeChips()).toEqual(edgeChips());
  expect(new Set(edgeChips().map(c=>c.side)).size).toBe(2);
  for(const c of edgeChips()){expect(c.depth).toBeLessThanOrEqual(8);expect(c.width).toBeLessThanOrEqual(6);}
 });
 it('repeats exactly on reset without changing gameplay geometry',()=>{
  expect(edgeSnowPatch(10,-1)).toEqual(edgeSnowPatch(10,-1));
  expect(edgeSnowPatch(10,-1)).not.toEqual(edgeSnowPatch(10,1));
 });
 it('keeps snow variants within their atlas and a narrow edge band',()=>{
  for(let i=0;i<36;i++)for(const side of [-1,1]){
   const p=edgeSnowPatch(i,side);
   expect(p.column).toBeGreaterThanOrEqual(0);expect(p.column).toBeLessThan(4);
   expect([1,2]).toContain(p.row);
   expect(p.inset).toBeGreaterThanOrEqual(14);expect(p.inset).toBeLessThanOrEqual(36);
   expect(p.width).toBeGreaterThanOrEqual(88);expect(p.width).toBeLessThanOrEqual(152);
   expect(p.alpha).toBeLessThanOrEqual(1);
  }
 });
 it('uses restrained surface contrast',()=>{
  expect(BRIDGE_SURFACE.stoneVeil).toBeLessThan(.2);
  expect(BRIDGE_SURFACE.crackAlpha).toBeLessThan(.48);
 });
});
