import {describe,it,expect} from 'vitest';
import {BRIDGE_PROPS} from '../src/render/BridgeProps';
import {railZone} from '../src/render/BridgeRails';
describe('bridge narrative scenery',()=>{
 it('keeps a sparse set of guard and battle clusters outside the lane',()=>{
  expect(BRIDGE_PROPS.length).toBe(4);
  for(const theme of ['guard','battle'])expect(BRIDGE_PROPS.some(p=>p.story===theme)).toBe(true);
  for(const p of BRIDGE_PROPS){
   expect(p.inset).toBeGreaterThanOrEqual(-12);
   expect(p.inset).toBeLessThanOrEqual(8);
   expect(p.size).toBeLessThanOrEqual(185);
   expect(p.variant).toBeGreaterThanOrEqual(0);expect(p.variant).toBeLessThan(4);
   expect(Math.abs(p.u)).toBeLessThan(650);
  }
 });
 it('places guard and fallen statues along the battle-damage gradient',()=>{
  const guard=BRIDGE_PROPS.find(p=>p.story==='guard')!;
  expect(railZone(guard.u)).toBe('home');
  for(const prop of BRIDGE_PROPS.filter(p=>p.variant===3))expect(railZone(prop.u)).toBe('battle');
  expect(BRIDGE_PROPS.map(p=>p.variant)).not.toContain(2);
 });
});
