import type {Point} from '../game/types';
export const SNOW_TRAIL_CAPACITY=120;
export const SNOW_STRIDE=25;
export interface SnowStep extends Point {angle:number;at:number;side:number}
/** Distance-spaced footfalls, independent of rendering cadence. No simulation writes. */
export class SnowTrailTracker {
 readonly steps:SnowStep[]=[];
 private tracks=new Map<number,Point&{distance:number;side:number}>();
 private lastTime=-1;
 reset(){this.steps.length=0;this.tracks.clear();this.lastTime=-1;}
 update(time:number,actors:readonly (Point&{id:number})[],surface:(x:number,y:number)=>boolean){
  if(time<this.lastTime)this.reset();
  if(time===this.lastTime)return;
  const dt=this.lastTime<0?0:time-this.lastTime;
  this.lastTime=time;
  while(this.steps.length&&time-this.steps[0].at>7)this.steps.shift();
  for(const id of this.tracks.keys())if(!actors.some(actor=>actor.id===id))this.tracks.delete(id);
  for(const actor of actors){
   const old=this.tracks.get(actor.id);
   if(!old){this.tracks.set(actor.id,{x:actor.x,y:actor.y,distance:0,side:1});continue;}
   const dx=actor.x-old.x,dy=actor.y-old.y,length=Math.hypot(dx,dy);
   // Repositioning, dashes and long background-tab gaps must not stamp a dotted line.
   if(dt>0&&dt<=.3&&length>0&&length/dt<650){
    const angle=Math.atan2(dy,dx);
    for(let walked=SNOW_STRIDE-old.distance;walked<=length;walked+=SNOW_STRIDE){
     const x=old.x+dx*walked/length-Math.sin(angle)*old.side*5;
     const y=old.y+dy*walked/length+Math.cos(angle)*old.side*3;
     if(surface(x,y)){
      if(this.steps.length===SNOW_TRAIL_CAPACITY)this.steps.shift();
      this.steps.push({x,y,angle,at:time-dt*(1-walked/length),side:old.side});
     }
     old.side*=-1;
    }
    old.distance=(old.distance+length)%SNOW_STRIDE;
   }else if(length>0)old.distance=0;
   old.x=actor.x;old.y=actor.y;
  }
 }
}
