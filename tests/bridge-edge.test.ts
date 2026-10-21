import {describe,it,expect,vi} from 'vitest';
import {edgeTile} from '../src/render/BridgeEdge';
import {stoneCells,drawStoneCells} from '../src/render/BridgeTiles';
import {BRIDGE} from '../src/game/Bridge';
import {halfWidth} from '../assets/map-studies/howling-abyss-v1/geometry';

describe('replacement bridge edging',()=>{
 it('confines stable damage clusters to the outermost cell row',()=>{
  const damaged=stoneCells().filter(c=>edgeTile(c.col,c.row,c.u)!==undefined);
  expect(damaged.length).toBeGreaterThan(30);expect(damaged.length).toBeLessThan(80);
  expect(new Set(damaged.map(c=>Math.sign(c.row))).size).toBe(2);
  for(const c of damaged){
   const tile=edgeTile(c.col,c.row,c.u)!;
   expect(tile).toBeGreaterThanOrEqual(0);expect(tile).toBeLessThan(16);
   expect(tile).toBe(edgeTile(c.col,c.row,c.u));
   expect(Math.abs(c.row)).toBe(Math.floor((halfWidth(BRIDGE,c.u)+13)/26));
  }
  expect(edgeTile(0,0,0)).toBeUndefined();
 });
 it('draws one texture per cell, not an edge prop above ordinary floor',()=>{
  const drawImage=vi.fn();
  const ctx={save:vi.fn(),restore:vi.fn(),transform:vi.fn(),rotate:vi.fn(),drawImage} as unknown as CanvasRenderingContext2D;
  const plain=Array.from({length:16},()=>({}) as HTMLImageElement);
  const damaged=Array.from({length:16},()=>({}) as HTMLImageElement);
  drawStoneCells(ctx,plain,damaged);
  expect(drawImage).toHaveBeenCalledTimes(stoneCells().length);
  expect(drawImage.mock.calls.some(([im])=>damaged.includes(im))).toBe(true);
  expect(drawImage.mock.calls.some(([im])=>plain.includes(im))).toBe(true);
 });
 it('removes continuous grooved trim tiles',()=>{
  expect(stoneCells().some(c=>c.tile===9||c.tile===10)).toBe(false);
 });
});
