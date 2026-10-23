import type {Match} from './Match';
import type {Entity,ImpactKind,Point} from './types';
import {equipmentStats,hasItem,itemById,type Item,type ItemStats} from './ItemCatalog';
import {atShop} from './Equipment';
import {championStats,refreshChampionStats,LEAGUE_RULES,grantExperience,totalXPForLevel} from './ChampionProgression';
import {distance,direction,clampPoint} from './geometry';
import {clearBridgeFootprints} from './BridgeInteraction';
import {HOWLING_MAP} from './config';

const scale=LEAGUE_RULES.worldScale;
const state=(hero:Entity)=>hero.itemState??={};
const ownsAny=(hero:Entity,ids:number[])=>ids.some(id=>hasItem(hero,id));
const attackImpact=(impact:ImpactKind)=>['attack','q','q3','eq','eq3'].includes(impact);
const magicImpact=(impact:ImpactKind)=>['e','spell','item-magic'].includes(impact);
export function healFromItems(hero:Entity,amount:number,time:number,ignite=false):void {
 if(hero.hp<=0||amount<=0)return;
 const stats=equipmentStats(hero),multiplier=(1+stats.healShield)*(hasItem(hero,3065)?1.25:1)*(ignite||(hero.grievousUntil??0)>time?.6:1);
 hero.hp=Math.min(hero.maxHp,hero.hp+amount*multiplier);
}
export function addItemShield(hero:Entity,amount:number,until:number,magic=false):void {
 const stats=equipmentStats(hero);(hero.itemShields??=[]).push({amount:amount*(1+stats.healShield)*(hasItem(hero,3065)?1.25:1),until,magic});
}
export function itemShieldRemaining(hero:Entity,time:number):number{return (hero.itemShields??[]).reduce((sum,shield)=>sum+(shield.until>time?shield.amount:0),0);}
function buff(hero:Entity,id:number,until:number,stats:ItemStats):void {
 hero.itemBuffs=(hero.itemBuffs??[]).filter(b=>b.id!==id);hero.itemBuffs.push({id,until,stats});refreshChampionStats(hero);
}
export const ACTIVE_COOLDOWNS:Record<string,number>={potion:0,refill:0,stasis:120,cleave:10,stride:15,cleanse:90,speed:60,slow:60,shield:90,heal:90,gunblade:40,rocket:40,anchor:45,ward:120,sweep:90};
export function itemUseError(hero:Entity,slot:number,time:number):string|null {
 const id=slot===6?hero.trinket:hero.inventory?.[slot],item=id==null?undefined:itemById(id);
 if(hero.hp<=0)return '英雄已阵亡';
 if((hero.stasisUntil??0)>time)return '凝滞中不可使用';
 if(!item?.active)return '该装备没有可使用的主动效果';
 if((hero.itemState?.[`cd:${id}`]??0)>time)return `冷却 ${Math.ceil(hero.itemState![`cd:${id}`]-time)} 秒`;
 if(item.active==='refill'&&(hero.itemState?.[`charges:${id}`]??2)<1)return '药水无充能，返回商店补充';
 if(slot===6&&(hero.itemState?.trinketCD??0)>time)return `饰品冷却 ${Math.ceil(hero.itemState!.trinketCD-time)} 秒`;
 if((item.active==='potion'||item.active==='refill')&&(hero.potion?.until??0)>time)return '药水效果正在持续';
 return null;
}
export function useEquipment(match:Match,team:'blue'|'red',slot:number,point:Point):boolean {
 if(!match.leagueRules||match.phase!=='playing'||!Number.isInteger(slot)||slot<0||slot>6)return false;
 const hero=match.hero(team),time=match.time;
 if(itemUseError(hero,slot,time))return false;
 const id=(slot===6?hero.trinket:hero.inventory![slot])!,item=itemById(id)!,s=state(hero),stats=equipmentStats(hero);
 const enemies=match.entities.filter(e=>e.hp>0&&e.team!==team&&e.kind!=='tower');
 const area=(radius:number,damage:number,magic:boolean,slow=false)=>{for(const target of enemies)if(distance(hero,target)<=radius*scale)match.damage(hero,target,damage,slow,magic?'item-magic':'item-physical',false);};
 const nearest=enemies.filter(e=>distance(hero,e)<=700*scale).sort((a,b)=>distance(a,point)-distance(b,point))[0];
 if(item.active==='gunblade'&&!nearest)return false;
 if(item.active==='potion'||item.active==='refill'){
  hero.potion={until:time+(id===2003?15:12),perSecond:id===2003?8:125/12};
  if(item.active==='potion')hero.inventory![slot]=null;else s[`charges:${id}`]=(s[`charges:${id}`]??2)-1;
 }else if(item.active==='stasis'){
  hero.stasisUntil=time+2.5;match.stop(team);hero.qCast=null;hero.q3Cast=null;hero.eqCast=null;hero.eCast=null;hero.rCast=null;hero.wCast=null;
  if(id===2420){hero.inventory![slot]=2421;refreshChampionStats(hero);}
 }else if(item.active==='cleanse'){
  hero.slowUntil=0;hero.flinchUntil=0;
  if(id===3139)buff(hero,id,time+1.5,{percentMS:.5});
 }else if(item.active==='cleave'||item.active==='stride'){
  area(450,hero.damage*(id===3077?.6:id===6698?1.0:.8),false,item.active==='stride');
  if(id===3074)healFromItems(hero,hero.damage*stats.lifesteal,time);
 }else if(item.active==='speed')buff(hero,id,time+(id===3142?6:4),{percentMS:id===3142?.2:.3});
 else if(item.active==='slow')area(550,1,false,true);
 else if(item.active==='shield')addItemShield(hero,200+10*(hero.level??1),time+2.5);
 else if(item.active==='heal'){
  healFromItems(hero,200+10*(hero.level??1),time);
  for(const target of enemies)if(distance(target,point)<=550*scale)match.damage(hero,target,target.maxHp*.1,false,'item-true',false);
 }else if(item.active==='gunblade')match.damage(hero,nearest,175+.3*(hero.abilityPower??0),true,'item-magic',false);
 else if(item.active==='rocket'){
  const dir=direction(hero,point),d=Math.min(275*scale,distance(hero,point));
  const end=clampPoint({x:hero.x+dir.x*d,y:hero.y+dir.y*d},hero.radius);
  Object.assign(hero,HOWLING_MAP?clearBridgeFootprints(end,hero.radius,hero.id):end);area(600,100+.1*(hero.abilityPower??0),true);
 }else if(item.active==='anchor'){
  if(s.anchorUntil>time){Object.assign(hero,clampPoint({x:s.anchorX,y:s.anchorY},hero.radius));s.anchorUntil=0;}
  else {s.anchorX=hero.x;s.anchorY=hero.y;s.anchorUntil=time+4;return true;}
 }else if(item.active==='ward'||item.active==='sweep'){
  const dir=direction(hero,point),d=Math.min(id===3363?4000*scale:600*scale,distance(hero,point));
  const location=item.active==='sweep'?hero:clampPoint({x:hero.x+dir.x*d,y:hero.y+dir.y*d});
  hero.itemWards=[...(hero.itemWards??[]).filter(w=>w.until>time).slice(-2),{...location,until:time+(item.active==='sweep'?10:id===2055?180:90),radius:900*scale}];
  if(id===2055)hero.inventory![slot]=null;
 }
 s[`cd:${id}`]=time+(ACTIVE_COOLDOWNS[item.active!]??0)/(1+stats.haste/100);
 if(slot===6)s.trinketCD=s[`cd:${id}`];return true;
}

