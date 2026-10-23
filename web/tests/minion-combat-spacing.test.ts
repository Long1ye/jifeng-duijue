import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {BASES} from '../src/game/config';
import {distance} from '../src/game/geometry';
import {minionAttackSpot,minionHeroVisibility} from '../src/game/MinionLane';

describe('ordinary wave combat spacing',()=>{
 it('distributes fresh attackers across nearby enemies and preserves committed targets',()=>{
  const m=new Match({ai:false,waves:false});m.start();
  Object.assign(m.hero('blue'),{x:100,y:100});Object.assign(m.hero('red'),{x:900,y:600});
  const enemies=[-26,0,26].map(y=>{const e=m.spawnMinion('red','melee',{x:555,y:350+y});e.speed=0;e.damage=0;return e;});
  const allies=[-26,0,26].map((y,slot)=>{const u=m.spawnMinion('blue','melee',{x:500,y:350+y});u.formation={wave:1,slot,goal:{x:500,y:350+y}};return u;});
  m.step(.01);const targets=allies.map(u=>u.targetId);
  expect(new Set(targets).size).toBe(3);
  for(let i=0;i<30;i++)m.step(1/60);
  expect(allies.map(u=>u.targetId)).toEqual(targets);
  for(let i=0;i<allies.length;i++)for(let j=i+1;j<allies.length;j++)expect(distance(allies[i],allies[j])).toBeGreaterThan(24);
  expect(enemies.every(e=>e.hp>0)).toBe(true);
 });
 it('reserves different approach positions for attackers from successive waves',()=>{
  const m=new Match({ai:false,waves:false}),target=m.spawnMinion('red','ranged',{x:540,y:350});
  const allies=[1,2,3].map(wave=>{const u=m.spawnMinion('blue','ranged',{x:450,y:350});u.targetId=target.id;u.formation={wave,slot:3,goal:{x:450,y:350}};return u;});
  const spots=allies.map(u=>minionAttackSpot(u,target,BASES.blue,m.entities));
  for(let i=0;i<spots.length;i++)for(let j=i+1;j<spots.length;j++)expect(distance(spots[i],spots[j])).toBeGreaterThan(24);
 });
 it('queues extra melee attackers behind occupied positions around a single survivor',()=>{
  const m=new Match({ai:false,waves:false}),target=m.spawnMinion('red','melee',{x:540,y:350});
  const allies=Array.from({length:4},(_,slot)=>{const u=m.spawnMinion('blue','melee',{x:450,y:350});u.targetId=target.id;u.formation={wave:slot+1,slot:0,goal:{x:450,y:350}};return u;});
  const front=minionAttackSpot(allies[0],target,BASES.blue,m.entities),waiting=minionAttackSpot(allies[3],target,BASES.blue,m.entities);
  expect(distance(front,waiting)).toBeCloseTo(26);
  expect(distance(waiting,target)).toBeGreaterThan(allies[3].range+target.radius);
  allies[0].hp=0;
  expect(distance(minionAttackSpot(allies[3],target,BASES.blue,m.entities),target)).toBeLessThan(allies[3].range+target.radius);
 });
 it.each(['melee','ranged'] as const)('gives three %s attackers distinct reachable positions',kind=>{
  const m=new Match({ai:false,waves:false}),target=m.spawnMinion('red','melee',{x:540,y:350});
  const spots=[0,1,2].map(slot=>{
   const u=m.spawnMinion('blue',kind,{x:500,y:350});u.formation={wave:1,slot,goal:u};
   const spot=minionAttackSpot(u,target,BASES.blue);expect(distance(spot,target)).toBeLessThan(u.range+target.radius);return spot;
  });
  for(let i=1;i<spots.length;i++)expect(distance(spots[i],spots[i-1])).toBeGreaterThan(18);
 });
 it('keeps a hero readable while selected E targets remain fully visible',()=>{
  const m=new Match({ai:false,waves:false}),h=m.hero('blue');Object.assign(h,{x:500,y:350});
  const u=m.spawnMinion('red','melee',{x:504,y:360});
  expect(minionHeroVisibility(u,[h])).toBeLessThan(.7);
  expect(minionHeroVisibility(u,[h],true)).toBe(1);
  u.y=320;expect(minionHeroVisibility(u,[h])).toBe(1);
 });
});
