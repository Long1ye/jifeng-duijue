import {describe,expect,it} from 'vitest';
import {BRIDGE_LIGHTS,LIGHT_URLS,bridgeLightPoint} from '../src/render/BridgeLights';
import {BRIDGE} from '../src/game/Bridge';
import {halfWidth} from '../assets/map-studies/howling-abyss-v1/geometry';

describe('bridge story lights',()=>{
 it('replaces beacon towers with rail-integrated fire and keeps the fallen fixture at mid',()=>{
  expect(BRIDGE_LIGHTS).toHaveLength(17);
  for(const light of BRIDGE_LIGHTS){
   expect(LIGHT_URLS[light.kind]).toBeTruthy();
   if(light.kind==='brazier')expect(Math.abs(light.side*(halfWidth(BRIDGE,light.u)+light.inset))).toBeGreaterThan(90);
   expect(Number.isFinite(bridgeLightPoint(light).x)).toBe(true);
   if(light.kind==='fallen'){
    expect(Math.abs(light.u)).toBeLessThan(100);
    expect(light.inset).toBeLessThanOrEqual(-30);
    expect(Math.abs(light.side*(halfWidth(BRIDGE,light.u)+light.inset))).toBeLessThan(90);
    expect(light.lit).toBe(false);
   }
  }
 });
 it('pairs braziers at the homes, approaches, and grass-side rail bays',()=>{
  const braziers=BRIDGE_LIGHTS.filter(light=>light.kind==='brazier');
  expect(braziers).toHaveLength(16);
  for(const side of [-1,1])expect(new Set(braziers.filter(light=>light.side===side).map(light=>light.u)).size).toBe(8);
  for(const target of [-540,-405,-330,-20,70,330,405,540]){
   const station=Math.abs(target),sign=Math.sign(target);
   const pair=braziers.filter(light=>light.station===station&&Math.sign(light.u)===sign);
   expect(pair.map(light=>light.side).sort()).toEqual([-1,1]);
   expect(Math.abs(pair[0].u-pair[1].u)).toBeLessThan(20);
  }
  for(const brazier of braziers){
   expect(brazier.inset).toBe(-2);
   expect(brazier.width).toBe(brazier.side===-1?133:120);
  }
 });
});
