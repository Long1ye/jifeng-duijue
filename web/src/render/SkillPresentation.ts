import {EQ} from '../game/YasuoE';
import {UNIT_METRICS} from '../game/UnitMetrics';
import type {Entity,GameEvent} from '../game/types';
import { airborneMotion } from './AirborneMotion';

/** Match the visible ring diameter to its world-space hit radius. */
export const EQ_RING_SCALE=EQ.radius*2/176;
/** Frame 3 is the full ring: arrive on the simulation contact, then play its decay. */
export function eqPresentation(cast:NonNullable<Entity['eqCast']>,now:number){
  const age=now-cast.startedAt,contact=cast.triggerAt-cast.startedAt;
  const after=now-cast.triggerAt;
  const visible=age>=0&&now<cast.endsAt;
  const frame=after<0?2:Math.min(5,3+Math.floor(after/Math.max(.001,(cast.endsAt-cast.triggerAt)/3)));
  return {visible,frame,alpha:after<0?.35+.65*Math.max(0,age/contact):Math.max(0,1-after/(cast.endsAt-cast.triggerAt)),
    contact:after>=0,after,empowered:!!cast.empowered};
}
export const TORNADO_HEIGHT=96;
export const TORNADO_SCALE=TORNADO_HEIGHT/640;
export const TORNADO_ACCENT_SCALE=TORNADO_HEIGHT/40;
export function airborneLift(entity:Entity,now:number):number {
  return airborneMotion(entity,now).lift;
}

/** Contact stays on the struck body, including the simulation's knock-up lift. */
export function contactPosition(event:GameEvent,now:number,target?:Entity){
  const body=UNIT_METRICS[event.targetKind??'melee'];
  const x=target?.x??event.x,y=target?.y??event.y;
  const dx=event.x-(event.from?.x??event.x-1),dy=event.y-(event.from?.y??event.y);
  const length=Math.hypot(dx,dy)||1;
  const offset=body.radius*.45;
  return {x:x-dx/length*offset,y:y-body.height*.46-dy/length*offset-(target?airborneLift(target,now):0),groundX:x,groundY:y};
}
