import {describe,it,expect} from 'vitest';
import {bridgeRails,railZone} from '../src/render/BridgeRails';
import {BRIDGE_PROPS} from '../src/render/BridgeProps';
import {BRIDGE_LIGHTS} from '../src/render/BridgeLights';
describe('battle-scarred bridge rails',()=>{
 it('mixes four rail variants on both sides, keeping only one shield scene',()=>{
  const rails=bridgeRails();
  expect(rails).toEqual(bridgeRails());
  expect(rails.length).toBeGreaterThan(70);expect(rails.length).toBeLessThan(115);
  expect(rails.length+BRIDGE_LIGHTS.filter(light=>light.kind==='brazier').length).toBeGreaterThan(90);
  expect(new Set(rails.map(r=>r.variant)).size).toBe(4);
  expect(new Set(rails.map(r=>r.side)).size).toBe(2);
  expect(BRIDGE_PROPS.filter(p=>p.variant===1)).toHaveLength(1);
 });
 it('covers both edges, supports statues with broken masonry, and replaces fire bays',()=>{
  for(const side of [-1,1]){
   const row=bridgeRails().filter(r=>r.side===side);
   expect(row[0].u).toBeLessThan(-700);expect(row.at(-1)!.u).toBeGreaterThan(680);
   for(let i=1;i<row.length;i++)expect(row[i].u-row[i-1].u).toBeLessThan(80);
  }
  for(const p of BRIDGE_PROPS.filter(p=>p.variant===1))
   for(const r of bridgeRails().filter(r=>r.side===p.side))expect(Math.abs(r.u-p.u)).toBeGreaterThanOrEqual(16);
  for(const p of BRIDGE_PROPS.filter(p=>p.variant===3)){
   const support=bridgeRails().find(r=>r.side===p.side&&Math.abs(r.u-p.u)<16);
   expect(support?.variant).toBe(2);
  }
  for(const r of bridgeRails())for(const light of BRIDGE_LIGHTS)if(light.kind==='brazier'&&r.side===light.side)expect(Math.abs(r.u-light.u)).toBeGreaterThanOrEqual(16);
 });
 it('progresses from maintained home railings to shattered central sections',()=>{
  const rails=bridgeRails(),home=rails.filter(r=>r.zone==='home'),battle=rails.filter(r=>r.zone==='battle');
  expect(home.filter(r=>r.variant===0).length/home.length).toBeGreaterThan(.65);
  expect(battle.every(r=>r.variant===1||r.variant===2)).toBe(true);
  for(const u of [0,180,300,500,650])expect(railZone(u)).toBe(railZone(-u));
 });
});
