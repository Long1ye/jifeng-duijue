import {describe,it,expect} from 'vitest';
import {existsSync} from 'node:fs';
import {Match} from '../src/game/Match';
import {BASES,WORLD} from '../src/game/config';
import {ITEMS,itemById,itemOnMap,equipmentStats} from '../src/game/ItemCatalog';
import {purchaseError,purchasePlan} from '../src/game/Equipment';
import {skillDamage,skillCooldown,refreshChampionStats,grantExperience,totalXPForLevel} from '../src/game/ChampionProgression';
import {itemShieldRemaining,equipmentImplementation} from '../src/game/EquipmentEffects';
import {executeCommand,validCommand,matchState,applyState} from '../src/network/protocol';
import audit from '../docs/item-data/full-catalog-16.20.1.json';

function setup(){const m=new Match({league:true,ai:false,waves:false,random:()=>.99});m.start();const hero=m.hero('blue');Object.assign(hero,BASES.blue);hero.gold=100000;return {m,h:hero,t:m.hero('red')};}
function step(m:Match,seconds:number){for(let i=0;i<Math.round(seconds/WORLD.step);i++)m.step(WORLD.step);}
describe('complete 26.20 normal-mode item catalog',()=>{
 it('covers the audited roster with every local icon and an acyclic recipe graph',()=>{
  expect(ITEMS.map(i=>i.id).sort((a,b)=>a-b)).toEqual([...audit.ids].sort((a,b)=>a-b));expect(ITEMS).toHaveLength(229);
  const visit=(id:number,path:number[])=>{expect(path).not.toContain(id);const item=itemById(id);expect(item).toBeDefined();for(const part of item!.recipe)visit(part,[...path,id]);};
  for(const item of ITEMS){visit(item.id,[]);expect(existsSync(`assets/ui/league-items-16.20.1/${item.id}.png`)).toBe(true);expect(equipmentImplementation(item)).not.toContain('尚未接入');}
 });
 it('every unrestricted on-map item can be bought with correct pricing and slot rules',()=>{
  for(const item of ITEMS.filter(i=>!i.condition&&itemOnMap(i))){
   const {m,h}=setup();grantExperience(h,totalXPForLevel(18));const before=h.gold!;
   expect(m.buyItem('blue',item.id),item.name).toBe(true);expect(h.gold,item.name).toBe(before-item.cost);
   if(item.category==='饰品')expect(h.trinket).toBe(item.id);
   else if(!['elixir','hat'].includes(item.active??''))expect(h.inventory).toContain(item.id);
   expect(h.inventory).toHaveLength(6);for(const value of Object.values(equipmentStats(h)))expect(Number.isFinite(value)).toBe(true);
  }
 });
 it('rejects every conditional or wrong-map item without spending gold',()=>{
  for(const item of ITEMS.filter(i=>i.condition||!itemOnMap(i))){const {m,h}=setup();expect(m.buyItem('blue',item.id),item.name).toBe(false);expect(h.gold).toBe(100000);}
 });
 it('enforces lifeline and penetration exclusivity, but permits consuming the matching component',()=>{
  const {m,h}=setup();m.buyItem('blue',3155);expect(m.buyItem('blue',6673)).toBe(false);expect(m.buyItem('blue',3156)).toBe(true);expect(h.inventory).not.toContain(3155);
  m.buyItem('blue',3035);expect(purchasePlan(h,itemById(3036)!).cost).toBe(1850);expect(m.buyItem('blue',3036)).toBe(true);expect(m.buyItem('blue',3033)).toBe(false);
 });
 it('applies AP, MR, haste and percent penetration to real combat and preserves the Flow resource',()=>{
  const {m,h,t}=setup();Object.assign(h.skillRanks!,{q:1,w:1,e:1,r:1});const e=skillDamage(h,'e'),w=skillCooldown(h,'w');
  m.buyItem('blue',3135);m.buyItem('blue',1057);m.buyItem('blue',3108);m.buyItem('blue',3089);
  expect(h.abilityPower).toBeCloseTo((95+25+130)*1.3);expect(h.magicResist).toBe(77);expect(skillDamage(h,'e')).toBeGreaterThan(e);expect(skillCooldown(h,'w')).toBeLessThan(w);expect(h.maxMana).toBe(0);
  t.magicResist=100;const hp=t.hp;m.damage(h,t,100,false,'e',false);expect(t.hp).toBeCloseTo(hp-100/1.6);
 });
 it('uses consumables, frees their slot, limits healing to elapsed duration and respects grievous wounds',()=>{
  const {m,h}=setup();m.buyItem('blue',2003);h.hp=200;Object.assign(h,{x:BASES.blue.x+120});h.healthRegen=0;
  expect(m.useItem('blue',0,h)).toBe(true);expect(h.inventory![0]).toBeNull();expect(m.useItem('blue',0,h)).toBe(false);
  step(m,15.5);expect(h.hp).toBeCloseTo(320,4);expect(h.potion).toBeUndefined();
  Object.assign(h,BASES.blue);m.buyItem('blue',2003);Object.assign(h,{x:BASES.blue.x+120});h.healthRegen=0;h.hp=200;h.grievousUntil=m.time+20;m.useItem('blue',0,h);step(m,15.5);expect(h.hp).toBeCloseTo(272,4);
 });
 it('refills reusable potion charges only at the shop',()=>{
  const {m,h}=setup();m.buyItem('blue',2031);Object.assign(h,{x:BASES.blue.x+120});h.hp=100;
  m.useItem('blue',0,h);step(m,12.2);m.useItem('blue',0,h);step(m,12.2);expect(m.useItem('blue',0,h)).toBe(false);expect(h.itemState!['charges:2031']).toBe(0);
  Object.assign(h,BASES.blue);step(m,.1);expect(h.itemState!['charges:2031']).toBe(2);
 });
 it('buys an elixir with a full inventory and expires its buff without reviving the hero',()=>{
  const {m,h}=setup();expect(m.buyItem('blue',2138)).toBe(false);grantExperience(h,totalXPForLevel(9));
  for(let i=0;i<6;i++)m.buyItem('blue',1036);const hp=h.maxHp;expect(m.buyItem('blue',2138)).toBe(true);expect(h.maxHp).toBe(hp+300);expect(h.inventory!.filter(Boolean)).toHaveLength(6);
  m.time=181;m.step(WORLD.step);expect(h.maxHp).toBe(hp);expect(h.itemBuffs).toEqual([]);
 });
 it('stasis blocks attacks, damage and ability casts, and is limited by cooldown',()=>{
  const {m,h,t}=setup();m.buyItem('blue',3157);h.skillRanks!.q=1;h.hp=200;
  expect(m.useItem('blue',0,h)).toBe(true);m.damage(t,h,9999,false,'ignite');expect(h.hp).toBe(200);expect(m.cast('blue','q',t)).toBe(false);expect(m.useItem('blue',0,h)).toBe(false);
  m.time=3;m.damage(t,h,20,false,'ignite');expect(h.hp).toBe(180);
 });
 it('active shields absorb damage and expire; shields are distinct from Yasuo Flow',()=>{
  const {m,h,t}=setup();m.buyItem('blue',3190);h.flow=0;expect(m.useItem('blue',0,h)).toBe(true);
  const shield=itemShieldRemaining(h,m.time),hp=h.hp;expect(shield).toBeGreaterThan(0);m.damage(t,h,100,false,'ignite');expect(h.hp).toBe(hp);expect(itemShieldRemaining(h,m.time)).toBe(shield-100);
  m.time=3;m.step(WORLD.step);expect(itemShieldRemaining(h,m.time)).toBe(0);expect(h.flow).toBe(0);
 });
 it('keeps trinkets outside the six slots and preserves their shared cooldown across swaps',()=>{
  const {m,h}=setup();for(let i=0;i<6;i++)m.buyItem('blue',1036);
  expect(m.buyItem('blue',3340)).toBe(true);expect(h.inventory!.filter(Boolean)).toHaveLength(6);expect(m.useItem('blue',6,{x:h.x+40,y:h.y})).toBe(true);expect(h.itemWards).toHaveLength(1);
  expect(m.buyItem('blue',3364)).toBe(true);expect(m.useItem('blue',6,h)).toBe(false);
 });
 it('guardian angel prevents the first-blood claim and revives exactly once per cooldown',()=>{
  const {m,h,t}=setup();m.buyItem('blue',3026);Object.assign(h,{x:400,y:350});Object.assign(t,{x:900,y:500});h.healthRegen=0;
  m.damage(t,h,99999,false,'ignite');expect(h.hp).toBe(1);expect(m.deaths.blue).toBe(0);step(m,4.1);expect(h.hp).toBeCloseTo(295);expect(m.phase).toBe('playing');
  m.damage(t,h,99999,false,'ignite');m.step(WORLD.step);expect(m.deaths.blue).toBe(1);expect(m.phase).toBe('ended');
 });
 it('Nashor on-hit magic damage is not multiplied by a physical critical strike',()=>{
  const {m,h,t}=setup();m.buyItem('blue',3115);t.armor=t.magicResist=0;const hp=t.hp;
  m.damage(h,t,100,false,'attack',true);expect(t.hp).toBeCloseTo(hp-190-15-.15*h.abilityPower!);
 });
 it('cleave damages nearby enemies once and cannot recursively retrigger itself',()=>{
  const {m,h}=setup();m.buyItem('blue',3074);const a=m.spawnMinion('red','melee',h),b=m.spawnMinion('red','melee',{x:h.x+20,y:h.y});a.armor=b.armor=0;const hp=b.hp;
  m.damage(h,a,10,false,'attack',false);expect(b.hp).toBeCloseTo(hp-h.damage*.4);
 });
 it('authority validates active slots and finite aim, and snapshots include all new state',()=>{
  const {m,h}=setup();expect(validCommand({kind:'use-item',slot:0,point:{x:1,y:NaN}})).toBe(false);expect(validCommand({kind:'use-item',slot:7,point:h})).toBe(false);expect(validCommand({kind:'use-item',slot:6,point:h})).toBe(true);
  m.buyItem('blue',3157);expect(executeCommand(m,'blue',{kind:'use-item',slot:0,point:h})).toBe(true);expect(executeCommand(m,'red',{kind:'use-item',slot:0,point:h})).toBe(false);
  const client=new Match();applyState(client,JSON.parse(JSON.stringify(matchState(m))));expect(client.hero('blue').stasisUntil).toBe(h.stasisUntil);expect(client.hero('blue').itemState).toEqual(h.itemState);
 });
 it('stat refresh does not stack item bonuses or invalidate HP when repeated',()=>{
  const {m,h}=setup();m.buyItem('blue',3089);m.buyItem('blue',2501);const stats={hp:h.maxHp,ad:h.damage,ap:h.abilityPower};for(let i=0;i<50;i++)refreshChampionStats(h);expect({hp:h.maxHp,ad:h.damage,ap:h.abilityPower}).toEqual(stats);expect(purchaseError(h,3089)).toBeTruthy();
 });
});
