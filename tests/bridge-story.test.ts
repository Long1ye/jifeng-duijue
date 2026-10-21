import {describe,it,expect} from 'vitest';
import {storyMarks} from '../src/render/BridgeStory';
describe('bridge environmental story',()=>{
 it('is deterministic and contains repairs and four damage types',()=>{
  const marks=storyMarks();expect(marks).toEqual(storyMarks());
  expect(new Set(marks.filter(m=>m.kind==='damage').map(m=>m.variant)).size).toBe(4);
 });
 it('keeps fountain and central emblem clear, with cell-sized repairs',()=>{
  for(const m of storyMarks()){
   expect(Math.abs(m.u)).toBeLessThan(620);
   expect(Math.abs(m.u)).toBeGreaterThan(50);
   if(m.kind==='repair'){expect(m.width).toBe(13);expect(m.height).toBe(26);expect(Math.abs(m.u%13)).toBe(0);}
  }
 });
 it('places tower scars on enemy-facing approaches for both teams',()=>{
  for(const side of [-1,1])for(const u of [195,330]){
   expect(storyMarks().some(m=>m.kind==='damage'&&m.variant===1&&m.u===side*(u-30))).toBe(true);
  }
 });
});