export function equipmentCast(hero:Entity,time:number,key?:string):void {
 const s=state(hero);s.spellbladeUntil=time+10;
 if(key==='r'){
  if(hasItem(hero,3050))s.zekeUntil=time+5;
  if(hasItem(hero,3073))buff(hero,3073,time+8,{as:.4,percentMS:.1});
  if(hasItem(hero,2512)){s.crossbowCharges=3;s.crossbowUntil=time+8;buff(hero,2512,time+8,{as:.5});}
 }
 if(ownsAny(hero,[3070,3003,3004,3119,2526])&&(s.tearCD??0)<=time){
  s.tearCD=time+8;s.tearStacks=Math.min(360,(s.tearStacks??0)+3);
  if(s.tearStacks>=360){hero.inventory=hero.inventory?.map(id=>id===3003?3040:id===3004?3042:id===3119?3121:id===2526?2530:id);refreshChampionStats(hero);}
 }
}
/** Additional mixed-damage on-hit effects; caller already enforces Q's first target. */
export function extendedOnHit(hero:Entity,target:Entity,time:number):{physical:number;magic:number}{
 const s=state(hero),ap=hero.abilityPower??0,baseAD=championStats(hero.level??1).damage;let physical=0,magic=0;
 if(hasItem(hero,3115))magic+=15+.15*ap;
 if(hasItem(hero,3091))magic+=40+40*((hero.level??1)-1)/17;
 if(hasItem(hero,3124)){
  magic+=30;s.rageHits=(s.rageHits??0)+1;buff(hero,3124,time+3,{as:.08*Math.min(4,s.rageHits)});
  if(s.rageHits%3===0){if(hasItem(hero,3115))magic+=15+.15*ap;if(hasItem(hero,3091))magic+=40+40*((hero.level??1)-1)/17;}
 }
 if(ownsAny(hero,[3057,3078,3100,3508,6662,2510])&&(s.spellbladeUntil??0)>time&&(s.spellbladeCD??0)<=time){
  s.spellbladeUntil=0;s.spellbladeCD=time+1.5;
  if(hasItem(hero,3100))magic+=.75*baseAD+.4*ap;
  else if(hasItem(hero,2510))magic+=baseAD+.2*ap;
  else physical+=baseAD*(hasItem(hero,3078)?2:hasItem(hero,6662)?1.5:1);
  if(hasItem(hero,6662))target.slowUntil=Math.max(target.slowUntil,time+1.5);
 }
 if(hasItem(hero,6672)){
  s.kraken=(s.kraken??0)+1;if(s.kraken%3===0)physical+=120+40*((hero.level??1)-1)/17;
 }
 if(ownsAny(hero,[3094,3095,3144,3087,6699])&&(s.energized??100)>=100){
  magic+=hasItem(hero,3094)||hasItem(hero,3095)?100:40;s.energized=0;
  if(hasItem(hero,3095))buff(hero,3095,time+1.5,{percentMS:.2});
  if(hasItem(hero,3087))s.chainAt=time;
  if(hasItem(hero,6699)){physical+=target.hp*.06;buff(hero,6699,time+4,{lethality:8});}
 }else s.energized=Math.min(100,(s.energized??0)+6);
 if(hasItem(hero,3748))physical+=5+hero.maxHp*.015;
 if(hasItem(hero,3181)){
  s.hullHits=(s.hullHits??0)+1;if(s.hullHits%5===0)physical+=baseAD*1.2+hero.maxHp*.05;
 }
 if(hasItem(hero,3302)){s.terminus=(s.terminus??0)+1;buff(hero,3302,time+5,{armorPen:Math.min(.3,s.terminus*.05),magicPen:Math.min(.3,s.terminus*.05),armor:Math.min(20,s.terminus*3),mr:Math.min(20,s.terminus*3)});}
 if(hasItem(hero,6675))for(const key of ['w','e'] as const)hero.abilities[key]=time+Math.max(0,hero.abilities[key]-time)*.85;
 if(ownsAny(hero,[1054,1056,1120])&&target.kind!=='hero')physical+=5;
 if(hasItem(hero,3032)){
  s.wildCrit=Math.min(.25,(s.wildCrit??0)+.002);
  if(target.kind==='hero'&&(s.wildCD??0)<=time){s.wildCD=time+30;buff(hero,3032,time+6,{as:.3});}
  s.wildCD=Math.max(time,(s.wildCD??0)-1);refreshChampionStats(hero);
 }
 if(hasItem(hero,3742)){physical+=(s.momentum??0)*.8;s.momentum=0;refreshChampionStats(hero);}
 if(hasItem(hero,3179)&&target.kind==='hero'&&(s.umbralCD??0)<=time){s.umbralCD=time+15;physical+=40;}
 if(hasItem(hero,2512)&&(s.crossbowUntil??0)>time&&(s.crossbowCharges??0)>0){s.crossbowCharges--;physical+=hero.damage*.5;}
 if(target.kind==='hero'){
  if(hasItem(hero,3084)&&(s[`heart:${target.id}`]??0)<=time){
   s[`heart:${target.id}`]=time+30;const amount=80+.08*hero.maxHp;physical+=amount;s.permanentHP=(s.permanentHP??0)+amount*.1;refreshChampionStats(hero);
  }
  if(hasItem(hero,6610)&&(s[`sky:${target.id}`]??0)<=time){s[`sky:${target.id}`]=time+6;physical+=hero.damage*.5;healFromItems(hero,baseAD*.8+(hero.maxHp-hero.hp)*.06,time);}
  if(hasItem(hero,1083))healFromItems(hero,3,time);
 }
 return {physical,magic};
}
export function equipmentDamageMultiplier(hero:Entity,target:Entity,impact:ImpactKind,time:number):number {
 if(impact==='ignite'||impact==='item-true')return 1;
 const s=state(hero),elapsed=Math.max(0,time-(s.combatSince??time));let multiplier=1;
 if(hasItem(hero,3147)||hasItem(hero,4633))multiplier+=Math.min(hasItem(hero,4633)?.08:.06,Math.floor(elapsed)*.02);
 if(impact!=='attack'&&hasItem(hero,3161))multiplier+=(s.shojinStacks??0)*.03;
 if(impact==='attack'&&hasItem(hero,2523))multiplier+=.1*Math.min(1,distance(hero,target)/(500*scale));
 if(magicImpact(impact)&&hasItem(hero,4645)&&target.hp<target.maxHp*.4)multiplier*=1.2;
 if(magicImpact(impact)&&hasItem(hero,8020)&&distance(hero,target)<=700*scale)multiplier*=1.12;
 if((target.itemState?.mandateUntil??0)>time)multiplier*=1.07;
 return multiplier;
}
export function preventItemDeath(match:Match,hero:Entity):void {
 if(hero.kind!=='hero'||hero.hp>0||!hasItem(hero,3026))return;
 const s=state(hero),time=match.time;if((s.guardianCD??0)>time)return;
 s.guardianCD=time+300;s.reviveAt=time+4;hero.hp=1;hero.stasisUntil=time+4;hero.itemDots=[];match.stop(hero.team);
 hero.qCast=null;hero.q3Cast=null;hero.eCast=null;hero.eqCast=null;hero.rCast=null;hero.wCast=null;
}

