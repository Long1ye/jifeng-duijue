import type {AbilityKey,Entity,ImpactKind} from './types';
import {equipmentStats} from './ItemCatalog';

/** PC LoL 26.20; distances converted to this project's existing Q world scale. */
export const LEAGUE_RULES = {
 patch:'26.20',worldScale:145/475,maxLevel:18,xpRadius:1500*145/475,
 minionXP:{melee:62,ranged:31},
 yasuo:{health:590,healthGrowth:110,ad:60,adGrowth:2.5,armor:32,armorGrowth:4.6,
  mr:32,mrGrowth:2.05,regen:6.5,regenGrowth:.9,attackSpeed:.697,asGrowth:.035,moveSpeed:345},
} as const;
export const championLevel=(hero:Entity)=>Math.max(1,Math.min(18,Math.floor(hero.level??1)));
export function growthFactor(level:number):number {return .7025*(level-1)+.0175*(level-1)**2;}
export function totalXPForLevel(level:number):number {return (level-1)*(180+50*level);}
export function experienceProgress(hero:Entity){
 const level=championLevel(hero),max=level===18;
 return {current:max?0:Math.max(0,(hero.experience??0)-totalXPForLevel(level)),
  required:max?0:180+100*level};
}
/** Solo takedown XP; this game has one champion on each team and no assists. */
export function championKillExperience(killer:Entity,victim:Entity):number {
 const bounty=[42,114,144,174,204,234,308,392,486,590,640,690,740,790,840,890,940,990][championLevel(victim)-1];
 const decimalLevel=(hero:Entity)=>{const p=experienceProgress(hero);return championLevel(hero)+(p.required?Math.min(1,p.current/p.required):0);};
 const difference=decimalLevel(victim)-decimalLevel(killer);
 const modifier=difference>1?1+.2*(difference-1):difference < -1?Math.max(.4,1+.2*(difference+1)):1;
 return bounty*modifier;
}
export function championStats(level:number){
 const b=LEAGUE_RULES.yasuo,g=growthFactor(level),bonusAttackSpeed=b.asGrowth*g;
 return {maxHp:b.health+b.healthGrowth*g,damage:b.ad+b.adGrowth*g,
  armor:b.armor+b.armorGrowth*g,magicResist:b.mr+b.mrGrowth*g,
  healthRegen:b.regen+b.regenGrowth*g,bonusAttackSpeed,
  attackInterval:1/(b.attackSpeed*(1+bonusAttackSpeed)),speed:b.moveSpeed*LEAGUE_RULES.worldScale,
  range:175*LEAGUE_RULES.worldScale};
}
export function initializeChampion(hero:Entity):void {
 Object.assign(hero,championStats(1),{level:1,experience:0,skillPoints:1,skillRanks:{q:0,w:0,e:0,r:0},gold:500,inventory:Array(6).fill(null)});
 hero.hp=hero.maxHp;
}
export function refreshChampionStats(hero:Entity):void {
 const oldMax=hero.maxHp,alive=hero.hp>0,base=championStats(championLevel(hero)),items=equipmentStats(hero);
 const overflowAD=Math.max(0,items.crit*2-1)*50;
 Object.assign(hero,base,{maxHp:base.maxHp+items.hp,damage:base.damage+items.ad+overflowAD,armor:base.armor+items.armor,
  magicResist:base.magicResist+items.mr,abilityPower:items.ap,abilityHaste:items.haste,bonusMana:items.mana,
  healthRegen:base.healthRegen*(1+items.regenPercent)+items.regen,
  bonusAttackSpeed:base.bonusAttackSpeed+items.as,critChance:items.crit,
  attackInterval:1/Math.min(2.5,LEAGUE_RULES.yasuo.attackSpeed*(1+base.bonusAttackSpeed+items.as))});
 if((hero.itemState?.frozenUntil??0)>(hero.itemState?.clock??0))hero.attackInterval/= .8;
 if((hero.itemState?.c44Until??0)>(hero.itemState?.clock??0))hero.range+=100*LEAGUE_RULES.worldScale;
 if(hero.itemState?.rapidRange===1)hero.range+=150*LEAGUE_RULES.worldScale;
 const ms=(LEAGUE_RULES.yasuo.moveSpeed+items.ms)*(1+items.percentMS);
 hero.speed=(ms>490?ms*.5+230:ms>415?ms*.8+83:ms)*LEAGUE_RULES.worldScale;
 if(alive)hero.hp=Math.max(1,Math.min(hero.maxHp,hero.hp+hero.maxHp-oldMax));
}
export function grantExperience(hero:Entity,amount:number):number {
 if(hero.kind!=='hero'||!Number.isFinite(amount)||amount<=0)return 0;
 hero.experience=Math.min(totalXPForLevel(18),(hero.experience??0)+amount);
 const before=championLevel(hero);let level=before;
 while(level<18&&hero.experience>=totalXPForLevel(level+1))level++;
 if(level>before){
  Object.assign(hero,{level,skillPoints:(hero.skillPoints??0)+level-before});
  refreshChampionStats(hero);
 }
 return level-before;
}
export function canUpgradeSkill(hero:Entity,key:AbilityKey):boolean {
 if(!hero.skillRanks||(hero.skillPoints??0)<1)return false;
 const rank=hero.skillRanks[key],level=championLevel(hero);
 return key==='r'?rank<3&&level>=[6,11,16][rank]:rank<5&&level>=rank*2+1;
}
export function upgradeSkill(hero:Entity,key:AbilityKey):boolean {
 if(!canUpgradeSkill(hero,key))return false;
 hero.skillRanks![key]++;hero.skillPoints!--;return true;
}
export function skillCooldown(hero:Entity,key:AbilityKey):number {
 const rank=Math.max(1,hero.skillRanks?.[key]??1);
 if(key==='q')return Math.max(1.33,4*(1-Math.min(.6667,(hero.bonusAttackSpeed??0)*.58)));
 const cooldown=key==='w'?[25,23,21,19,17][rank-1]:key==='e'?[.5,.4,.3,.2,.1][rank-1]:[70,50,30][rank-1];
 const ids=hero.inventory??[],bonus=key==='r'?(ids.includes(2512)?30:0)+(ids.includes(3073)?30:0)+(ids.includes(3118)?20:0):ids.includes(3161)?25:0;
 return key==='e'?cooldown:cooldown/(1+((hero.abilityHaste??0)+bonus)/100);
}
export function skillDamage(hero:Entity,key:'q'|'e'|'r'):number {
 const rank=hero.skillRanks?.[key]??0;if(rank===0)return 0;
 const bonusAD=Math.max(0,hero.damage-championStats(championLevel(hero)).damage);
 return key==='q'?[20,45,70,95,120][rank-1]+1.05*hero.damage
  :key==='e'?[70,85,100,115,130][rank-1]*(1+.25*(hero.eDamageStacks??0))+.2*bonusAD+.6*(hero.abilityPower??0)
  :[200,350,500][rank-1]+1.5*bonusAD;
}
export function resistanceMultiplier(resistance:number):number {
 return resistance>=0?100/(100+resistance):2-100/(100-resistance);
}
export function mitigateDamage(target:Entity,amount:number,impact:ImpactKind,source?:Entity):number {
 if(impact==='ignite'||impact==='item-true')return amount;
 const magic=impact==='e'||impact==='spell'||impact==='item-magic',items=source?.kind==='hero'?equipmentStats(source):undefined;
 let resistance=(magic?target.magicResist:target.armor)??0;
 if(!magic&&(target.itemState?.shredUntil??0)>(source?.itemState?.clock??0))resistance*=1-(target.itemState?.armorShred??0);
 if(magic&&(target.itemState?.mrShredUntil??0)>(source?.itemState?.clock??0))resistance*=1-(target.itemState?.mrShred??0);
 if(resistance>0&&items)resistance=Math.max(0,resistance*(1-Math.min(.8,magic?items.magicPen:items.armorPen))-(magic?items.flatMagicPen:items.lethality));
 return amount*resistanceMultiplier(resistance);
}
