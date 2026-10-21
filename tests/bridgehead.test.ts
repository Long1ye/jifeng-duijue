import {describe,it,expect} from 'vitest';
import {approachOutline,BRIDGEHEADS,fortressParts,FORTRESS_HALF_WIDTH,drawBridgeheadApproaches} from '../src/render/Bridgehead';
import {BRIDGE,clampBridge,bridgePoint} from '../src/game/Bridge';
import {unproject} from '../assets/map-studies/howling-abyss-v1/geometry';
describe('bridgehead integration',()=>{
 it('never uses bridge stone sprites for the exterior district',()=>{
  let draws=0;
  const ctx=new Proxy({},{get:(_target,key)=>key==='drawImage'?()=>{draws++;}:()=>{},set:()=>true}) as CanvasRenderingContext2D;
  drawBridgeheadApproaches(ctx,[{} as HTMLImageElement]);expect(draws).toBe(0);
 });
 it('connects both approaches through the existing end line',()=>{
  for(const {sign} of BRIDGEHEADS){
   const points=approachOutline(sign).map(p=>unproject(BRIDGE,p.x,p.y));
   expect(Math.min(...points.map(([u])=>Math.abs(u)))).toBeCloseTo(714);
   expect(Math.max(...points.map(([u])=>Math.abs(u)))).toBeCloseTo(828);
   expect(points.every(([u])=>Math.sign(u)===sign)).toBe(true);
  }
 });
 it('retains the approved wide silhouette and all story modules',()=>{
  expect(FORTRESS_HALF_WIDTH/160).toBeCloseTo(1.12);
  for(const {sign} of BRIDGEHEADS){
   const parts=fortressParts(sign);
   expect(parts).toHaveLength(1);
   expect(parts[0].module).toBe(5);
   expect(parts.every(p=>Number.isFinite(p.u)&&Number.isFinite(p.v))).toBe(true);
  }
 });
 it('does not extend the walkable map',()=>{
  for(const {sign} of BRIDGEHEADS){
   const end=clampBridge(bridgePoint(sign*768),0);
   expect(unproject(BRIDGE,end.x,end.y)[0]).toBeCloseTo(sign*720);
  }
 });
});
