import type {Entity} from './types';

export const YASUO_PASSIVE={maxFlow:100,shieldDuration:1,worldScale:100/475,critMultiplier:2,critDamage:1.8} as const;
const levelOf=(e:Entity)=>Math.max(1,Math.min(18,e.level??1));
export function passiveShieldStrength(e:Entity){
 const level=levelOf(e);
 return 125+475/17*((.685+.0175*level)*(level-1));
}
export function flowDistance(e:Entity){const level=levelOf(e);return (level<7?59:level<13?52.5:46)*YASUO_PASSIVE.worldScale;}
export function shieldRemaining(e:Entity,time:number){return (e.passiveShieldUntil??0)>time?Math.max(0,e.passiveShield??0):0;}
export function gainFlow(e:Entity,moved:number,time:number){
 if(e.kind!=='hero'||e.hp<=0||shieldRemaining(e,time)>0||moved<=0)return;
 e.flow=Math.min(100,(e.flow??0)+moved/flowDistance(e));
}
export function absorbWithPassive(source:Entity,target:Entity,amount:number,time:number){
 if(target.kind!=='hero')return {remaining:amount,absorbed:0};
 if((target.passiveShieldUntil??0)<=time)target.passiveShield=0;
 if((target.flow??0)>=100&&source.kind==='hero'&&shieldRemaining(target,time)<=0){
  target.flow=0;target.passiveShield=passiveShieldStrength(target);
  target.passiveShieldAt=time;target.passiveShieldUntil=time+YASUO_PASSIVE.shieldDuration;
 }
 const absorbed=Math.min(amount,shieldRemaining(target,time));
 target.passiveShield=Math.max(0,(target.passiveShield??0)-absorbed);
 return {remaining:amount-absorbed,absorbed};
}
/** critChance is the unmodified chance from external stats, expressed as 0..1. */
export function yasuoCritStats(e:Entity){
 const raw=Math.max(0,e.critChance??0)*YASUO_PASSIVE.critMultiplier;
 return {chance:Math.min(1,raw),bonusAD:Math.max(0,raw-1)*100*.5,multiplier:YASUO_PASSIVE.critDamage};
}
