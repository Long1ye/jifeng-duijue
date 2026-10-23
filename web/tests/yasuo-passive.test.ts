import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {flowDistance,gainFlow,passiveShieldStrength,shieldRemaining,yasuoCritStats} from '../src/game/YasuoPassive';
import {ABILITIES} from '../src/game/config';
import {E} from '../src/game/YasuoE';
function setup(random=()=>.5){
 const m=new Match({ai:false,waves:false,random});m.start();
 const h=m.hero('blue'),t=m.hero('red');Object.assign(h,{x:400,y:350});Object.assign(t,{x:470,y:350,speed:0,damage:0});
 return {m,h,t};
}
function advance(m:Match,time:number){for(let i=0;i<Math.ceil(time*120);i++)m.step(1/120);}
describe('Yasuo Flow and Resolve',()=>{
 it('gains flow only from real movement, caps it at 100, and gains none while paused',()=>{
  const {m,h}=setup();advance(m,1);expect(h.flow).toBe(0);
  m.orderMove('blue',{x:300,y:350});advance(m,.5);
  expect(h.flow).toBeCloseTo((400-h.x)/flowDistance(h));
  const flow=h.flow;m.togglePause();advance(m,5);expect(h.flow).toBe(flow);
  gainFlow(h,10000,m.time);expect(h.flow).toBe(100);
 });
 it('counts E and Flash travel, while a blocked movement order grants nothing',()=>{
  const {m,h,t}=setup();m.cast('blue','e',t);advance(m,E.duration+.01);
  expect(h.flow).toBeCloseTo((h.x-400)/flowDistance(h));
  const flow=h.flow!;const x=h.x;m.castSummoner('blue','d',{x:h.x-100,y:h.y});
  expect(h.flow).toBeCloseTo(flow+(x-h.x)/flowDistance(h));
  const before=h.flow;h.airborneUntil=m.time+1;m.orderMove('blue',{x:300,y:350});advance(m,.5);expect(h.flow).toBe(before);
 });
 it('activates before champion damage, consumes all flow, and absorbs lethal first damage',()=>{
  const {m,h,t}=setup();h.flow=100;h.hp=10;m.damage(t,h,100);
  expect(h.hp).toBe(10);expect(h.flow).toBe(0);expect(shieldRemaining(h,m.time)).toBe(25);
  const hit=m.drainEvents().find(e=>e.type==='hit')!;expect(hit.amount).toBe(0);expect(hit.absorbed).toBe(100);
  m.damage(t,h,30);expect(h.hp).toBe(5);expect(shieldRemaining(h,m.time)).toBe(0);
 });
 it('does not trigger from minions or towers but an active shield absorbs their damage',()=>{
  const {m,h,t}=setup();h.flow=100;
  const soldier=m.spawnMinion('red','melee',{x:600,y:450});soldier.speed=soldier.damage=0;
  m.damage(soldier,h,10);m.damage(m.tower('red'),h,10);
  expect(h.flow).toBe(100);expect(h.hp).toBe(h.maxHp-20);
  m.damage(t,h,10);m.damage(soldier,h,10);expect(shieldRemaining(h,m.time)).toBe(105);
 });
 it('expires after one simulation second, cannot regenerate flow while shielding, and accepts true damage',()=>{
  const {m,h,t}=setup();h.flow=100;m.damage(t,h,10,false,'ignite');
  expect(shieldRemaining(h,0)).toBe(115);gainFlow(h,100,0);expect(h.flow).toBe(0);
  m.togglePause();advance(m,2);expect(shieldRemaining(h,m.time)).toBe(115);m.togglePause();advance(m,1.01);
  expect(shieldRemaining(h,m.time)).toBe(0);gainFlow(h,flowDistance(h),m.time);expect(h.flow).toBeCloseTo(1);
 });
 it('fills flow on successful R and clears passive state on death and a fresh match',()=>{
  const {m,h,t}=setup();t.airborneUntil=2;expect(m.cast('blue','r',t)).toBe(true);expect(h.flow).toBe(100);
  m.damage(t,h,10000);expect(h.flow).toBe(0);expect(h.passiveShield).toBe(0);
  expect(setup().h.flow).toBe(0);
 });
 it('keeps the level-one shield at 125 and supports official level scaling without a level HUD',()=>{
  const {h}=setup();expect(passiveShieldStrength(h)).toBe(125);h.level=18;expect(passiveShieldStrength(h)).toBe(600);
  const high=flowDistance(h);h.level=1;expect(flowDistance(h)).toBeGreaterThan(high);
 });
 it('casts Q and W at zero flow and zero mana without consuming either',()=>{
  const {m,h,t}=setup();expect(h.maxMana).toBe(0);expect(ABILITIES.q.cost).toBe(0);expect(ABILITIES.w.cost).toBe(0);
  expect(m.cast('blue','q',t)).toBe(true);advance(m,.8);expect(m.cast('blue','w',t)).toBe(true);
  expect(h.mana).toBe(0);expect(h.flow).toBe(0);expect(h.abilities.q).toBeGreaterThan(m.time);
 });
});
describe('Yasuo Intent',()=>{
 it('has zero critical chance without external stats, doubles it, and converts excess into attack damage',()=>{
  const {h}=setup();expect(yasuoCritStats(h).chance).toBe(0);
  h.critChance=.25;expect(yasuoCritStats(h).chance).toBe(.5);
  h.critChance=.75;expect(yasuoCritStats(h)).toEqual({chance:1,bonusAD:25,multiplier:1.8});
 });
 it('uses reduced critical damage on basic attacks and never lets E or R crit',()=>{
  const {m,h,t}=setup(()=>0);h.critChance=.5;const hp=t.hp;
  m.damage(h,t,40);expect(t.hp).toBeCloseTo(hp-72);
  m.damage(h,t,40,false,'e');m.damage(h,t,40,false,'r');expect(t.hp).toBeCloseTo(hp-152);
 });
 it('rolls critical chance once for a piercing Q, consistently across all victims',()=>{
  let rolls=0;const {m,h,t}=setup(()=>{rolls++;return .25;});h.critChance=.25;
  const other=m.spawnMinion('red','melee',{x:500,y:350});other.hp=other.maxHp=1000;other.speed=other.damage=0;
  m.cast('blue','q',t);advance(m,.8);
  expect(rolls).toBe(1);expect(t.hp).toBeCloseTo(t.maxHp-ABILITIES.q.damage*1.8);
  expect(other.hp).toBeCloseTo(1000-ABILITIES.q.damage*1.8);
 });
});
