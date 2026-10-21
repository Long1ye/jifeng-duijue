import {YASUO_Q_CAST_SECONDS} from '../game/YasuoQ';

/** Retimed W artwork; Q's committed gameplay duration is unchanged. */
export function qSlashFrame(age:number){
 return Math.max(0,Math.min(7,Math.floor(age/YASUO_Q_CAST_SECONDS*8)));
}
/** A slim traveling blade, in world coordinates. No direction quantization. */
export function qLightPoints(x:number,y:number,vx:number,vy:number,fade=1){
 const n=Math.hypot(vx,vy)||1,dx=vx/n,dy=vy/n;
 const at=(along:number,across:number)=>({x:x+dx*along-dy*across,y:y+dy*along+dx*across});
 const width=Math.max(0,Math.min(1,fade));
 return {tip:at(5,0),tail:at(-22,0),
  blade:[at(5,0),at(-5,3*width),at(-28,0),at(-5,-3*width)],
  halo:[at(7,0),at(-8,5*width),at(-34,0),at(-8,-5*width)]};
}