export function defendWithItems(hero:Entity,source:Entity,amount:number,impact:ImpactKind,critical:boolean,time:number,continuation=false):number {
 if(hero.kind!=='hero')return amount;
 const s=state(hero),magic=magicImpact(impact);
 if(!continuation)s.blockedSpellAt=-1;else if(s.blockedSpellAt===time)return 0;
 if(magic)s.magicHitAt=time;
 if(magic&&hasItem(hero,4401)){s.natureStacks=(s.natureUntil??0)>time?Math.min(8,(s.natureStacks??0)+1):1;s.natureUntil=time+7;if(s.natureStacks>=8){amount*=.8;buff(hero,4401,time+7,{percentMS:.1});}}
 if(source.kind==='hero'&&hasItem(hero,6333)&&!impact.startsWith('item-')&&impact!=='ignite'){
  const delayed=amount*.3;amount-=delayed;(hero.itemDots??=[]).push({key:6333,sourceId:source.id,until:time+3,dps:delayed/3,magic:false,trueDamage:true});
 }
 if(impact==='attack'&&hasItem(hero,3047))amount*=.9;
 if(hasItem(hero,2051)&&source.kind==='hero')amount=Math.max(0,amount-(impact.startsWith('item-')?3.75:15));
 if(critical&&hasItem(hero,3143))amount*=.7;
 if(impact==='attack'&&ownsAny(hero,[3082,3110,3143]))amount=Math.max(amount*.6,amount-(5+hero.maxHp*.0035));
 if(!['attack','ignite','item-true','item-magic','item-physical'].includes(impact)&&ownsAny(hero,[3102,3814,4632])&&(s.spellShieldCD??0)<=time){s.spellShieldCD=time+40;s.blockedSpellAt=time;return 0;}
 if(source.kind==='hero'&&hero.hp-amount<hero.maxHp*.3&&(s.lifelineCD??0)<=time){
  const maw=ownsAny(hero,[3155,3156]);
  if(hasItem(hero,2525)){s.lifelineCD=time+90;buff(hero,2525,time+5,{hp:hero.maxHp*.15,percentMS:.1,tenacity:.25});hero.potion={until:time+5,perSecond:hero.maxHp*.03};}
  if(hasItem(hero,3053)||hasItem(hero,6673)||maw&&magic){
   s.lifelineCD=time+90;addItemShield(hero,hasItem(hero,3053)?hero.maxHp*.3:hasItem(hero,6673)?300+15*(hero.level??1):hasItem(hero,3156)?200+equipmentStats(hero).ad*1.5:150,time+3,maw);
  }
 }
 hero.itemShields=(hero.itemShields??[]).filter(shield=>shield.until>time&&shield.amount>0);
 for(const shield of hero.itemShields){if(shield.magic&&!magic)continue;const absorbed=Math.min(amount,shield.amount);shield.amount-=absorbed;amount-=absorbed;}
 return amount;
}
function burn(target:Entity,hero:Entity,id:number,dps:number,time:number):void {
 target.itemDots=(target.itemDots??[]).filter(dot=>dot.sourceId!==hero.id||dot.key!==id);
 target.itemDots.push({key:id,sourceId:hero.id,dps,until:time+3,magic:true});
}
export function equipmentSpellProc(hero:Entity,impact:ImpactKind,time:number):number {
 if(impact==='attack'||impact.startsWith('item-')||impact==='ignite')return 0;
 const s=state(hero);if(!ownsAny(hero,[6655,3145])||(s.echoCD??0)>time)return 0;
 s.echoCD=time+10;return hasItem(hero,6655)?100+.1*(hero.abilityPower??0):50+.05*(hero.abilityPower??0);
}
export function equipmentTrueProc(hero:Entity,target:Entity,impact:ImpactKind,time:number):number {
 if(!hasItem(hero,2520)||impact.startsWith('item-')||impact==='ignite')return 0;
 const s=state(hero);
 if(target.kind==='hero'&&impact!=='attack'&&(s.breakerCD??0)<=time){s.breakerCD=time+8;return 50+.15*equipmentStats(hero).ad;}
 if(target.kind==='tower'&&impact==='attack'&&(s.sabotageUntil??0)>time){s.sabotageUntil=0;return 200+.5*equipmentStats(hero).ad;}
 return 0;
}
export function equipmentHit(match:Match,hero:Entity,target:Entity,impact:ImpactKind):void {
 if(hero.kind!=='hero'||target.kind==='tower'||impact.startsWith('item-')||impact==='ignite')return;
 const time=match.time,s=state(hero),t=state(target),spell=impact!=='attack',ap=hero.abilityPower??0;
 if(target.kind==='hero'&&(hero.lastHeroDamageAt??-Infinity)<time-5)s.combatSince=time;
 if(ownsAny(hero,[3123,3033,6609])&&!magicImpact(impact)||ownsAny(hero,[3916,3165])&&magicImpact(impact))target.grievousUntil=time+3;
 if(hasItem(hero,3071)&&!magicImpact(impact)){t.armorShred=Math.min(.3,(t.armorShred??0)+.06);t.shredUntil=time+6;}
 if(hasItem(hero,3116)&&spell)target.slowUntil=Math.max(target.slowUntil,time+1);
 if(hasItem(hero,6694)&&target.hp<target.maxHp*.5)target.slowUntil=Math.max(target.slowUntil,time+1);
 if(spell&&hasItem(hero,6653))burn(target,hero,6653,target.maxHp*.02,time);
 if(spell&&hasItem(hero,2503))burn(target,hero,2503,20+.02*ap,time);
 if(spell&&hasItem(hero,2508))burn(target,hero,2508,7,time);
 if(impact==='r'&&hasItem(hero,3118)){burn(target,hero,3118,25+.03*ap,time);t.mrShred=.1;t.mrShredUntil=time+3;}
 if(magicImpact(impact)&&hasItem(hero,8010)){t.mrShred=Math.min(.3,(t.mrShred??0)+.075);t.mrShredUntil=time+6;}
 if(spell&&hasItem(hero,3161)){s.shojinStacks=Math.min(4,(s.shojinStacks??0)+1);s.shojinUntil=time+6;}
 if((magicImpact(impact)||impact==='item-true')&&target.kind==='hero'&&hasItem(hero,4629))buff(hero,4629,time+4,{ms:20});
 if(target.kind==='hero'&&hasItem(hero,4646)&&(s.stormCD??0)<=time){
  if((s.stormWindow??0)<time){s.stormWindow=time+2.5;s.stormDamage=0;}
  s.stormDamage=(s.stormDamage??0)+Math.max(0,(t.beforeHitHP??target.hp)-target.hp);
  if(s.stormDamage>=target.maxHp*.25){s.stormCD=time+30;(target.itemBursts??=[]).push({sourceId:hero.id,at:time+2,amount:125+.1*ap});}
 }
 if((target.slowUntil>time||(target.airborneUntil??0)>time)&&target.kind==='hero'){
  if(hasItem(hero,2524))buff(hero,2524,time+4,{ms:20,as:.2});
  if(hasItem(hero,4005))t.mandateUntil=time+4;
 }
 if(s.chainAt===time){delete s.chainAt;let hits=0;for(const other of match.entities)if(other.id!==target.id&&other.team!==hero.team&&other.kind!=='tower'&&other.hp>0&&distance(other,target)<500*scale&&hits++<3)match.damage(hero,other,120,false,'item-magic',false);}
 if(impact==='attack'&&ownsAny(hero,[3077,3074,3748,6698,6631])){
  for(const victim of match.entities)if(victim.id!==target.id&&victim.kind!=='tower'&&victim.hp>0&&victim.team!==hero.team&&distance(victim,target)<=350*scale)match.damage(hero,victim,hero.damage*.4,false,'item-physical',false);
 }
 if(target.kind==='hero'){
  if(hasItem(hero,6692)){s.eclipseHits=(s.eclipseHits??0)+1;if(s.eclipseHits%2===0&&(s.eclipseCD??0)<=time){s.eclipseCD=time+6;addItemShield(hero,100+.4*equipmentStats(hero).ad,time+2);}}
  if(hasItem(hero,4628)&&spell&&distance(hero,target)>=600*scale)(hero.itemWards??=[]).push({...target,until:time+6,radius:1400*scale});
  if(hasItem(hero,6695))for(const shield of target.itemShields??[])shield.amount*=.5;
  if(hasItem(target,3076)||hasItem(target,3075)){
   if(attackImpact(impact)){hero.grievousUntil=time+3;match.damage(target,hero,(hasItem(target,3075)?10:4)+(target.armor??0)*.1,false,'item-magic',false);}
  }
 }
}
export function equipmentKill(hero:Entity,target:Entity,time:number):void {
 if(hero.kind!=='hero')return;const s=state(hero);
 if(target.kind==='hero'){
  if(hasItem(hero,6676))hero.gold=(hero.gold??0)+25;
  if(hasItem(hero,6333)){hero.itemDots=[];healFromItems(hero,hero.maxHp*.15,time);}
  if(hasItem(hero,6696))hero.abilities.r=time+Math.max(0,hero.abilities.r-time)*.8;
  if(hasItem(hero,6697)){s.permanentAD=(s.permanentAD??0)+2;refreshChampionStats(hero);}
  if(ownsAny(hero,[1082,3041])){s.permanentAP=(s.permanentAP??0)+(hasItem(hero,3041)?20:8);refreshChampionStats(hero);}
  if(hasItem(hero,2517))buff(hero,2517,time+5,{omnivamp:.2});
  if(hasItem(hero,2523)){s.c44Until=time+8;refreshChampionStats(hero);}
  if(hasItem(hero,2520))s.sabotageUntil=time+90;
 }else if(hasItem(hero,1083)&&(s.cull??0)<100){s.cull=(s.cull??0)+1;hero.gold=(hero.gold??0)+1;if(s.cull===100)hero.gold+=350;}
}
export function updateEquipmentEffects(match:Match,dt:number):void {
 const time=match.time;
 for(const target of match.entities){
  if(target.kind!=='hero'&&!target.itemDots?.length)continue;
  if(target.hp<=0)continue;
  const dots=target.itemDots??[];target.itemDots=dots.filter(dot=>dot.until>time);
  for(const dot of dots){const source=match.entity(dot.sourceId),overlap=Math.max(0,Math.min(dt,dot.until-(time-dt)));if(source&&overlap>0)match.damage(source,target,dot.dps*overlap,false,dot.trueDamage?'item-true':dot.magic?'item-magic':'item-physical',false);}
  if(target.kind!=='hero')continue;
  const s=state(target);s.clock=time;
  if((s.reviveAt??0)>0&&s.reviveAt<=time){s.reviveAt=0;target.hp=Math.min(target.maxHp,championStats(target.level??1).maxHp*.5);}
  if(s.combatSince===undefined||time-(target.lastHeroDamageAt??-Infinity)>5)s.combatSince=time;
  if((s.shojinUntil??0)<=time)s.shojinStacks=0;
  if((s.frozenUntil??0)>0&&s.frozenUntil<=time){s.frozenUntil=0;refreshChampionStats(target);}
  if((s.c44Until??0)>0&&s.c44Until<=time){s.c44Until=0;refreshChampionStats(target);}
  const buffs=target.itemBuffs??[];target.itemBuffs=buffs.filter(b=>b.until>time);if(buffs.length!==target.itemBuffs.length)refreshChampionStats(target);
  target.itemShields=(target.itemShields??[]).filter(shield=>shield.until>time&&shield.amount>0);
  target.itemWards=(target.itemWards??[]).filter(ward=>ward.until>time);
  if(target.potion){const overlap=Math.max(0,Math.min(dt,target.potion.until-(time-dt)));healFromItems(target,target.potion.perSecond*overlap,time);if(target.potion.until<=time)target.potion=undefined;}
  if(atShop(target)&&hasItem(target,2031))s['charges:2031']=2;
  const bursts=target.itemBursts??[];target.itemBursts=bursts.filter(burst=>burst.at>time);for(const burst of bursts)if(burst.at<=time){const source=match.entity(burst.sourceId);if(source)match.damage(source,target,burst.amount,false,'item-magic',false);}
  if(s.anchorUntil>0&&s.anchorUntil<=time){Object.assign(target,clampPoint({x:s.anchorX,y:s.anchorY},target.radius));s.anchorUntil=0;s['cd:4003']=s['cd:4004']=time+45;}
  const movement=Math.hypot(target.x-(s.lastX??target.x),target.y-(s.lastY??target.y));s.energized=Math.min(100,(s.energized??100)+movement*.15);s.lastX=target.x;s.lastY=target.y;
  if(hasItem(target,3742)){const previous=s.momentum??0;s.momentum=Math.min(100,previous+(movement>0?dt*20:0));if(Math.floor(previous/10)!==Math.floor(s.momentum/10))refreshChampionStats(target);}
  const rapid=hasItem(target,3094)&&s.energized>=100?1:0;if((hasItem(target,3094)||s.rapidRange===1)&&s.rapidRange!==rapid){s.rapidRange=rapid;refreshChampionStats(target);}
  if(hasItem(target,1056))healFromItems(target,dt*(time-(target.lastHeroDamageAt??-Infinity)<5?.9:.45),time);
  if(hasItem(target,2051))healFromItems(target,4*dt,time);
  if(hasItem(target,3112))healFromItems(target,3*dt,time);
  if(hasItem(target,3083)&&equipmentStats(target).hp>=2000&&time-(target.lastHeroDamageAt??-Infinity)>6)healFromItems(target,target.maxHp*.05*dt,time);
  if(hasItem(target,1054)&&time-(target.lastHeroDamageAt??-Infinity)<8)healFromItems(target,dt*1.6,time);
  if(hasItem(target,2504)&&time-(s.magicHitAt??-Infinity)>15&&(s.kaenicCD??0)<=time){s.kaenicCD=time+15;addItemShield(target,target.maxHp*.15,time+15,true);}
  if(hasItem(target,3072)&&target.hp>target.maxHp*.95&&(s.bloodShieldCD??0)<=time){s.bloodShieldCD=time+15;addItemShield(target,50+10*(target.level??1),time+15);}
  if((s.auraAt??0)<=time){
   s.auraAt=time+1;
   if(hasItem(target,6657)){
    s.rodBoughtAt??=time;const stacks=Math.min(10,Math.floor((time-s.rodBoughtAt)/60));
    if((s.rodStacks??0)!==stacks){s.rodStacks=stacks;buff(target,6657,Number.MAX_SAFE_INTEGER,{hp:10*stacks,mana:30*stacks,ap:3*stacks});if(stacks===10&&(target.level??1)<18)grantExperience(target,totalXPForLevel((target.level??1)+1)-(target.experience??0));}
   }
   if(hasItem(target,4633)&&time-(s.combatSince??time)>=4&&time-(target.lastHeroDamageAt??-Infinity)<5)buff(target,4633,time+1.5,{omnivamp:.1});
   if(hasItem(target,6665)&&time-(s.combatSince??time)>=5&&time-(target.lastHeroDamageAt??-Infinity)<5){const stats=equipmentStats(target);buff(target,6665,time+6,{armor:Math.max(0,stats.armor-(target.itemBuffs?.find(b=>b.id===6665)?.stats.armor??0))*.3,mr:Math.max(0,stats.mr-(target.itemBuffs?.find(b=>b.id===6665)?.stats.mr??0))*.3});}
   if(hasItem(target,3110))for(const enemy of match.entities)if(enemy.kind==='hero'&&enemy.team!==target.team&&distance(target,enemy)<=700*scale){state(enemy).frozenUntil=time+1.2;refreshChampionStats(enemy);}
   if((s.zekeUntil??0)>time)for(const enemy of match.entities)if(enemy.kind==='hero'&&enemy.team!==target.team&&distance(target,enemy)<=350*scale)match.damage(target,enemy,30,true,'item-magic',false);
   const aura=hasItem(target,3068)?15+equipmentStats(target).hp*.01:ownsAny(target,[6660,6664])?5+equipmentStats(target).hp*.005:0;
   if(aura>0)for(const enemy of match.entities)if(enemy.hp>0&&enemy.team!==target.team&&enemy.kind!=='tower'&&distance(enemy,target)<=325*scale)match.damage(target,enemy,aura,false,'item-magic',false);
   if(hasItem(target,2502)&&time-(target.lastHeroDamageAt??-Infinity)<5&&(s.drainAt??0)<=time){s.drainAt=time+5;for(const enemy of match.entities)if(enemy.kind==='hero'&&enemy.hp>0&&enemy.team!==target.team&&distance(enemy,target)<=650*scale){match.damage(target,enemy,30+target.maxHp*.03,false,'item-magic',false);healFromItems(target,60+target.maxHp*.06,time);}}
  }
 }
}

