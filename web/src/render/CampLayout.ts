import {bridgePoint} from '../game/Bridge';
import clips from '../../assets/units/minions-animated-v1/runtime/clips.json';
import rest from '../../assets/units/bridge-camp-v1/rest.json';
import restUrl from '../../assets/units/bridge-camp-v1/rest.png?url';
export const CAMP_URLS={...import.meta.glob('../../assets/units/minions-animated-v1/runtime/*-walk.png',{eager:true,query:'?url',import:'default'}),'rest.png':restUrl} as Record<string,string>;
export function campActors(sign:number,time:number){
 return Array.from({length:10},(_,i)=>{
  const role=i<4?'outgoing':i<7?'returning':'rest';
  const phase=(time/(role==='returning'?24:17)+i*.217)%1;
  const u=role==='rest'?778+(i-7)*7:role==='outgoing'?798-phase*57:741+phase*57;
  return {u:u*sign,v:role==='rest'?-78+(i-7)*28:role==='outgoing'?-30+(i%2)*16:35+(i%2)*16,
   role,alpha:role==='rest'?1:Math.min(1,phase*12,(1-phase)*12),frame:Math.floor(time*(role==='returning'?4:8)+i*1.7)%8};
 });
}
/** Clip every decorative pixel to the exterior, not merely each actor's anchor. */
export function clipCamp(ctx:CanvasRenderingContext2D,sign:number){
 ctx.beginPath();[[728,-500],[1000,-500],[1000,500],[728,500]].forEach(([u,v],i)=>{const p=bridgePoint(sign*u,v);if(i)ctx.lineTo(p.x,p.y);else ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.clip();
}
export function drawCampActors(ctx:CanvasRenderingContext2D,sign:number,time:number,images:Record<string,HTMLImageElement>){
 ctx.save();clipCamp(ctx,sign);
 for(const actor of campActors(sign,time).sort((a,b)=>bridgePoint(a.u,a.v).y-bridgePoint(b.u,b.v).y)){
  const team=sign<0?'blue':'red',key=actor.role==='rest'&&sign<0?'rest':`${team}-melee-walk`,clip=key==='rest'?rest:clips[key as keyof typeof clips];
  const im=images[key];if(!im)continue;const p=bridgePoint(actor.u,actor.v);
  const f=actor.role==='rest'?(sign<0?Math.floor(time*5+actor.v)%8:0):actor.frame,anchor=clip.anchors[(f+8)%8],scale=clip.scale*1.2;
  ctx.save();ctx.globalAlpha=actor.alpha*.85;ctx.translate(p.x,p.y);
  ctx.fillStyle='#09172266';ctx.beginPath();ctx.ellipse(0,0,15,5,0,0,7);ctx.fill();
  if(actor.role==='returning')ctx.scale(-1,1);
  if(actor.role==='rest')ctx.rotate(Math.sin(time*1.4+actor.v)*.018);
  const frame=(f+8)%8;ctx.drawImage(im,frame%4*clip.width,Math.floor(frame/4)*clip.height,clip.width,clip.height,-anchor[0]*scale,-anchor[1]*scale,clip.width*scale,clip.height*scale);ctx.restore();
 }ctx.restore();
}
