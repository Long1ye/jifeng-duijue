import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {LEAGUE_RULES} from '../src/game/ChampionProgression';
import {LANE_STATS,minionStats,initializeLaneUnit,updateOuterTurret,resolveTowerPlates} from '../src/game/LaneStats';
import {minionMovementSpeed} from '../src/game/MinionLane';
import {MINION_PACING} from '../src/game/MinionPacing';
import {applyState,matchState} from '../src/network/protocol';

function setup(){const m=new Match({league:true,ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:400,y:350});Object.assign(m.hero('red'),{x:900,y:500});return m;}
describe('26.20 existing lane minions and outer turrets',()=>{
 it('never creates plates or Bulwark on Howling Abyss, including lethal and repeated hits',()=>{
  const m=setup(),t=m.tower('red');initializeLaneUnit(t,0,true);
  expect(t.towerHasPlates).toBe(false);expect(t.towerPlates).toBeUndefined();
  for(const ratio of [.9,.75,.55,.3,0]){
   t.hp=t.maxHp*ratio;resolveTowerPlates(t,m.entities,1);
   expect(t.towerPlates).toBeUndefined();expect(t.towerBulwarks).toEqual([]);expect(t.armor).toBe(60);
  }
  const client=setup();applyState(client,structuredClone(matchState(m)));
  expect(client.tower('red').towerHasPlates).toBe(false);
  expect(client.tower('red').towerPlates).toBeUndefined();
 });
 it('spawns current melee and caster stats with matching units and no prototype march boost',()=>{
  const m=setup();
  for(const kind of ['melee','ranged'] as const){
   const v=m.spawnMinion('red',kind,{x:500,y:350});
   expect(v.hp).toBe(kind==='melee'?465:284);expect(v.damage).toBe(kind==='melee'?12:21);
   expect(1/v.attackInterval).toBeCloseTo(LANE_STATS[kind].attackSpeed);
   expect(v.speed).toBeCloseTo(MINION_PACING.speed);
   expect(v.range).toBeCloseTo(LANE_STATS[kind].range*LEAGUE_RULES.worldScale);
   v.formation={wave:1,slot:0,goal:{x:600,y:350}};expect(minionMovementSpeed(v,false)).toBe(v.speed);
  }
 });
 it('snapshots spawn-time upgrades, caps late stats and never heals an old wave',()=>{
  const m=setup(),old=m.spawnMinion('red','melee',{x:500,y:350});old.hp=100;
  m.time=90;const next=m.spawnMinion('red','melee',{x:550,y:350});
  expect(next.hp).toBe(500);expect(old.hp).toBe(100);expect(old.maxHp).toBe(465);
  expect(minionStats('melee',450)).toMatchObject({damage:19.4,armor:1});
  expect(minionStats('ranged',450).damage).toBe(31.5);
  expect(minionStats('melee',10000)).toMatchObject({maxHp:1550,armor:20,damage:80});
  expect(minionStats('ranged',10000)).toMatchObject({maxHp:600,armor:0,damage:125});
 });
 it('uses minion current-health on-hit damage only against other minions',()=>{
  for(const kind of ['melee','ranged'] as const){
   const m=setup(),a=m.spawnMinion('blue',kind,{x:400,y:350}),b=m.spawnMinion('red','melee',{x:450,y:350});
   const hp=b.hp;m.damage(a,b,a.damage);
   expect(b.hp).toBeCloseTo(hp-a.damage-hp*LANE_STATS[kind].onHit);
   const h=m.hero('red'),before=h.hp;m.damage(a,h,a.damage);
   expect(h.hp).toBeCloseTo(before-a.damage*.55/1.32);
  }
 });
 it('takes three turret shots for melee and two for caster minions',()=>{
  const m=setup(),tower=m.tower('blue');
  for(const kind of ['melee','ranged'] as const){
   const v=m.spawnMinion('red',kind,{x:450,y:350}),fraction=kind==='melee'?.45:.7;
   m.damage(tower,v,tower.damage);expect(v.hp).toBeCloseTo(v.maxHp*(1-fraction));
   m.damage(tower,v,tower.damage);expect(v.hp>0).toBe(kind==='melee');
   if(v.hp>0)m.damage(tower,v,tower.damage);expect(v.hp).toBe(0);
  }
 });
 it('applies turret armor penetration and champion heat without double mitigation',()=>{
  const m=setup(),tower=m.tower('red'),h=m.hero('blue');h.hp=h.maxHp=10000;h.armor=100;
  for(const multiplier of [1,1.5,2,2.5,2.5]){
   const hp=h.hp;m.damage(tower,h,tower.damage);expect(hp-h.hp).toBeCloseTo(tower.damage*multiplier/1.7);
  }
  m.time=5;const hp=h.hp;m.damage(tower,h,tower.damage);expect(hp-h.hp).toBeCloseTo(tower.damage/1.7);
 });
 it('initializes 9000 HP outer turrets and updates AD and both resistances by game time',()=>{
  const m=setup(),t=m.tower('red');expect(t).toMatchObject({hp:9000,maxHp:9000,armor:60,magicResist:60,damage:182,towerPlates:0});
  expect(t.range).toBeCloseTo(750*LEAGUE_RULES.worldScale);expect(1/t.attackInterval).toBeCloseTo(.833);
  t.hp=8000;updateOuterTurret(t,660);expect(t.armor).toBe(45);expect(t.magicResist).toBe(45);
  updateOuterTurret(t,840);expect(t.damage).toBe(350);expect(t.armor).toBe(0);expect(t.hp).toBe(8000);
 });
 it('removes the old flat tower multiplier, applies melee bonus and backdoor protection',()=>{
  const m=setup(),h=m.hero('blue'),t=m.tower('red');
  Object.assign(h,{x:t.x-60,y:t.y});let hp=t.hp;
  m.damage(h,t,100);expect(hp-t.hp).toBeCloseTo(100*1.2*.2/1.6);
  const wave=m.spawnMinion('blue','melee',{x:t.x-80,y:t.y});hp=t.hp;
  m.damage(h,t,100);expect(hp-t.hp).toBeCloseTo(100*1.2/1.6);
  hp=t.hp;m.damage(wave,t,100);expect(hp-t.hp).toBeCloseTo(100*.6/1.6);
  wave.hp=0;m.time=3.01;hp=t.hp;m.damage(h,t,100);expect(hp-t.hp).toBeCloseTo(100*1.2*.2/1.6);
 });
 it('keeps unequal plates permanently and expires each Bulwark independently',()=>{
  const m=setup(),t=m.tower('red');Object.assign(m.hero('blue'),{x:t.x-50,y:t.y});
  t.hp=8100;resolveTowerPlates(t,m.entities,1);expect(t.towerPlates).toBe(1);expect(t.armor).toBe(90);
  t.hp=6750;resolveTowerPlates(t,m.entities,10);expect(t.towerPlates).toBe(2);expect(t.armor).toBe(120);
  updateOuterTurret(t,21);expect(t.armor).toBe(90);updateOuterTurret(t,30);expect(t.armor).toBe(60);
  updateOuterTurret(t,900);expect(t.towerPlates).toBe(2);expect(t.armor).toBe(0);
 });
 it('uses the same attack-start cadence as the advertised attack speed',()=>{
  const m=setup(),a=m.spawnMinion('blue','melee',{x:450,y:350}),b=m.spawnMinion('red','melee',{x:480,y:350});
  a.speed=b.speed=0;b.hp=b.maxHp=10000;b.damage=0;
  let previous=0;const releases:number[]=[];
  for(let i=0;i<240;i++){m.step(1/120);if(a.attacksReleased!==previous){releases.push(m.time);previous=a.attacksReleased;}}
  expect(releases.length).toBeGreaterThan(1);expect(releases[1]-releases[0]).toBeCloseTo(.8,1);
 });
 it('synchronizes lane stats, plates and attack heat to the other client and resets in a new match',()=>{
  const m=setup(),t=m.tower('red');t.hp=8100;resolveTowerPlates(t,m.entities,1);m.damage(t,m.hero('blue'),1);
  const v=m.spawnMinion('red','ranged',{x:500,y:350});
  const client=setup();applyState(client,structuredClone(matchState(m)));
  expect(client.entity(v.id)).toMatchObject({hp:284,damage:21,armor:0});
  expect(client.tower('red').towerPlates).toBe(1);expect(client.tower('red').towerHeat).toBe(1);
  expect(setup().tower('red')).toMatchObject({hp:9000,towerPlates:0,towerBulwarks:[]});
 });
});
