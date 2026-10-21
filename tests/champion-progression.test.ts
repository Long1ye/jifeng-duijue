import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {championStats,growthFactor,grantExperience,totalXPForLevel,experienceProgress,canUpgradeSkill,skillDamage,skillCooldown,championKillExperience,LEAGUE_RULES} from '../src/game/ChampionProgression';
import {executeCommand,validCommand,matchState,applyState} from '../src/network/protocol';

function setup(){const m=new Match({league:true,ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:400,y:350});Object.assign(m.hero('red'),{x:800,y:500});return m;}
describe('LoL 26.20 champion progression without equipment',()=>{
 it('starts with real Yasuo stats and one unspent skill point',()=>{
  const m=setup(),h=m.hero('blue');
  expect(h).toMatchObject({hp:590,maxHp:590,damage:60,armor:32,magicResist:32,level:1,experience:0,skillPoints:1,critChance:0});
  expect(1/h.attackInterval).toBeCloseTo(.697);expect(h.speed/LEAGUE_RULES.worldScale).toBe(345);
  expect(m.cast('blue','q',{x:450,y:350})).toBe(false);
 });
 it('uses curved stat growth and grants health gained rather than fully healing',()=>{
  const m=setup(),h=m.hero('blue');h.hp=200;
  expect(growthFactor(2)).toBeCloseTo(.72);
  expect(grantExperience(h,280)).toBe(1);expect(h.level).toBe(2);
  expect(h.maxHp).toBeCloseTo(669.2);expect(h.hp).toBeCloseTo(279.2);
  expect(h.damage).toBeCloseTo(61.8);expect(h.skillPoints).toBe(2);
  expect(experienceProgress(h)).toEqual({current:0,required:380});
  grantExperience(h,660-280);expect(h.level).toBe(3);
  grantExperience(h,1e6);expect(h.level).toBe(18);expect(h.maxHp).toBe(2460);expect(h.damage).toBe(102.5);
  expect(h.armor).toBeCloseTo(110.2);expect(h.magicResist).toBeCloseTo(66.85);
  expect(experienceProgress(h)).toEqual({current:0,required:0});
  const hp=h.hp;grantExperience(h,100);expect(h.hp).toBe(hp);expect(h.skillPoints).toBe(18);
 });
 it('awards nearby XP even when an allied minion last hits and never awards it twice',()=>{
  const m=setup(),h=m.hero('blue'),ally=m.spawnMinion('blue','melee',{x:480,y:350});
  const victim=m.spawnMinion('red','melee',{x:500,y:350});
  m.damage(ally,victim,9999);expect(h.experience).toBe(62);expect(m.cs.blue).toBe(0);
  m.damage(ally,victim,9999);expect(h.experience).toBe(62);
  expect(m.hero('red').experience).toBe(0);
 });
 it('excludes out of range and dead spectators, but a distant last hit grants XP and CS',()=>{
  const m=setup(),h=m.hero('blue'),ally=m.spawnMinion('blue','melee',{x:900,y:350});
  const distant=m.spawnMinion('red','ranged',{x:h.x+LEAGUE_RULES.xpRadius+1,y:h.y});
  m.damage(ally,distant,9999);expect(h.experience).toBe(0);
  const lastHit=m.spawnMinion('red','ranged',{x:1000,y:600});
  m.damage(h,lastHit,9999);expect(h.experience).toBe(31);expect(m.cs.blue).toBe(1);
  h.hp=0;const v=m.spawnMinion('red','melee',{x:h.x+50,y:h.y});m.damage(ally,v,9999);expect(h.experience).toBe(31);
 });
 it('levels at 280 XP without requiring last hits, and cannot revive a dead last hitter',()=>{
  const m=setup(),h=m.hero('blue'),tower=m.tower('blue');
  for(const kind of ['melee','melee','melee','ranged','ranged','ranged','melee'] as const){
   const v=m.spawnMinion('red',kind,{x:h.x+50,y:h.y});
   for(let shot=0;shot<3;shot++)m.damage(tower,v,tower.damage);
  }
  expect(h.experience).toBe(341);expect(h.level).toBe(2);expect(m.cs.blue).toBe(0);
  h.hp=0;grantExperience(h,1e5);expect(h.hp).toBe(0);
 });
 it('enforces rank caps, skill point spending and R unlock levels',()=>{
  const m=setup(),h=m.hero('blue');expect(m.upgradeSkill('blue','r')).toBe(false);
  expect(m.upgradeSkill('blue','q')).toBe(true);expect(m.upgradeSkill('blue','q')).toBe(false);
  grantExperience(h,280);expect(canUpgradeSkill(h,'q')).toBe(false);expect(m.upgradeSkill('blue','e')).toBe(true);
  grantExperience(h,totalXPForLevel(6)-280);expect(m.upgradeSkill('blue','r')).toBe(true);
  expect(m.upgradeSkill('blue','r')).toBe(false);
  grantExperience(h,totalXPForLevel(11)-totalXPForLevel(6));expect(m.upgradeSkill('blue','r')).toBe(true);
  grantExperience(h,totalXPForLevel(16)-totalXPForLevel(11));expect(m.upgradeSkill('blue','r')).toBe(true);
  expect(m.upgradeSkill('blue','r')).toBe(false);
  while(m.upgradeSkill('blue','q')){}expect(h.skillRanks!.q).toBe(5);
  m.togglePause();expect(m.upgradeSkill('blue','w')).toBe(false);
 });
 it('applies armor, magic resistance, true damage and the passive shield in order',()=>{
  const m=setup(),h=m.hero('blue'),t=m.hero('red');t.armor=100;t.magicResist=50;
  m.damage(h,t,100);expect(t.hp).toBe(540);
  m.damage(h,t,150,false,'e');expect(t.hp).toBe(440);
  m.damage(h,t,100,false,'ignite');expect(t.hp).toBe(340);
  t.flow=100;m.damage(h,t,100);expect(t.hp).toBe(340);expect(t.passiveShield).toBe(75);
 });
 it('uses learned skill damage and attack speed for Q cooldown at each level',()=>{
  const m=setup(),h=m.hero('blue');m.upgradeSkill('blue','q');
  expect(skillDamage(h,'q')).toBe(83);expect(skillCooldown(h,'q')).toBe(4);
  const victim=m.spawnMinion('red','melee',{x:450,y:350});victim.speed=0;victim.damage=0;
  expect(m.cast('blue','q',victim)).toBe(true);m.step(.5);expect(victim.hp).toBe(victim.maxHp-83);
  grantExperience(h,totalXPForLevel(18));expect(skillCooldown(h,'q')).toBeCloseTo(2.6196);
  expect(h).toMatchObject(championStats(18));
 });
 it('regenerates only during play and AI spends its own legal skill points',()=>{
  const m=setup(),h=m.hero('blue');h.hp=300;m.step(1);expect(h.hp).toBeCloseTo(301.3);
  m.togglePause();m.step(10);expect(h.hp).toBeCloseTo(301.3);
  const ai=new Match({league:true,waves:false});ai.start();ai.step(1);
  expect(ai.hero('red').skillRanks!.q).toBe(1);expect(ai.hero('blue').skillRanks!.q).toBe(0);
 });
 it('serializes progression and accepts only server-owned legal upgrade commands',()=>{
  const m=setup();expect(validCommand({kind:'upgrade',ability:'q'})).toBe(true);
  expect(validCommand({kind:'upgrade',ability:'z'})).toBe(false);
  expect(executeCommand(m,'red',{kind:'upgrade',ability:'q'})).toBe(true);
  expect(m.hero('blue').skillRanks!.q).toBe(0);expect(executeCommand(m,'red',{kind:'upgrade',ability:'q'})).toBe(false);
  const client=new Match({ai:false,waves:false});applyState(client,structuredClone(matchState(m)));
  expect(client.leagueRules).toBe(true);expect(client.hero('red').skillRanks!.q).toBe(1);
  expect(client.hero('red').armor).toBe(32);
 });
 it('awards the level-dependent solo kill bounty before first blood ends the match',()=>{
  const m=setup(),h=m.hero('blue'),t=m.hero('red');
  expect(championKillExperience(h,t)).toBe(42);
  m.damage(h,t,99999);expect(h.experience).toBe(42);m.step(1/60);expect(m.phase).toBe('ended');
  for(const level of [6,18]){
   const n=setup(),a=n.hero('blue'),b=n.hero('red');
   grantExperience(a,totalXPForLevel(level));grantExperience(b,totalXPForLevel(level));
   expect(championKillExperience(a,b)).toBe(level===6?234:990);
  }
 });
 it('scales E damage on actual contacts and resets its stacks after five seconds',()=>{
  const m=setup(),h=m.hero('blue');m.upgradeSkill('blue','e');
  for(let i=0;i<5;i++){
   const v=m.spawnMinion('red','melee',{x:h.x+40,y:h.y});v.speed=0;v.damage=0;v.hp=v.maxHp=1000;
   const hp=v.hp;expect(m.cast('blue','e',v)).toBe(true);
   for(let tick=0;tick<80;tick++)m.step(1/120);
   expect(v.hp).toBeCloseTo(hp-70*(1+.25*Math.min(i,4)));
  }
  expect(h.eDamageStacks).toBe(4);
  m.step(5.1);
  const v=m.spawnMinion('red','melee',{x:h.x+40,y:h.y});v.speed=0;v.damage=0;v.hp=v.maxHp=1000;
  expect(m.cast('blue','e',v)).toBe(true);expect(h.eDamageStacks).toBe(0);
  for(let tick=0;tick<80;tick++)m.step(1/120);
  expect(v.hp).toBe(930);
 });
});