const SUPPORTED=new Set([1001,1004,1006,1011,1018,1026,1027,1028,1029,1031,1033,1036,1037,1038,1042,1043,1052,1053,1055,1057,1058,1082,1083,2019,2020,2021,2022,2501,2502,2503,2504,2508,2510,3003,3004,3006,3008,3009,3020,3024,3031,3033,3035,3036,3039,3040,3041,3042,3044,3046,3047,3051,3053,3057,3065,3066,3067,3068,3070,3071,3072,3074,3075,3076,3077,3078,3082,3083,3084,3086,3089,3091,3094,3095,3100,3102,3108,3111,3113,3114,3115,3116,3119,3121,3123,3124,3133,3134,3135,3137,3144,3145,3153,3155,3156,3158,3181,3302,3508,3748,3801,3802,3814,3916,4401,4628,4630,4632,6333,6609,6610,6631,6653,6655,6660,6662,6664,6670,6672,6673,6675,6676,6690,6692,6694,6695,6696,6697,6698]);
for(const id of [1054,1056,1086,1120,2051,2512,2517,2520,2523,2524,2525,2526,3026,3032,3050,3073,3087,3110,3112,3118,3147,3161,3165,3179,3742,4005,4629,4633,4645,4646,6621,6657,6665,6699,8010,8020])SUPPORTED.add(id);
export function equipmentImplementation(item:Item):string {
 if(item.condition)return `获取条件：${item.condition}`;
 if([3504,3109,6616,6617,6620].includes(item.id))return '基础属性生效。该装备的盟友协作效果需要另一名友方英雄；当前 1 对 1 Solo 没有可用的盟友目标，不触发协作效果。';
 if([2522,3803].includes(item.id))return '基础属性生效。亚索不消耗法力，因此额外法力消耗、基于法力消耗的回复与强化不会触发。';
 if(!item.effect)return '基础属性完整生效。';
 if(SUPPORTED.has(item.id)||item.active)return 'Solo 适配：基础属性、已接入的主动与战斗效果生效；范围、触发数值按本项目战斗尺度结算。';
 if(item.tags?.includes('Mana')||item.tags?.includes('ManaRegen'))return '基础属性生效。亚索无法力资源，法力回复不转化为剑意；端游专属机制尚未接入。';
 return '基础属性生效；下方为端游效果资料，该装备的专属机制尚未接入。';
}
