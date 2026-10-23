import type {Point} from '../game/types';
/** Simulation-clock scheduling, based on real movement rather than click frequency. */
export class MovementVoice {
 private previous:Point|null=null;
 private clock=-1;
 private walkingSince:number|null=null;
 private distance=0;
 private nextAt=0;
 private variant=0;
 reset(){this.previous=null;this.clock=-1;this.walkingSince=null;this.distance=0;this.nextAt=0;this.variant=0;}
 update(time:number,point:Point,eligible:boolean):number|null{
  if(time<this.clock)this.reset();
  const dt=this.clock<0?0:time-this.clock;
  const moved=this.previous?Math.hypot(point.x-this.previous.x,point.y-this.previous.y):0;
  this.previous={...point};this.clock=time;
  if(!eligible||dt>.3||moved>150){this.walkingSince=null;this.distance=0;return null;}
  if(dt===0)return null;
  if(moved<.15){this.walkingSince=null;this.distance=0;return null;}
  this.walkingSince??=time;
  this.distance+=moved;
  if(time-this.walkingSince<2||this.distance<35||time<this.nextAt)return null;
  return this.variant%2;
 }
 /** Commit only after a buffer was ready and playback actually started. */
 played(time:number){this.variant++;this.nextAt=time+16+(this.variant%2)*3;}
}
