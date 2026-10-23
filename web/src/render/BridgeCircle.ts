import {BRIDGE,bridgePoint} from '../game/Bridge';
export const CIRCLE_URLS=import.meta.glob('../../assets/map-modules/howling-circle-v1/stone-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const circleKey=(i:number)=>`bridge-circle-${i.toString().padStart(2,'0')}`;
// Equal physical stone-cell units on each axis, projected by the bridge itself.
export const CIRCLE={u:0,v:0,along:91,across:182,parts:16} as const;
export function drawBridgeCircle(ctx:CanvasRenderingContext2D,parts:HTMLImageElement[]){
 const a=BRIDGE.projection.along,b=BRIDGE.projection.across,p=bridgePoint(CIRCLE.u,CIRCLE.v);
 ctx.save();ctx.transform(a[0]*CIRCLE.along,a[1]*CIRCLE.along,b[0]*CIRCLE.across,b[1]*CIRCLE.across,p.x,p.y);
 // Exact shared boundaries avoid dark double-alpha seams between transparent pieces.
 for(let i=0;i<CIRCLE.parts;i++)ctx.drawImage(parts[i],i%4/4-.5,Math.floor(i/4)/4-.5,.25,.25);
 ctx.restore();
}
