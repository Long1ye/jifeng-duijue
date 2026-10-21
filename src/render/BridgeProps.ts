import {BRIDGE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import guardUrl from '../../assets/map-modules/howling-props-v1/prop-0.png?url';
import shieldUrl from '../../assets/map-modules/howling-props-v1/prop-1.png?url';
import statueUrl from '../../assets/map-modules/howling-props-v1/prop-3.png?url';

export const PROP_URLS={0:guardUrl,1:shieldUrl,3:statueUrl} as const;
export const propKey=(i:number)=>`bridge-story-prop-${i}`;
/** Anchor railing props to an actual bay so their masonry meets the rail. */
export function railSlot(target:number,side:-1|1){
 const start=-BRIDGE.bridge.halfLength+14,end=BRIDGE.bridge.halfLength-14;
 const size=side===1?135:150;
 const x=(u:number)=>bridgePoint(u,side*(halfWidth(BRIDGE,u)-2)).x;
 let last=start,best=start;
 for(let u=start+1;u<=end;u++)if(x(u)-x(last)>=size*.78){
  if(Math.abs(u-target)<Math.abs(best-target))best=u;
  last=u;
 }
 return best;
}
/** Sparse bridge-edge story clusters, kept outside the fighting lane. */
export const BRIDGE_PROPS=[
 {u:railSlot(-610,-1),side:-1,inset:2,variant:0,size:166,anchor:.86,story:'guard'},
 {u:railSlot(-75,-1),side:-1,inset:-2,variant:1,size:185,anchor:390/512,story:'battle'},
 {u:railSlot(145,-1),side:-1,inset:-5,variant:3,size:136,anchor:.86,story:'battle'},
 {u:railSlot(-155,1),side:1,inset:-5,variant:3,size:106,anchor:.86,story:'ruin'},
] as const;
/** The shield carries its own masonry; statues rest against a broken rail bay. */
export function propReplacesRail(u:number,side:number){
 return BRIDGE_PROPS.some(prop=>prop.variant===1&&prop.side===side&&Math.abs(prop.u-u)<16);
}
export function drawBridgeProps(ctx:CanvasRenderingContext2D,images:Partial<Record<number,HTMLImageElement>>){
 for(const prop of [...BRIDGE_PROPS].sort((a,b)=>bridgePoint(a.u,a.side*halfWidth(BRIDGE,a.u)).y-bridgePoint(b.u,b.side*halfWidth(BRIDGE,b.u)).y)){
  const p=bridgePoint(prop.u,prop.side*(halfWidth(BRIDGE,prop.u)+prop.inset));
  ctx.save();
  if(prop.variant===0){
   // Keep the local guard banner. The old cropped fire is superseded by the
   // paired, rail-integrated braziers further along each approach.
   const sprite=images[0]!;
   const scale=prop.size/512;
   ctx.drawImage(sprite,0,0,303,512,p.x-prop.size*.5,p.y-prop.size*prop.anchor,303*scale,prop.size);
   ctx.restore();continue;
  }
  if(prop.variant===1){
   // The shield railing was authored on the opposite diagonal. Match its
   // neighbours while keeping the ground anchor and upright posts unchanged.
   const l=bridgePoint(prop.u-1,prop.side*(halfWidth(BRIDGE,prop.u-1)+prop.inset));
   const r=bridgePoint(prop.u+1,prop.side*(halfWidth(BRIDGE,prop.u+1)+prop.inset));
   const slope=(r.y-l.y)/(r.x-l.x);
   ctx.translate(p.x,p.y);ctx.transform(-1,-slope-.35,0,1,0,0);
   ctx.drawImage(images[prop.variant]!,-prop.size*.5,-prop.size*prop.anchor,prop.size,prop.size);
   ctx.restore();continue;
  }
  if(prop.variant===3&&prop.side===-1){
   // The loose banner must fall toward the abyss on the far rail.
   ctx.translate(p.x,p.y);ctx.scale(-1,1);
   ctx.drawImage(images[prop.variant]!,-prop.size*.5,-prop.size*prop.anchor,prop.size,prop.size);
  }else ctx.drawImage(images[prop.variant]!,p.x-prop.size*.5,p.y-prop.size*prop.anchor,prop.size,prop.size);
  ctx.restore();
 }
}
