import {bridgePoint} from '../game/Bridge';
export const BRIDGEHEAD_URLS={...import.meta.glob('../../assets/map-modules/howling-fortress-v1/module-*.png',{eager:true,query:'?url',import:'default'}),...import.meta.glob('../../assets/map-modules/howling-fortress-v2/module-*.png',{eager:true,query:'?url',import:'default'}),...import.meta.glob('../../assets/map-modules/howling-gatehouse-v4/module-*.png',{eager:true,query:'?url',import:'default'})} as Record<string,string>;
export const bridgeheadKey=(i:number)=>`fortress-v4-${i}`;
export const BRIDGEHEADS=[{sign:-1,variant:0},{sign:1,variant:1}] as const;
// Visual approach only; movement and minimap continue to use the original outline.
export const FORTRESS_HALF_WIDTH=160*1.12;
export function approachOutline(sign:number){return [[714,-160],[760,-FORTRESS_HALF_WIDTH],[828,-FORTRESS_HALF_WIDTH],[828,FORTRESS_HALF_WIDTH],[760,FORTRESS_HALF_WIDTH],[714,160]].map(([u,v])=>bridgePoint(sign*u,v));}
export function fortressParts(sign:number){return [
 // Keep the blue end clear of its hero spawn, and keep the red masonry aligned
 // with the deck edge instead of covering the marked spawn footprint.
 {u:sign<0?-751:690,v:sign<0?53:102,module:5,scale:.71,anchorX:445,anchorY:800,story:'mountain-gatehouse'},
 ].sort((a,b)=>bridgePoint(a.u,a.v).y-bridgePoint(b.u,b.v).y);}
export function drawBridgeheadApproaches(ctx:CanvasRenderingContext2D,_stones:HTMLImageElement[]){
 // The bridge ends at its original playable outline. A second ground plane
 // here would read as walkable map rather than an exterior gatehouse.
 void ctx;
}
export function drawBridgeheadGates(ctx:CanvasRenderingContext2D,gates:HTMLImageElement[]){
 for(const {sign} of BRIDGEHEADS)for(const part of fortressParts(sign)){
  const p=bridgePoint(part.u,part.v),scale=part.scale;
  ctx.save();ctx.translate(p.x,p.y);
  // Keep vertical masonry vertical; align the facade axis with the deck's cross-axis.
  ctx.transform(.7*scale,.4*scale,0,.9*scale,0,0);
  // A narrow masonry-to-deck contact, baked under the gate instead of a
  // screen-space halo. It follows the same projection as the facade.
  ctx.fillStyle='#07131d';ctx.globalAlpha=.19;
  ctx.beginPath();ctx.ellipse(gates[part.module].naturalWidth/2-part.anchorX,
   gates[part.module].naturalHeight-part.anchorY-42,350,42,0,0,Math.PI*2);ctx.fill();
  ctx.globalAlpha=1;
  ctx.drawImage(gates[part.module],-part.anchorX,-part.anchorY);ctx.restore();
 }
}
