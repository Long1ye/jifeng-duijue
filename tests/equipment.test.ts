import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {BASES,BALANCE} from '../src/game/config';
import {grantExperience,skillCooldown,skillDamage} from '../src/game/ChampionProgression';
import {ITEMS,itemById} from '../src/game/ItemCatalog';
import {ECONOMY,purchasePlan} from '../src/game/Equipment';
import {yasuoCritStats} from '../src/game/YasuoPassive';
import {matchState,applyState,validCommand,executeCommand} from '../src/network/protocol';

function setup(){const m=new Match({league:true,ai:false,waves:false,random:()=>.99});m.start();const h=m.hero('blue');Object.assign(h,BASES.blue);return {m,h};}
function fund(){const s=setup();s.h.gold=20000;return s;}
describe('equipment transactions and economy',()=>{
 it('offers complete recipes with correct costs and fixed icon slots',()=>{
  expect(ITEMS).toHaveLength(229);expect(new Set(ITEMS.map(i=>i.id)).size).toBe(229);
  for(const item of ITEMS){for(const id of item.recipe)expect(itemById(id)).toBeDefined();expect(item.recipe.reduce((sum,id)=>sum+itemById(id)!.cost,0)).toBeLessThanOrEqual(item.cost);}
 });
 it('starts with 500 gold and six empty slots; purchases apply health and damage',()=>{
  const {m,h}=setup();expect(h.gold).toBe(500);expect(h.inventory).toEqual(Array(6).fill(null));
  expect(m.buyItem('blue',1055)).toBe(true);expect(h).toMatchObject({gold:50,damage:70,maxHp:670,hp:670});
  expect(m.buyItem('blue',1036)).toBe(false);expect(h.gold).toBe(50);
 });
 it('refuses distant, dead, paused, unknown and overflowing purchases atomically',()=>{
  const {m,h}=fund();Object.assign(h,{x:BASES.blue.x+BALANCE.fountainRadius+1});const before=JSON.stringify(h);
  expect(m.buyItem('blue',1036)).toBe(false);expect(JSON.stringify(h)).toBe(before);
  Object.assign(h,BASES.blue);h.hp=0;expect(m.buyItem('blue',1036)).toBe(false);h.hp=100;
  m.togglePause();expect(m.buyItem('blue',1036)).toBe(false);m.togglePause();expect(m.buyItem('blue',-1)).toBe(false);
  for(let i=0;i<6;i++)expect(m.buyItem('blue',1036)).toBe(true);
  const gold=h.gold;expect(m.buyItem('blue',1042)).toBe(false);expect(h.gold).toBe(gold);
 });
 it('consumes repeated and nested components once, including a full inventory upgrade',()=>{
  const {m,h}=fund();for(const id of [1001,1042,1042,1036,1036,1036])m.buyItem('blue',id);
  expect(purchasePlan(h,itemById(3006)!)).toMatchObject({cost:300,consumed:[0,1,2]});
  const gold=h.gold!;expect(m.buyItem('blue',3006)).toBe(true);expect(h.gold).toBe(gold-300);expect(h.inventory!.filter(Boolean)).toEqual([3006,1036,1036,1036]);
  const other=fund();other.m.buyItem('blue',1018);other.m.buyItem('blue',1042);
  expect(purchasePlan(other.h,itemById(3046)!).cost).toBe(1800);
  expect(other.m.buyItem('blue',3046)).toBe(true);expect(other.h.inventory!.filter(Boolean)).toEqual([3046]);
 });
 it('enforces boots and unique completed items while allowing their own recipe upgrades',()=>{
  const {m,h}=fund();expect(m.buyItem('blue',1001)).toBe(true);expect(m.buyItem('blue',1001)).toBe(false);
  expect(m.buyItem('blue',3006)).toBe(true);expect(m.buyItem('blue',1001)).toBe(false);
  expect(m.buyItem('blue',3031)).toBe(true);expect(m.buyItem('blue',3031)).toBe(false);
  expect(h.inventory!.filter(Boolean)).toEqual([3006,3031]);
 });
 it('sells only a valid owned slot at a fountain and restores derived stats',()=>{
  const {m,h}=setup();m.buyItem('blue',1055);expect(m.sellItem('blue',-1)).toBe(false);expect(m.sellItem('blue',.5)).toBe(false);expect(m.sellItem('blue',5)).toBe(false);
  Object.assign(h,{x:BASES.blue.x+100});expect(m.sellItem('blue',0)).toBe(false);Object.assign(h,BASES.blue);
  expect(m.sellItem('blue',0)).toBe(true);expect(h).toMatchObject({gold:230,maxHp:590,damage:60});expect(h.inventory).toEqual(Array(6).fill(null));
 });
 it('retains item stats on level up, does not revive dead heroes, and starts fresh on restart',()=>{
  const {m,h}=fund();m.buyItem('blue',1055);m.buyItem('blue',3006);h.hp=100;
  grantExperience(h,280);expect(h.maxHp).toBeCloseTo(749.2);expect(h.damage).toBeCloseTo(71.8);expect(h.hp).toBeCloseTo(179.2);expect(h.bonusAttackSpeed).toBeCloseTo(.3252);
  h.hp=0;grantExperience(h,380);expect(h.hp).toBe(0);
  expect(setup().h.inventory).toEqual(Array(6).fill(null));expect(setup().h.gold).toBe(500);
 });
 it('awards passive income only during play after its start, and CS gold exactly once',()=>{
  const {m,h}=setup();m.time=109;m.step(1);expect(h.gold).toBe(500);m.step(1);expect(h.gold).toBeCloseTo(502.04);
  m.togglePause();m.step(10);expect(h.gold).toBeCloseTo(502.04);m.togglePause();
  const victim=m.spawnMinion('red','ranged',h);m.damage(h,victim,99999);expect(h.gold).toBeCloseTo(516.04);m.damage(h,victim,99999);expect(h.gold).toBeCloseTo(516.04);
  const ally=m.spawnMinion('blue','melee',h),v=m.spawnMinion('red','ranged',h);m.damage(ally,v,99999);expect(h.gold).toBeCloseTo(516.04);
 });
 it('syncs inventories and gold and authenticates commands against the issuing team',()=>{
  const {m,h}=setup();const red=m.hero('red');Object.assign(red,BASES.red);
  expect(validCommand({kind:'buy',itemId:3031})).toBe(true);expect(validCommand({kind:'buy',itemId:99999})).toBe(false);expect(validCommand({kind:'sell',slot:NaN})).toBe(false);expect(validCommand({kind:'sell',slot:7})).toBe(false);
  expect(executeCommand(m,'red',{kind:'buy',itemId:1055})).toBe(true);expect(h.gold).toBe(500);expect(red.gold).toBe(50);
  expect(executeCommand(m,'red',{kind:'buy',itemId:3031})).toBe(false);
  const client=new Match();applyState(client,structuredClone(matchState(m)));expect(client.hero('red').inventory).toEqual(red.inventory);expect(client.hero('red').gold).toBe(50);
 });
});
describe('equipment combat integration',()=>{
 it('reduces Q cooldown with item attack speed and doubles item crit chance',()=>{
  const {m,h}=fund();h.skillRanks!.q=1;const cooldown=skillCooldown(h,'q');m.buyItem('blue',3006);m.buyItem('blue',3031);
  expect(skillCooldown(h,'q')).toBeLessThan(cooldown);expect(yasuoCritStats(h).chance).toBe(.5);
 });
 it('shows overflow crit as attack damage and applies bonus AD to Q, E and R once',()=>{
  const {m,h}=fund();Object.assign(h.skillRanks!,{q:1,e:1,r:1});
  m.buyItem('blue',3031);m.buyItem('blue',3046);m.buyItem('blue',1018);
  expect(yasuoCritStats(h).chance).toBe(1);expect(h.damage).toBeCloseTo(150);
  expect(skillDamage(h,'q')).toBeCloseTo(177.5);expect(skillDamage(h,'e')).toBeCloseTo(88);expect(skillDamage(h,'r')).toBeCloseTo(335);
  const target=m.hero('red');target.armor=0;const hp=target.hp;m.damage(h,target,h.damage,false,'attack',false);expect(target.hp).toBeCloseTo(hp-150);
 });
 it('adds infinity crit damage, and heals based on actual health damage rather than overkill',()=>{
  const {m,h}=fund(),target=m.hero('red');m.buyItem('blue',3031);target.armor=0;target.hp=target.maxHp=2000;
  m.damage(h,target,100,false,'attack',true);expect(target.hp).toBeCloseTo(2000-218.5);
  m.buyItem('blue',1053);h.hp=100;target.hp=10;m.damage(h,target,9999,false,'attack',false);expect(h.hp).toBeCloseTo(100.7);
 });
 it('applies bow on-hit and lifesteal to only the first Q target per cast',()=>{
  const {m,h}=fund();m.buyItem('blue',1043);m.buyItem('blue',1053);h.hp=100;h.qCast={startedAt:0,facing:0};
  const a=m.spawnMinion('red','melee',h),b=m.spawnMinion('red','melee',h);a.armor=b.armor=0;
  const hp=a.hp;m.damage(h,a,100,false,'q',false);m.damage(h,b,100,false,'q',false);
  expect(a.hp).toBeCloseTo(hp-115);expect(b.hp).toBeCloseTo(hp-100);expect(h.hp).toBeCloseTo(108.05);
 });
 it('does not reapply a tornado on-hit when another Q cast occurs during flight',()=>{
  const {m,h}=fund();m.buyItem('blue',1043);
  const a=m.spawnMinion('red','melee',h),b=m.spawnMinion('red','melee',h),c=m.spawnMinion('red','melee',h);a.armor=b.armor=c.armor=0;
  const hp=c.hp;m.damage(h,a,10,false,'q3',false,'q3:99');h.qCast={startedAt:1,facing:0};m.damage(h,b,10,false,'q',false);m.time=2;m.damage(h,c,10,false,'q3',false,'q3:99');expect(c.hp).toBe(hp-10);
 });
 it('applies ruined king current health damage and slow with cooldown, without critting on-hit',()=>{
  const {m,h}=fund(),target=m.hero('red');m.buyItem('blue',3153);target.armor=0;target.maxHp=target.hp=5000;h.hp=100;
  m.damage(h,target,100,false,'attack',true);expect(target.hp).toBeCloseTo(5000-190-400);expect(h.hp).toBeCloseTo(159);
  m.damage(h,target,1,false,'attack',false);m.damage(h,target,1,false,'attack',false);expect(target.slowUntil).toBe(1);
  m.time=2;for(let i=0;i<3;i++)m.damage(h,target,1,false,'attack',false);expect(target.slowUntil).toBe(1);
 });
 it('does not heal from shields, towers or ignite and blocks duplicate bow passive stacking',()=>{
  const {m,h}=fund(),target=m.hero('red');m.buyItem('blue',1053);m.buyItem('blue',1043);m.buyItem('blue',1043);h.hp=100;
  target.passiveShield=500;target.passiveShieldUntil=10;m.damage(h,target,100,false,'attack',false);expect(h.hp).toBe(100);
  m.damage(h,m.tower('red'),100,false,'attack',false);expect(h.hp).toBe(100);
  target.passiveShield=0;target.armor=0;const hp=target.hp;m.damage(h,target,1,false,'attack',false);expect(target.hp).toBe(hp-16);
  const own=h.hp;m.damage(h,target,10,false,'ignite',false);expect(h.hp).toBe(own);
 });
 it('caps attack speed and movement speed, and tower plates provide one bounty per threshold',()=>{
  const {m,h}=fund();m.buyItem('blue',3046);m.buyItem('blue',3086);m.buyItem('blue',3086);m.buyItem('blue',3086);m.buyItem('blue',3086);m.buyItem('blue',3086);grantExperience(h,1e6);
  expect(1/h.attackInterval).toBeLessThanOrEqual(2.5);
  const tower=m.tower('red');Object.assign(h,{x:tower.x,y:tower.y});tower.armor=0;tower.hp=tower.maxHp*.9+1;
  const gold=h.gold!;m.damage(h,tower,100,false,'q');expect(h.gold).toBe(gold+ECONOMY.plateGold);m.damage(h,tower,1,false,'q');expect(h.gold).toBe(gold+ECONOMY.plateGold);
 });
});
