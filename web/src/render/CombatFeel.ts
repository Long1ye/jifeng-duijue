import type {Entity,GameEvent,ImpactKind,Point,Team} from '../game/types';
import {circleHit} from '../game/WindWall';
import {YASUO_Q_CAST_SECONDS} from '../game/YasuoQ';

/** Predict the first contact along the existing Q ray, solely to time its artwork. */
export function qContactDelay(source:Point&{team:Team},facing:number,targets:readonly Entity[],range:number,speed:number){
 const end={x:source.x+Math.cos(facing)*range,y:source.y+Math.sin(facing)*range};
 let fraction=Infinity;
 for(const target of targets)if(target.hp>0&&target.team!==source.team&&target.kind!=='tower'){
  const hit=circleHit(source,end,target,target.radius+3);if(hit!==null)fraction=Math.min(fraction,hit);
 }
 return Math.max(.065,Math.min(.66,Number.isFinite(fraction)?fraction*range/speed:.24));
}

export function impactProfile(kind:ImpactKind='attack'){
 const heavy=kind==='r'||kind==='q3'||kind==='eq3';
 return {heavy,hold:kind==='e'?0:heavy?.055:kind==='q'?.042:kind==='eq'?.045:.032,
  recoil:kind==='r'?9:heavy?7:kind==='q'?6:kind==='e'?4:4.5,
  length:kind==='q'?33:kind==='e'?25:kind==='eq'?32:heavy?40:23,
  duration:heavy?.3:.2};
}
export function impactDirection(event:GameEvent):Point{
 const dx=event.x-(event.from?.x??event.x-1),dy=event.y-(event.from?.y??event.y);
 const length=Math.hypot(dx,dy);return length>.001?{x:dx/length,y:dy/length}:{x:1,y:0};
}
/** A quick impulse followed by a small rebound; never writes to an entity. */
export function recoilDistance(age:number,amount:number){
 if(age<0||age>=.22)return 0;
 if(age<.035)return amount*(.65+.35*age/.035);
 const t=(age-.035)/.185;
 return amount*Math.exp(-4*t)*Math.cos(t*Math.PI*1.6)*(1-t);
}
interface Contact {at:number;kind:ImpactKind;direction:Point;heroSource:boolean}
export class CombatFeel {
 private contacts=new Map<number,Contact>();
 private holds=new Map<number,{at:number;duration:number;kind:ImpactKind}>();
 private qCasts=new Map<number,{startedAt:number;delay:number;contactAt?:number;facing?:number}>();
 private clock=-1;
 reset(){this.contacts.clear();this.holds.clear();this.qCasts.clear();this.clock=-1;}
 update(time:number){
  if(time<this.clock)this.reset();this.clock=time;
  for(const [id,c] of this.contacts)if(time-c.at>.4)this.contacts.delete(id);
  for(const [id,h] of this.holds)if(time-h.at>.2)this.holds.delete(id);
  for(const [id,q] of this.qCasts)if(time-q.startedAt>1)this.qCasts.delete(id);
 }
 event(event:GameEvent,time:number){
  if(event.type!=='hit'||(event.sourceKind!=='hero'&&event.targetKind!=='hero'))return;
  const at=event.at??time,kind=event.impact??'attack';
  const q=event.sourceId===undefined?undefined:this.qCasts.get(event.sourceId);
  if(kind==='q'&&q&&at>=q.startedAt&&at<q.startedAt+1&&q.contactAt===undefined)q.contactAt=at;
  if(event.targetId!==undefined)this.contacts.set(event.targetId,{at,kind,direction:impactDirection(event),heroSource:event.sourceKind==='hero'});
  // Repeated contacts from one cleave cannot extend the visual stop indefinitely.
  if(event.sourceKind==='hero'&&event.sourceId!==undefined&&kind!=='e'&&kind!=='q3'){
   const previous=this.holds.get(event.sourceId);
   if(!previous||at-previous.at>.12)this.holds.set(event.sourceId,{at,duration:impactProfile(kind).hold,kind});
  }
 }
 beginQ(id:number,startedAt:number,delay:number,facing?:number){this.qCasts.set(id,{startedAt,delay,facing});}
 /** Movement recovery may clear gameplay Q before its remaining artwork ends. */
 qPresentation(hero:Entity,time:number):Entity['qCast']{
  const cast=this.qCasts.get(hero.id);
  if(hero.hp<=0||hero.eCast||hero.eqCast||hero.rCast||hero.wCast||hero.q3Cast||
    (hero.airborneUntil??0)>time||(!hero.qCast&&(hero.flinchUntil??0)>time)||
    (cast&&hero.attackStartedAt!==null&&hero.attackStartedAt>cast.startedAt)){
   this.qCasts.delete(hero.id);return null;
  }
  if(hero.qCast)return hero.qCast;
  if(!cast||cast.facing===undefined||time<cast.startedAt||time>=cast.startedAt+YASUO_Q_CAST_SECONDS)return null;
  return {startedAt:cast.startedAt,facing:cast.facing,hit:true};
 }
 qAge(id:number,startedAt:number,now:number,flashAge:number,duration:number){
  const cast=this.qCasts.get(id),age=Math.max(0,now-startedAt);
  if(!cast||cast.startedAt!==startedAt)return age;
  const delay=cast.contactAt===undefined?cast.delay:Math.max(.001,cast.contactAt-startedAt),hold=cast.contactAt===undefined?0:impactProfile('q').hold;
  if(age<delay)return age/delay*flashAge;
  const contactPose=flashAge+.012;
  if(age<delay+hold)return contactPose;
  return Math.min(duration,contactPose+(age-delay-hold)/Math.max(.01,duration-delay-hold)*(duration-contactPose));
 }
 actionTime(id:number,now:number){
  const hold=this.holds.get(id);if(!hold||now<hold.at)return now;
  const age=now-hold.at;
  if(age<hold.duration)return hold.at;
  // Catch up over 80ms, so animation and simulation never drift apart.
  return now-hold.duration*Math.max(0,1-(age-hold.duration)/.08);
 }
 reaction(id:number,time:number){
  const contact=this.contacts.get(id);
  if(!contact)return {x:0,y:0,flash:false,active:false};
  const age=time-contact.at,amount=recoilDistance(age,impactProfile(contact.kind).recoil*(contact.heroSource?1:.45));
  return {x:contact.direction.x*amount,y:contact.direction.y*amount,flash:age>=0&&age<.045,active:age>=0&&age<.22};
 }
}
