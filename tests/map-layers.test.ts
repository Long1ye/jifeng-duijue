import {describe,it,expect} from 'vitest';
import layout from '../assets/map-layers/forest-v1/layers.json';
import {MAP_REGIONS,insidePolygon,layerPixel,layerMotion} from '../src/render/MapLayerLayout';
import {mapLayerFrame,mapFrameAt,MAP_FRAME_COUNT,MAP_LAYER_PADDING} from '../src/render/MapLayerFrames';
describe('independent forest map layers',()=>{
 it('keeps all extracted parts in original map coordinates',()=>{
  expect([layout.width,layout.height]).toEqual([511,327]);expect(layout.layers).toHaveLength(14);
  for(const l of layout.layers){expect(l.x).toBeGreaterThanOrEqual(0);expect(l.y).toBeGreaterThanOrEqual(0);expect(l.x+l.width).toBeLessThanOrEqual(511);expect(l.y+l.height).toBeLessThanOrEqual(327);expect(l.pixelCount).toBeGreaterThan(0);}
  expect(new Set(layout.layers.map(l=>l.id)).size).toBe(layout.layers.length);
 });
 it('does not classify warm ground as water or fire',()=>{
  expect(layerPixel('water',40,100,110)).toBe(true);expect(layerPixel('water',140,130,90)).toBe(false);
  expect(layerPixel('fire',255,150,20)).toBe(true);expect(layerPixel('fire',100,120,50)).toBe(false);
  expect(insidePolygon(250,180,MAP_REGIONS[0].polygon)).toBe(false);
 });
 it('is deterministic and loops without changing gameplay coordinates',()=>{
  for(const kind of ['water','grass','canopy','fire'] as const){expect(mapFrameAt(kind,2,3)).toBe(mapFrameAt(kind,2,3));expect(mapFrameAt(kind,1e4,4)).toBeLessThan(MAP_FRAME_COUNT);expect(layerMotion(kind,2,3).scaleY).toBeGreaterThan(.8);}
 });
 it('retains leaf pixels and transparent margins throughout the animation',()=>{
  const source=new Uint8ClampedArray(4*4*4);for(let i=0;i<16;i++)source.set([30,90,50,255],i*4);
  const w=4+MAP_LAYER_PADDING*2;
  for(let f=0;f<MAP_FRAME_COUNT;f++){const data=mapLayerFrame(source,4,4,'grass',f);expect([...data].filter((_,i)=>i%4===3&&data[i]===255)).toHaveLength(16);expect(data[3]).toBe(0);expect(data[((4+MAP_LAYER_PADDING-1)*w+MAP_LAYER_PADDING)*4+3]).toBe(255);}
 });
});
