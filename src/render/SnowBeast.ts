import type {Point} from '../game/types';
import {BRIDGE,bridgePoint} from '../game/Bridge';
const brush=BRIDGE.brush[1],side=Math.sign(brush.v);
export const SNOW_BEAST_HABITAT={
 home:bridgePoint(brush.u,brush.v+side*5),
 peeks:[bridgePoint(brush.u+12,brush.v-side*10),bridgePoint(brush.u-14,brush.v-side*9)],
};
export type SnowBeastMode='hidden'|'emerge'|'sniff'|'retreat';
/** One decorative animal. Actor positions are read-only; this never enters Match.entities. */
export class SnowBeast {
 position:Point;
 target:Point;
 mode:SnowBeastMode='hidden';
 exposure=0;
 facing=1;
 private clock=-1;
 private nextAction=0;
 private visits=0;
 constructor(readonly home:Point,readonly peeks:readonly Point[]){this.position={...home};this.target={...home};}
 reset(){this.position={...this.home};this.target={...this.home};this.mode='hidden';this.exposure=0;this.clock=-1;this.nextAction=0;this.visits=0;this.facing=1;}
 update(time:number,actors:readonly Point[]){
  if(time<this.clock)this.reset();
  if(this.clock<0){this.clock=time;this.nextAction=time+9;return;}
  const dt=Math.min(.1,Math.max(0,time-this.clock));this.clock=time;
  // No state changes on paused renders, including changes to externally supplied actor arrays.
  if(dt===0)return;
  const danger=actors.some(p=>Math.hypot(p.x-this.home.x,p.y-this.home.y)<180||Math.hypot(p.x-this.position.x,p.y-this.position.y)<150);
  if(danger){
   this.nextAction=time+12;
   if(this.mode!=='hidden'){this.mode='retreat';this.target={...this.home};}
  }
  if(this.mode==='hidden'){
   if(!danger&&time>=this.nextAction&&this.peeks.length){
    this.target={...this.peeks[this.visits++%this.peeks.length]};this.mode='emerge';
   }
  }else if(this.mode==='sniff'&&time>=this.nextAction){this.mode='retreat';this.target={...this.home};}
  if(this.mode==='emerge'||this.mode==='retreat'){
   const dx=this.target.x-this.position.x,dy=this.target.y-this.position.y,distance=Math.hypot(dx,dy);
   const travel=Math.min(distance,(this.mode==='retreat'?78:24)*dt);
   if(distance>.1){this.position.x+=dx/distance*travel;this.position.y+=dy/distance*travel;if(Math.abs(dx)>1)this.facing=dx>0?1:-1;}
   if(distance<=travel+.1){
    if(this.mode==='retreat'){this.mode='hidden';this.exposure=0;this.nextAction=time+18+(this.visits*7%13);}
    else{this.mode='sniff';this.nextAction=time+2.6;}
   }
  }
  const visible=this.mode==='emerge'||this.mode==='sniff';
  this.exposure=Math.max(0,Math.min(1,this.exposure+dt*(visible?2:-4)));
 }
}
