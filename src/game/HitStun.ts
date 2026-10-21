import type {Entity,ImpactKind,Point,AbilityKey} from './types';
import {YASUO_Q_CAST_SECONDS} from './YasuoQ';
import {YASUO_R} from './YasuoR';
import {STORM} from './YasuoStorm';
import {E} from './YasuoE';
import {W_CAST_SECONDS} from './WindWall';
import {equipmentStats} from './ItemCatalog';

export const HIT_STUN={attack:.05,q:.07,protection:.35,inputBuffer:.18} as const;
export const inHitStun=(entity:Entity,time:number)=>Math.max(entity.flinchUntil??0,entity.stasisUntil??0)>time;
/** The protection belongs to the victim, so alternating attackers cannot bypass it. */
export function applyHitStun(source:Entity,target:Entity,impact:ImpactKind,time:number,damage:number):number{
 if(source.kind!=='hero'||target.kind==='tower'||target.hp<=0||damage<=0||source.team===target.team||
  (impact!=='attack'&&impact!=='q')||(target.airborneUntil??0)>time||
  inHitStun(target,time)||(target.flinchProtectedUntil??0)>time)return 0;
 const duration=HIT_STUN[impact]*(1-Math.min(.75,target.kind==='hero'?equipmentStats(target).tenacity:0));
 target.flinchUntil=time+duration;target.flinchProtectedUntil=time+duration+HIT_STUN.protection;
 return duration;
}
/** Existing committed actions finish on their original clocks, without cancellation. */
export function committedUntil(entity:Entity,time:number):number{
 return Math.max(time,
  entity.windup>0?time+entity.windup:0,
  entity.qCast?entity.qCast.startedAt+YASUO_Q_CAST_SECONDS:0,
  entity.eCast?entity.eCast.startedAt+E.duration:0,
  entity.eqCast?.endsAt??0,
  entity.wCast?entity.wCast.startedAt+W_CAST_SECONDS:0,
  entity.q3Cast?entity.q3Cast.startedAt+STORM.castDuration:0,
  entity.rCast?entity.rCast.startedAt+YASUO_R.duration:0);
}
export type BufferedOrder=({kind:'move';point:Point}|{kind:'attack-move';point:Point}|{kind:'attack';targetId:number}|{kind:'cast';ability:AbilityKey;point:Point;targetId?:number}|{kind:'stop'})&{expiresAt:number};
