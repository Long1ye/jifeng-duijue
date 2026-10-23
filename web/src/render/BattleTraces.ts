import type {GameEvent} from '../game/types';
export const BATTLE_TRACE_CAPACITY=96;
export interface BattleTrace {x:number;y:number;at:number;heavy:boolean;seed:number}
/** Event-fed floor memory. Deduplicate dense exchanges; never modify combat state. */
export class BattleTraces {
 readonly marks:BattleTrace[]=[];
 private clock=-1;
 clear(){this.marks.length=0;this.clock=-1;}
 advance(time:number){
  if(time<this.clock)this.clear();this.clock=time;
  for(let i=this.marks.length-1;i>=0;i--)if(time-this.marks[i].at>(this.marks[i].heavy?12:7))this.marks.splice(i,1);
 }
 event(event:GameEvent,time:number){
  this.advance(time);
  if(event.type!=='hit'&&event.type!=='kill')return;
  const heavy=event.type==='kill'||(event.amount??0)>=80;
  const previous=this.marks.find(m=>time-m.at<.45&&Math.hypot(m.x-event.x,m.y-event.y)<28);
  if(previous){previous.heavy=previous.heavy||heavy;return;}
  if(this.marks.length===BATTLE_TRACE_CAPACITY)this.marks.shift();
  this.marks.push({x:event.x,y:event.y,at:time,heavy,seed:Math.floor(event.x*.7+event.y*1.3+time*4)});
 }
}
