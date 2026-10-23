import {describe,it,expect} from 'vitest';
import {terrainNormals} from '../src/render/TerrainNormals';
const pixels=(values:number[])=>new Uint8ClampedArray(values.flatMap(v=>[v,v,v,255]));
describe('terrain relief normals',()=>{
 it('keeps flat surfaces neutral',()=>{
  const out=terrainNormals(pixels(Array(9).fill(120)),3,3);
  expect([...out.slice(16,20)]).toEqual([128,128,255,255]);
 });
 it('tilts towards rising edges with restrained strength',()=>{
  const out=terrainNormals(pixels([0,128,255,0,128,255,0,128,255]),3,3);
  expect(out[16]).toBeLessThan(128);expect(out[16]).toBeGreaterThan(90);expect(out[18]).toBeGreaterThan(240);
 });
 it('does not raise transparent borders',()=>{
  const input=pixels([0,128,255,0,128,255,0,128,255]);input[15]=0;
  expect([...terrainNormals(input,3,3).slice(16,20)]).toEqual([128,128,255,255]);
 });
 it('rejects malformed buffers',()=>expect(()=>terrainNormals(pixels([0]),3,3)).toThrow());
});
