import {BRIDGE,bridgePoint} from '../game/Bridge';
import {halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import brazierUrl from '../../assets/map-modules/howling-rail-brazier-v1/brazier.png?url';
import fallenUrl from '../../assets/map-modules/howling-lights-v1/fallen.png?url';
import {railSlot} from './BridgeProps';

export const LIGHT_URLS={brazier:brazierUrl,fallen:fallenUrl} as const;
export type BridgeLightKind=keyof typeof LIGHT_URLS;
export const lightKey=(kind:BridgeLightKind)=>`bridge-light-${kind}`;

/** One complete rail bay per fire; pair the upper and lower edges at each station. */
function pairedBraziers(target:number){
 return ([-1,1] as const).map(side=>({
  u:railSlot(target,side),side,inset:-2,kind:'brazier' as const,
  // This source has a wider opaque footprint than rail-*.png. Match the
  // visible masonry width, not the transparent canvas width, at each seam.
  width:side===-1?133:120,lit:true as const,station:Math.abs(target),
 }));
}
export const BRIDGE_LIGHTS=[
 ...pairedBraziers(-540),...pairedBraziers(-405),
 // Sit just outside the outer brush tips, so foliage does not hide the flame.
 ...pairedBraziers(-330),...pairedBraziers(330),
 // Mid-lane fire bays frame the three central brush groups without replacing
 // the shield or fallen-statue story bays.
 ...pairedBraziers(-20),...pairedBraziers(70),
 ...pairedBraziers(405),...pairedBraziers(540),
 {u:25,side:-1,inset:-32,kind:'fallen',width:96,lit:false},
] as const;

export function bridgeLightPoint(light:typeof BRIDGE_LIGHTS[number]){
 return bridgePoint(light.u,light.side*(halfWidth(BRIDGE,light.u)+light.inset));
}

/** Keep foreground fire exactly registered with the brazier baked into the rail. */
export function brazierShear(light:typeof BRIDGE_LIGHTS[number]){
 const l=bridgePoint(light.u-1,light.side*(halfWidth(BRIDGE,light.u-1)+light.inset));
 const r=bridgePoint(light.u+1,light.side*(halfWidth(BRIDGE,light.u+1)+light.inset));
 return -(r.y-l.y)/(r.x-l.x)-.35;
}

export function drawBridgeLights(ctx:CanvasRenderingContext2D,images:Record<BridgeLightKind,HTMLImageElement>){
 for(const light of [...BRIDGE_LIGHTS].sort((a,b)=>bridgeLightPoint(a).y-bridgeLightPoint(b).y)){
  const p=bridgeLightPoint(light),sprite=images[light.kind];
  const height=light.width*sprite.naturalHeight/sprite.naturalWidth;
  if(light.kind==='brazier'){
   // The brazier is one complete rail bay, with the same projection and scale
   // as the neighboring stone modules. Its old bay is omitted in BridgeRails.
   const scale=light.width/sprite.naturalWidth;
   ctx.save();ctx.translate(p.x,p.y);ctx.transform(-scale,brazierShear(light)*scale,0,scale,0,0);
   ctx.drawImage(sprite,-sprite.naturalWidth/2,-sprite.naturalHeight*.78);
   ctx.restore();continue;
  }
  ctx.drawImage(sprite,p.x-light.width/2,p.y-height,light.width,height);
 }
}
