import {it,expect} from 'vitest';
import c from '../assets/map-studies/howling-abyss-v1/layout.json';
import {onBridge,project,unproject,outline} from '../assets/map-studies/howling-abyss-v1/geometry';
it('keeps a continuous symmetric bridge and expanded bases',()=>{for(let u=-700;u<=700;u+=10){expect(onBridge(c,u,0)).toBe(true);expect(onBridge(c,u,110)).toBe(onBridge(c,-u,-110));}expect(onBridge(c,0,140)).toBe(false);expect(onBridge(c,600,140)).toBe(true);expect(onBridge(c,740,0)).toBe(false);});
it('projects and inversely maps editable coordinates',()=>{const q=unproject(c,...project(c,120,40));expect(Math.abs(q[0]-120)).toBeLessThan(2);expect(Math.abs(q[1]-40)).toBeLessThan(2);expect(outline(c)).toHaveLength(12);});
it('places five brush sites along the bridge edges without covering the lane',()=>{
 expect(c.brush).toHaveLength(5);
 expect(c.brush.filter(b=>b.v<0)).toHaveLength(4);
 expect(c.brush.filter(b=>b.v>0)).toHaveLength(1);
 for(const b of c.brush){
  expect(Math.abs(b.u)).toBeLessThan(330);
  for(const du of [-b.length/2,b.length/2])for(const dv of [-b.width/2,b.width/2])
   expect(onBridge(c,b.u+du,b.v+dv)).toBe(true);
 }
});
