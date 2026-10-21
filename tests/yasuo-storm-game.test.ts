import {describe,it,expect} from 'vitest';
import {createRPractice} from '../src/game/RPractice';
import {createEPractice} from '../src/game/EPractice';
import {clearStorm,grantStorm,stormReady,STORM} from '../src/game/YasuoStorm';
import {ABILITIES} from '../src/game/config';
import type {Match} from '../src/game/Match';
function advance(m:Match,t:number){for(let i=0;i<Math.round(t*120);i++)m.step(1/120);}
function prepare(){const m=createRPractice();m.start();return m;}
function ready(m:Match){grantStorm(m.hero('blue'),m.time);grantStorm(m.hero('blue'),m.time);}
describe('Q stacks and independently rendered readiness',()=>{
 it('requires two hits, misses grant nothing, Q3 consumes on cast and knocks up once',()=>{
  const m=prepare(),h=m.hero('blue'),t=m.hero('red');
  m.cast('blue','q',{x:h.x,y:h.y-120});advance(m,1);expect(h.qStacks??0).toBe(0);
  h.abilities.q=0;m.cast('blue','q',t);advance(m,.6);expect(h.qStacks).toBe(1);
  h.abilities.q=0;m.cast('blue','q',t);advance(m,.6);expect(stormReady(h,m.time)).toBe(true);
  const hp=t.hp;h.abilities.q=0;expect(m.cast('blue','q',t)).toBe(true);expect(stormReady(h,m.time)).toBe(false);expect(m.projectiles).toHaveLength(0);
  advance(m,.2);expect(m.projectiles).toHaveLength(0);advance(m,.8);
  expect(t.hp).toBe(hp-ABILITIES.q.damage);expect(t.airborneUntil).toBeGreaterThan(m.time);
  advance(m,.3);expect(t.hp).toBe(hp-ABILITIES.q.damage);expect(h.qStacks).toBe(0);
 });
 it('readiness never locks locomotion and expires in simulation time',()=>{
  const m=prepare(),h=m.hero('blue');ready(m);const at=h.qReadyAt;m.orderMove('blue',{x:450,y:390});advance(m,1);
  expect(h.x).toBeLessThan(480);expect(h.qReadyAt).toBe(at);expect(stormReady(h,m.time)).toBe(true);
  m.togglePause();advance(m,10);expect(stormReady(h,m.time)).toBe(true);m.togglePause();advance(m,5.1);expect(stormReady(h,m.time)).toBe(false);
 });
 it('does not consume readiness on rejected casts and clears on death',()=>{
  const m=prepare(),h=m.hero('blue');ready(m);h.abilities.q=10;expect(m.cast('blue','q',m.hero('red'))).toBe(false);expect(stormReady(h,0)).toBe(true);
  m.damage(m.hero('red'),h,10000);expect(stormReady(h,0)).toBe(false);expect(h.q3Cast).toBeNull();
 });
 it.each([0,45,90,135,180,225,270,315,37])('Q3 direction %s stays fixed after orders',angle=>{
  const m=prepare(),h=m.hero('blue');ready(m);const r=angle*Math.PI/180;
  m.cast('blue','q',{x:h.x+Math.cos(r)*100,y:h.y+Math.sin(r)*100});m.orderMove('blue',{x:450,y:390});advance(m,.32);
  const p=m.projectiles.find(p=>p.empowered)!;expect(p).toBeTruthy();expect(p.vx).toBeCloseTo(Math.cos(r));expect(p.vy).toBeCloseTo(Math.sin(r));expect(h.x).toBe(480);
 });
 it('Q3 pierces targets once and does not rebuild stacks',()=>{
  const m=prepare(),h=m.hero('blue');const a=m.spawnMinion('red','melee',{x:510,y:350});a.speed=0;a.hp=a.maxHp=1000;ready(m);m.cast('blue','q',m.hero('red'));advance(m,1.3);
  expect(a.hp).toBe(1000-ABILITIES.q.damage);expect(m.hero('red').hp).toBe(2000-ABILITIES.q.damage);expect(h.qStacks).toBe(0);
 });
 it('blocks Q3 at an enemy wind wall, including targets behind it',()=>{
  const m=prepare();m.windWalls.push({id:999,team:'red',x:515,y:350,angle:0,startsAt:0});ready(m);m.cast('blue','q',m.hero('red'));advance(m,1);
  expect(m.projectiles).toHaveLength(0);expect(m.hero('red').hp).toBe(2000);
 });
 it('EQ grants one stack for multiple hits and empowered EQ knocks up without tornado',()=>{
  const m=createEPractice();m.start();const h=m.hero('blue'),t=m.entities.find(e=>e.kind==='melee'&&e.team==='red')!;
  ready(m);m.cast('blue','e',t);
  const victim=m.spawnMinion('red','melee',h.eCast!.end);victim.speed=0;victim.hp=victim.maxHp=2000;
  m.cast('blue','q',t);advance(m,.6);
  expect(victim.airborneUntil).toBeGreaterThan(m.time);expect(h.qStacks).toBe(0);expect(m.projectiles).toHaveLength(0);
 });
 it('R clears readiness and pending Q3 is cancelled by death',()=>{
  const m=prepare(),h=m.hero('blue'),t=m.hero('red');ready(m);t.airborneUntil=2;expect(m.cast('blue','r',t)).toBe(true);expect(h.qStacks).toBe(0);
  const m2=prepare();ready(m2);m2.cast('blue','q',m2.hero('red'));m2.damage(m2.hero('red'),m2.hero('blue'),9999);advance(m2,1);expect(m2.projectiles).toHaveLength(0);
 });
 it('expired stack starts over rather than making Q3',()=>{const m=prepare(),h=m.hero('blue');grantStorm(h,0);advance(m,STORM.stackDuration+.1);grantStorm(h,m.time);expect(h.qStacks).toBe(1);clearStorm(h);expect(h.qStacks).toBe(0);});
});
