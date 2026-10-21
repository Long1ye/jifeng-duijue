import {BRIDGE_SLOTS,bridgePoint} from './Bridge';
import type {Point} from './types';

/** Ground footprints, not the full height of the isometric artwork. */
export const BRIDGE_FOOTPRINTS=BRIDGE_SLOTS.filter(slot=>slot.id!=='blue-spawn'&&slot.id!=='red-spawn').map(slot=>{
  const p=bridgePoint(slot.u,slot.v);
  const nexus=slot.id.endsWith('nexus'),inhibitor=slot.id.endsWith('inhibitor');
  // Match the current painted plinths, including their front steps. The old
  // small, rear-shifted ellipses let feet enter the visible stone foundations.
  return {id:slot.id,x:p.x,y:p.y,
    rx:nexus?124:inhibitor?47:68,ry:nexus?84:inhibitor?40:64};
});

/** Melee attacks reach the same foundation that blocks the approach. */
export function bridgeFoundationRadius(target:Point,from:Point):number|null {
  const site=BRIDGE_FOOTPRINTS.find(site=>Math.hypot(site.x-target.x,site.y-target.y)<1);
  if(!site)return null;
  const dx=from.x-target.x,dy=from.y-target.y,length=Math.hypot(dx,dy);
  return length>0?length/Math.hypot(dx/site.rx,dy/site.ry):Math.min(site.rx,site.ry);
}

export function onBridgeFootprint(point:Point,radius=0):boolean {
  return BRIDGE_FOOTPRINTS.some(site=>Math.hypot((point.x-site.x)/(site.rx+radius),(point.y-site.y)/(site.ry+radius))<1);
}

/** Slide mobile feet out of stone foundations; static building entities remain at their anchors. */
export function clearBridgeFootprints(point:Point,radius:number,seed=1):Point {
  let result={...point};
  for(let pass=0;pass<6;pass++){
    let moved=false;
    for(const site of BRIDGE_FOOTPRINTS){
      const rx=site.rx+radius,ry=site.ry+radius;
      let dx=(result.x-site.x)/rx,dy=(result.y-site.y)/ry;
      let length=Math.hypot(dx,dy);
      if(length>=1)continue;
      if(length<.0001){dx=seed%2?1:-1;dy=.1;length=Math.hypot(dx,dy);}
      result={x:site.x+dx/length*rx*1.001,y:site.y+dy/length*ry*1.001};
      moved=true;
    }
    if(!moved)break;
  }
  return result;
}

/** A short local detour keeps a straight lane order from driving units through a plinth. */
export function bridgeDetour(start:Point,target:Point,radius:number,seed=1):Point {
  let nearest=Infinity,waypoint:Point|null=null;
  for(const site of BRIDGE_FOOTPRINTS){
    const rx=site.rx+radius+3,ry=site.ry+radius+3;
    const sx=(start.x-site.x)/rx,sy=(start.y-site.y)/ry;
    const tx=(target.x-site.x)/rx,ty=(target.y-site.y)/ry;
    const vx=tx-sx,vy=ty-sy,length2=vx*vx+vy*vy;
    if(length2<.0001)continue;
    const t=Math.max(0,Math.min(1,-(sx*vx+sy*vy)/length2));
    if(t<=0||t>=1||Math.hypot(sx+vx*t,sy+vy*t)>=1.04)continue;
    const approach=Math.hypot(start.x-site.x,start.y-site.y);
    if(approach>=nearest)continue;
    const length=Math.hypot(vx,vy),dx=vx/length,dy=vy/length;
    const sideValue=sx*(-dy)+sy*dx;
    const side=Math.abs(sideValue)>.08?Math.sign(sideValue):(seed%2?1:-1);
    waypoint={x:site.x+(-dy*side*1.22+dx*1.16)*rx,y:site.y+(dx*side*1.22+dy*1.16)*ry};
    nearest=approach;
  }
  return waypoint??target;
}
