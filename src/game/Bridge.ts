import layout from '../../assets/map-studies/howling-abyss-v1/layout.json';
import {halfWidth,outline,unproject} from '../../assets/map-studies/howling-abyss-v1/geometry';
import type {Point} from './types';

// One shared footprint for rendering, movement and the minimap.
export const BRIDGE_MAP_SCALE=2.4;
export const BRIDGE_LENGTH_SCALE=2.6;
export const BRIDGE_WORLD={width:6200,height:3400} as const;
export const BRIDGE={...layout,
 projection:{...layout.projection,origin:[BRIDGE_WORLD.width/2,BRIDGE_WORLD.height/2],
 along:layout.projection.along.map(n=>n*BRIDGE_MAP_SCALE*BRIDGE_LENGTH_SCALE),across:layout.projection.across.map(n=>n*BRIDGE_MAP_SCALE)}};
export function bridgePoint(u:number,v=0):Point {
 const p=BRIDGE.projection;
 return {x:p.origin[0]+u*p.along[0]+v*p.across[0],y:p.origin[1]+u*p.along[1]+v*p.across[1]};
}
/** Cover both bridge edges at this tower site, with a small coverage margin. */
export function bridgeTowerRange(u:number,v=0):number {
 return Math.ceil(Math.hypot(...BRIDGE.projection.across)*(halfWidth(BRIDGE,u)+Math.abs(v))+12);
}
export const BRIDGE_OUTLINE=outline(BRIDGE).map(([u,v])=>bridgePoint(u,v));
export const BRIDGE_SLOTS=([1,-1] as const).flatMap(sign=>{
 const b=layout.blue,team=sign===1?'blue':'red';
 return [
  {id:'spawn',label:'出生 / 商店',u:b.spawn[0],v:0,w:88,h:148},
  {id:'nexus',label:'基地 · 占位',u:b.nexus[0],v:0,w:47,h:47},
  ...b.nexusTowers.map(([u,v],i)=>({id:`nexus-tower-${i}`,label:'门牙塔 · 占位',u,v,w:38,h:38})),
  {id:'inhibitor',label:'水晶 · 占位',u:b.inhibitor[0],v:0,w:29,h:29},
  {id:'inner',label:'内塔 · 占位',u:b.innerTower[0],v:0,w:38,h:38},
  {id:'outer',label:'外塔',u:b.outerTower[0],v:0,w:38,h:38},
 ].map(slot=>({...slot,id:`${team}-${slot.id}`,team,u:slot.u*sign,v:slot.v*sign}));
});
export function clampBridge(point:Point,margin=8):Point {
 const [rawU,rawV]=unproject(BRIDGE,point.x,point.y);
 // Conservative inset covers the projected body's radius, including flared ends.
 const inset=margin*2.5/BRIDGE_MAP_SCALE;
 const u=Math.max(-720+inset,Math.min(720-inset,rawU));
 const width=Math.max(0,halfWidth(BRIDGE,u)-inset);
 return bridgePoint(u,Math.max(-width,Math.min(width,rawV)));
}
export function onPlayableBridge(point:Point,margin=0):boolean {
 const p=clampBridge(point,margin);
 return Math.hypot(point.x-p.x,point.y-p.y)<.001;
}
