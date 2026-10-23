import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {createMinionPractice} from '../src/game/MinionPractice';
import {MINION_LANE,minionLaneSlot} from '../src/game/MinionLane';
import {ABILITIES,BALANCE} from '../src/game/config';
import {distance} from '../src/game/geometry';

describe('minions serve hero interaction',()=>{
 it('supports a real entry, hero dash and a different minion as the exit',()=>{
  const m=createMinionPractice();m.start();const h=m.hero('blue'),enemy=m.hero('red');
  const entry=m.entities.find(e=>e.team==='red'&&e.kind==='melee'&&distance(h,e)<=ABILITIES.e.range)!;
  const advance=()=>{for(let i=0;i<75;i++)m.step(1/60);};
  expect(m.cast('blue','e',entry)).toBe(true);advance();
  expect(m.cast('blue','e',enemy)).toBe(true);advance();
  const exit=m.entities.filter(e=>e.team==='red'&&(e.kind==='melee'||e.kind==='ranged')&&e.id!==entry.id&&e.hp>0&&m.dashError(e)===null)
   .sort((a,b)=>distance(b,enemy)-distance(a,enemy))[0];
  expect(exit).toBeDefined();const before=distance(h,enemy);
  expect(m.cast('blue','e',exit)).toBe(true);advance();expect(distance(h,enemy)).toBeGreaterThan(before);
 });
 it('provides separated front/back E anchors and a route towards the enemy hero',()=>{
  const m=createMinionPractice();m.start();const h=m.hero('blue');
  const targets=m.entities.filter(e=>e.team==='red'&&e.kind==='melee');
  const entry=targets.find(e=>distance(h,e)<=ABILITIES.e.range)!;
  expect(entry).toBeDefined();expect(m.cast('blue','e',entry)).toBe(true);
  for(let i=0;i<48;i++)m.step(1/60);
  const exits=m.entities.filter(e=>e.hp>0&&e.team==='red'&&e.id!==entry.id&&e.kind!=='tower'&&distance(h,e)<=ABILITIES.e.range);
  expect(exits.length).toBeGreaterThan(0);
  expect(m.dashError(entry)).toContain('暂时不能');
 });
 it('allows an E/EQ to leave a frontline finisher and kill a fragile backliner',()=>{
  expect(BALANCE.melee.hp-ABILITIES.e.damage-ABILITIES.q.damage).toBeGreaterThan(0);
  expect(BALANCE.melee.hp-ABILITIES.e.damage-ABILITIES.q.damage).toBeLessThan(BALANCE.hero.damage);
  expect(BALANCE.ranged.hp).toBeLessThan(ABILITIES.e.damage+ABILITIES.q.damage);
  const front=minionLaneSlot({x:500,y:350},{x:1,y:0},0),back=minionLaneSlot({x:500,y:350},{x:1,y:0},3);
  expect(distance(front,back)).toBe(MINION_LANE.backline);
  expect(distance(front,back)).toBeLessThan(ABILITIES.e.range);
 });
 it('punishes a nearby hero trade briefly and abandons a retreating hero',()=>{
  const m=new Match({ai:false,waves:false});m.start();const h=m.hero('blue'),enemy=m.hero('red');
  Object.assign(h,{x:500,y:350});Object.assign(enemy,{x:540,y:350});
  const guard=m.spawnMinion('red','ranged',{x:530,y:380}),opponent=m.spawnMinion('blue','melee',{x:525,y:380});
  guard.formation={wave:99,slot:3,goal:{x:530,y:380}};guard.speed=0;opponent.speed=0;opponent.damage=0;
  m.damage(h,enemy,1);m.step(.01);expect(guard.targetId).toBe(h.id);
  h.x=750;m.step(.01);expect(guard.targetId).toBe(opponent.id);
 });
});
