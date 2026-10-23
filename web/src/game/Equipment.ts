import type {Entity,ImpactKind} from './types';
import {BALANCE,BASES,HOWLING_MAP} from './config';
import {sanctuaryShopPoint,SANCTUARY_SHOP_RADIUS} from './SanctuaryLayout';
import {distance} from './geometry';
import {refreshChampionStats} from './ChampionProgression';
import {equipmentStats,hasItem,itemById,itemOnMap,type Item} from './ItemCatalog';
import {extendedOnHit} from './EquipmentEffects';

export const ECONOMY={startingGold:500,passiveStart:110,goldPerSecond:2.04,meleeGold:21,rangedGold:14,killGold:400,plateGold:125} as const;
export const atShop=(hero:Entity)=>hero.hp>0&&(distance(hero,BASES[hero.team])<=BALANCE.fountainRadius
 ||HOWLING_MAP&&distance(hero,sanctuaryShopPoint(hero.team))<=SANCTUARY_SHOP_RADIUS);
/** Consume each owned component at most once, recursively, including repeated recipe ids. */
export function purchasePlan(hero:Entity,item:Item){
 const remaining=[...(hero.inventory??Array(6).fill(null))] as (number|null)[],consumed:number[]=[];
 let credit=0;
 const consume=(id:number)=>{
  const slot=remaining.indexOf(id);
  if(slot>=0){remaining[slot]=null;consumed.push(slot);credit+=itemById(id)!.cost;return;}
  itemById(id)?.recipe.forEach(consume);
 };
 item.recipe.forEach(consume);
 return {remaining,consumed,cost:Math.max(0,item.cost-credit)};
}
export function purchaseError(hero:Entity,id:number):string|null {
 const item=itemById(id);if(!item)return '装备不存在';
 if(item.condition)return item.condition;
 if(!itemOnMap(item))return '该装备仅在另一张地图开放';
 if(item.minLevel&&(hero.level??1)<item.minLevel)return `需要英雄等级 ${item.minLevel}`;
 if(!atShop(hero))return '返回己方泉水或圣所商店后可购买';
 const plan=purchasePlan(hero,item);
 if(item.groups?.some(group=>plan.remaining.some(id=>id!==null&&itemById(id)?.groups?.includes(group))))return '与已拥有装备的唯一效果组冲突';
 if(id===2031&&hasItem(hero,id))return '已拥有复用型药水';
 if(item.unique&&plan.remaining.some(id=>{const owned=id===null?undefined:itemById(id);return owned&&(item.unique==='legendary'?owned.id===item.id:owned.unique===item.unique);}))return item.unique==='boots'?'只能拥有一双鞋子':'已拥有该唯一装备';
 if(!plan.remaining.includes(null)&&item.category!=='饰品'&&!['elixir','hat'].includes(item.active??''))return '装备栏已满，先出售或合成';
 if((hero.gold??0)+1e-8<plan.cost)return `还需 ${Math.ceil(plan.cost-(hero.gold??0))} 金币`;
 return null;
}
export function buyItem(hero:Entity,id:number,time=hero.itemState?.clock??0):boolean {
 if(purchaseError(hero,id))return false;
 const item=itemById(id)!,plan=purchasePlan(hero,item),slot=plan.remaining.indexOf(null);
 hero.gold=Math.max(0,(hero.gold??0)-plan.cost);
 if(item.category==='饰品'){hero.trinket=id;return true;}
 if(item.active==='elixir'){
  hero.itemBuffs=(hero.itemBuffs??[]).filter(buff=>![2138,2139,2140].includes(buff.id));
  hero.itemBuffs.push({id,until:time+180,stats:id===2138?{hp:300,tenacity:.25}:id===2139?{ap:50,manaRegen:.5}:{ad:30,omnivamp:.12}});
 }else if(item.active==='hat')hero.itemState={...hero.itemState,hats:(hero.itemState?.hats??0)+1};
 else {plan.remaining[slot]=id;hero.inventory=plan.remaining;}
 if(item.charges)hero.itemState={...hero.itemState,[`charges:${id}`]:item.charges};
 refreshChampionStats(hero);return true;
}
export function sellItem(hero:Entity,slot:number):boolean {
 if(!atShop(hero)||!Number.isInteger(slot)||slot<0||slot>6)return false;
 const id=slot===6?hero.trinket:hero.inventory?.[slot],item=id==null?undefined:itemById(id);if(!item)return false;
 if(slot===6)hero.trinket=null;else hero.inventory![slot]=null;
 hero.gold=(hero.gold??0)+item.sell;refreshChampionStats(hero);return true;
}
/** Q applies on-hit and lifesteal to only its first contacted target per cast. */
export function itemContact(hero:Entity,target:Entity,impact:ImpactKind,time:number,castKey?:string):{onHit:number;magic:number;lifesteal:number;omnivamp:number}{
 const stats=equipmentStats(hero),q=['q','q3','eq','eq3'].includes(impact);
 let eligible=impact==='attack'||q;
 if(q){const cast=impact==='q'?hero.qCast:impact==='q3'?hero.q3Cast:hero.eqCast;
  const key=castKey??`${impact}:${cast?.startedAt??time}`;
  if(hero.itemHitCasts?.includes(key))eligible=false;
  else hero.itemHitCasts=[...(hero.itemHitCasts??[]).slice(-7),key];
 }
 if(target.kind==='tower')return {onHit:0,magic:0,lifesteal:0,omnivamp:0};
 let onHit=0,magic=0;
 if(eligible){
  if(hasItem(hero,1043))onHit+=15;
  if(hasItem(hero,3153)){
   onHit+=Math.min(target.hp*.08,target.kind==='hero'?Infinity:60);
   if(target.kind==='hero'){
    let tracker=hero.ruinedKing;
    if(!tracker||tracker.targetId!==target.id||tracker.expiresAt<time)tracker={targetId:target.id,hits:0,expiresAt:time+6,cooldownUntil:tracker?.cooldownUntil??0};
    tracker.hits++;tracker.expiresAt=time+6;
    if(tracker.hits>=3&&time>=tracker.cooldownUntil){target.slowUntil=Math.max(target.slowUntil,time+1);tracker.hits=0;tracker.cooldownUntil=time+15;}
    hero.ruinedKing=tracker;
   }
  }
  const extra=extendedOnHit(hero,target,time);onHit+=extra.physical;magic+=extra.magic;
 }
 return {onHit,magic,lifesteal:eligible?stats.lifesteal:0,omnivamp:impact==='ignite'?0:stats.omnivamp*(q||impact==='e'||impact==='r'?1/3:1)};
}
