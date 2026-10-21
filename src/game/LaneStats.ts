import type {Entity} from './types';
import {LEAGUE_RULES} from './ChampionProgression';
import {MINION_PACING} from './MinionPacing';

const scale=LEAGUE_RULES.worldScale;
export const LANE_STATS={
 melee:{baseHP:430,hpGrowth:35,hpCap:1550,attackSpeed:1.25,range:110,windup:.393,onHit:.02},
 ranged:{baseHP:275,hpGrowth:9,hpCap:600,attackSpeed:.667,range:550,windup:.47,onHit:.035},
 tower:{hp:9000,armor:60,attackSpeed:.833,range:750,windup:.165,projectileSpeed:1200,
  baseAD:182,adPerMinute:12,maxAD:350,plateThresholds:[.9,.75,.55,.3,0],bulwarkDuration:20,
  backdoorRange:900,bulwarkRange:850,heatPerHit:.5,heatDuration:5},
} as const;

/** Upgrades are applied to newly spawned minions, never as a heal to a live wave. */
export function minionStats(kind:'melee'|'ranged',time:number){
 const upgrades=Math.floor(Math.max(0,time)/90)+1,spec=LANE_STATS[kind];
 const damage=kind==='melee'?Math.min(80,11+Math.min(upgrades,5)+3.4*Math.max(0,upgrades-5))
  :Math.min(125,19.5+1.5*Math.min(upgrades,5)+4.5*Math.max(0,upgrades-5));
 return {maxHp:Math.min(spec.hpCap,spec.baseHP+spec.hpGrowth*upgrades),damage,
  armor:kind==='melee'?Math.min(20,Math.max(0,upgrades-5)):0,magicResist:0,
  attackInterval:1/spec.attackSpeed,range:spec.range*scale,speed:MINION_PACING.speed,
  attackWindup:spec.windup,projectileSpeed:650*scale};
}
export function initializeLaneUnit(unit:Entity,time:number,howling=false):void {
 if(unit.kind==='melee'||unit.kind==='ranged')Object.assign(unit,minionStats(unit.kind,time));
 else if(unit.kind==='tower'){
  const spec=LANE_STATS.tower;
  Object.assign(unit,{maxHp:spec.hp,range:spec.range*scale,attackInterval:1/spec.attackSpeed,
   attackWindup:spec.windup,projectileSpeed:spec.projectileSpeed*scale,towerHasPlates:!howling,
   towerPlates:howling?undefined:0,towerBulwarks:[]});
  updateOuterTurret(unit,time);
 }
 unit.laneRules=true;unit.hp=unit.maxHp;
}
export function updateOuterTurret(tower:Entity,time:number):void {
 const decayTicks=Math.min(4,Math.max(0,Math.floor(time/60)-10));
 tower.towerBulwarks=(tower.towerBulwarks??[]).filter(buff=>buff.until>time);
 const bulwark=tower.towerBulwarks.reduce((sum,buff)=>sum+buff.armor,0);
 tower.armor=LANE_STATS.tower.armor-15*decayTicks+bulwark;
 tower.magicResist=LANE_STATS.tower.armor-15*decayTicks+bulwark;
 tower.damage=Math.min(LANE_STATS.tower.maxAD,LANE_STATS.tower.baseAD+Math.floor(time/60)*LANE_STATS.tower.adPerMinute);
}
export function updateTowerMinionPresence(tower:Entity,entities:readonly Entity[],time:number):void {
 if(entities.some(e=>isMinion(e)&&e.hp>0&&e.team!==tower.team&&near(e,tower,LANE_STATS.tower.backdoorRange*scale)))tower.towerMinionsSeenAt=time;
}
export function resolveTowerPlates(tower:Entity,entities:readonly Entity[],time:number):void {
 if(!tower.towerHasPlates)return;
 const broken=LANE_STATS.tower.plateThresholds.filter(ratio=>tower.hp<=tower.maxHp*ratio).length;
 const previous=tower.towerPlates??0;
 const champions=entities.filter(e=>e.kind==='hero'&&e.team!==tower.team&&e.hp>0&&near(e,tower,LANE_STATS.tower.bulwarkRange*scale)).length;
 for(let i=previous;i<Math.min(4,broken);i++)(tower.towerBulwarks??=[]).push({until:time+20,armor:champions>=3?50:30});
 tower.towerPlates=broken;updateOuterTurret(tower,time);
}
export const isMinion=(unit:Entity)=>unit.kind==='melee'||unit.kind==='ranged';
const near=(a:Entity,b:Entity,radius:number)=>Math.hypot(a.x-b.x,a.y-b.y)<=radius;

/** All lane basic attacks are physical; caster minion attacks are not magic. */
export function laneAttackDamage(source:Entity,target:Entity,amount:number,time:number):number {
 if(source.kind==='tower'){
  if(isMinion(target))return target.maxHp*(target.kind==='melee'?.45:.7);
  if(target.kind==='hero'){
   const heat=(source.towerHeatUntil??0)>time?source.towerHeat??0:0;
   source.towerHeat=Math.min(3,heat+1);source.towerHeatUntil=time+LANE_STATS.tower.heatDuration;
   return amount*(1+LANE_STATS.tower.heatPerHit*heat);
  }
 }
 if(isMinion(source)){
  if(isMinion(target))return amount+target.hp*LANE_STATS[source.kind as 'melee'|'ranged'].onHit;
  if(target.kind==='hero')return amount*.55;
  if(target.kind==='tower')return amount*.6;
 }
 return amount;
}
export function turretIncomingMultiplier(tower:Entity,source:Entity,time:number):number {
 const backdoor=(tower.towerMinionsSeenAt??-Infinity)+3<time ? .2 : 1;
 return backdoor*(source.kind==='hero'?1.2:1);
}
