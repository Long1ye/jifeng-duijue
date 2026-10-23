import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';

function setup(){
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:400,y:350});
 Object.assign(m.hero('red'),{x:900,y:100,speed:0,damage:0});
 return {m,h:m.hero('blue')};
}
function advance(m:Match,t:number){for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120);}
function dummy(m:Match,x:number,y=350){const e=m.spawnMinion('red','melee',{x,y});e.speed=e.damage=0;e.hp=e.maxHp=1000;return e;}
describe('ground attack move',()=>{
 it('walks to the ground destination and acquires enemies encountered along the route',()=>{
  const {m,h}=setup(),enemy=dummy(m,650);
  m.orderAttackMove('blue',{x:750,y:350});advance(m,1);
  expect(h.x).toBeGreaterThan(400);expect(h.targetId).toBeNull();
  advance(m,3);expect(h.targetId).toBe(enemy.id);expect(enemy.hp).toBeLessThan(1000);
 });
 it('chooses the enemy nearest the click, ignores allies, and keeps its current opponent',()=>{
  const {m,h}=setup(),near=dummy(m,500),other=dummy(m,450);
  const ally=m.spawnMinion('blue','melee',{x:420,y:350});ally.speed=ally.damage=0;
  m.orderAttackMove('blue',{x:750,y:350});advance(m,.3);expect(h.targetId).toBe(near.id);
  Object.assign(other,{x:h.x+25,y:h.y+30});advance(m,.2);
  expect(h.targetId).toBe(near.id);expect(ally.hp).toBe(ally.maxHp);
 });
 it('uses the newest click to retarget and excludes enemies outside acquisition range',()=>{
  const {m,h}=setup(),left=dummy(m,350),right=dummy(m,450),far=dummy(m,750);
  m.orderAttackMove('blue',{x:760,y:350});advance(m,.01);
  expect(h.targetId).toBe(right.id);expect(far.hp).toBe(1000);
  m.orderAttackMove('blue',{x:300,y:350});advance(m,.01);
  expect(h.targetId).toBe(left.id);
 });
 it('continues to the destination after a kill and still attacks enemies at the destination',()=>{
  const {m,h}=setup(),enemy=dummy(m,450);enemy.hp=h.damage;
  m.orderAttackMove('blue',{x:550,y:350});advance(m,3);
  expect(enemy.hp).toBe(0);expect(Math.abs(h.x-550)).toBeLessThan(1);
  const next=dummy(m,600);advance(m,1);expect(next.hp).toBeLessThan(1000);
 });
 it.each(['move','stop','attack'] as const)('%s replaces the attack move order',command=>{
  const {m,h}=setup();m.orderAttackMove('blue',{x:750,y:350});advance(m,.1);
  const far=dummy(m,650);
  if(command==='move')m.orderMove('blue',{x:400,y:450});
  else if(command==='stop')m.stop('blue');else m.orderAttack('blue',far.id);
  const near=dummy(m,h.x+40);advance(m,.6);
  expect(near.hp).toBe(1000);expect(h.targetId).toBe(command==='attack'?far.id:null);
 });
 it('buffers attack move through hit stun and does not chase escaped enemies',()=>{
  const {m,h}=setup(),enemy=dummy(m,450);h.flinchUntil=.1;
  m.orderAttackMove('blue',{x:700,y:350});expect(m.bufferedOrder('blue')?.kind).toBe('attack-move');
  advance(m,.3);expect(h.targetId).toBe(enemy.id);
  enemy.x=900;advance(m,.2);expect(h.targetId).toBeNull();expect(h.destination?.x).toBe(700);
 });
});
