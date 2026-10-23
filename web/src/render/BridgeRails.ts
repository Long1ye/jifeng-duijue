import {BRIDGE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {BRIDGE_PROPS,propReplacesRail} from './BridgeProps';
import {BRIDGE_LIGHTS} from './BridgeLights';
export const RAIL_URLS=import.meta.glob('../../assets/map-modules/howling-rails-v1/rail-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const railKey=(i:number)=>`bridge-ruined-rail-${i}`;
export function railZone(u:number){
 const distance=Math.abs(u);
 return distance>=550?'home':distance>=330?'approach':distance>=195?'frontline':'battle';
}
export function railVariant(u:number,index:number,side:number){
 // The toppled stone heads need a continuous rubble footing, not an empty bay.
 if(BRIDGE_PROPS.some(prop=>prop.variant===3&&prop.side===side&&Math.abs(prop.u-u)<16))return 2;
 const pools={home:[0,0,0,3,0],approach:[0,3,0,2,3],frontline:[3,2,1,2],battle:[1,2,1,2,1]};
 const pool=pools[railZone(u)];
 return pool[(index+(side===1?2:0))%pool.length];
}
/** Continuous long edges, with destruction expressed inside the modules themselves. */
export function bridgeRails(){
 const rails:{u:number;side:number;variant:number;size:number;zone:ReturnType<typeof railZone>}[]=[];
 for(const side of [-1,1]){
  const size=side===1?135:150;
  const start=-BRIDGE.bridge.halfLength+14,end=BRIDGE.bridge.halfLength-14;
  const x=(u:number)=>bridgePoint(u,side*(halfWidth(BRIDGE,u)-2)).x;
  let last=start,index=0;
  const add=(u:number)=>{
   let variant=railVariant(u,index++,side);
   // The shield masonry and fire bays replace one rail module each.
   if(propReplacesRail(u,side))return;
   if(BRIDGE_LIGHTS.some(light=>light.kind==='brazier'&&light.side===side&&Math.abs(light.u-u)<16))return;
   rails.push({u,side,variant,size,zone:railZone(u)});
  };
  add(start);
  // Match visible sprite width, also through the widened base transitions.
  for(let u=start+1;u<=end;u++)if(x(u)-x(last)>=size*.78){add(u);last=u;}
  if(x(end)-x(last)>size*.4)add(end);
 }
 return rails;
}
export function drawBridgeRails(ctx:CanvasRenderingContext2D,images:HTMLImageElement[]){
 for(const rail of bridgeRails())drawBridgeRail(ctx,rail,images[rail.variant]);
}
/** Same transform for the baked floor and the foreground interaction slice. */
export function drawBridgeRail(ctx:CanvasRenderingContext2D,rail:ReturnType<typeof bridgeRails>[number],image:HTMLImageElement,offset={x:0,y:0}){
  const p=bridgePoint(rail.u,rail.side*(halfWidth(BRIDGE,rail.u)-2));
  ctx.save();
  const l=bridgePoint(rail.u-1,rail.side*(halfWidth(BRIDGE,rail.u-1)-2));
  const r=bridgePoint(rail.u+1,rail.side*(halfWidth(BRIDGE,rail.u+1)-2));
  const slope=(r.y-l.y)/(r.x-l.x),scale=rail.size/512;
  // Generated rails face the opposite diagonal. Mirror in the renderer and
  // align their baseline, preserving vertical posts rather than rotating them.
  ctx.translate(p.x+offset.x,p.y+offset.y);ctx.transform(-scale,(-slope-.35)*scale,0,scale,0,0);
  const foot=[380,390,330,345][rail.variant];
  ctx.drawImage(image,-256,-foot);
  ctx.restore();
}
