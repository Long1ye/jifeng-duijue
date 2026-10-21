import {describe,it,expect} from 'vitest';
import {stoneCells,snowStoneTier,snowStoneVariant,SNOW_STONE_COUNT,STONE_GRID} from '../src/render/BridgeTiles';
import {CIRCLE} from '../src/render/BridgeCircle';
describe('individual bridge stones',()=>{
 it('integrates snow into edge stones while exposing the walking spine and central seal',()=>{
  const snowy=stoneCells().filter(c=>snowStoneVariant(c)!==undefined);
  expect(snowy.length).toBeGreaterThan(100);
  expect(new Set(snowy.map(c=>snowStoneVariant(c))).size).toBe(SNOW_STONE_COUNT);
  for(const cell of stoneCells())expect(snowStoneVariant(cell)===undefined).toBe(snowStoneTier(cell)===undefined);
  for(const cell of stoneCells())if(Math.abs(cell.u)<118||cell.v===0)expect(snowStoneVariant(cell)).toBeUndefined();
 });
 it('is deterministic with small, consistently sized cells',()=>{
  expect(stoneCells()).toEqual(stoneCells());
  expect(STONE_GRID.along).toBe(13);expect(STONE_GRID.across).toBe(26);
  expect(stoneCells().length).toBeGreaterThan(900);
 });
 it('confines arena inlays to the space between outer towers',()=>{
  for(const c of stoneCells()){
   expect(c.tile).toBeGreaterThanOrEqual(0);expect(c.tile).toBeLessThan(16);
   if(c.tile>=12){expect(Math.abs(c.u)).toBeLessThan(195);expect(c.zone).toBe('lane');}
  }
 });
 it('does not repeat identical adjacent plain stones',()=>{
  const cells=stoneCells(),byKey=new Map(cells.map(c=>[`${c.col},${c.row}`,c]));
  for(const c of cells)if(c.tile<9){
   expect(byKey.get(`${c.col-1},${c.row}`)?.tile).not.toBe(c.tile);
   expect(byKey.get(`${c.col},${c.row-1}`)?.tile).not.toBe(c.tile);
  }
 });
 it('removes rectangular motifs and anchors a separate circle at lane midpoint',()=>{
  const cells=stoneCells();
  expect(cells.some(c=>c.tile>=12)).toBe(false);
  expect(CIRCLE.u).toBe(0);expect(CIRCLE.v).toBe(0);
  expect(CIRCLE.along/STONE_GRID.along).toBe(CIRCLE.across/STONE_GRID.across);
  expect(CIRCLE.across/2).toBeLessThan(112);
 });
});
