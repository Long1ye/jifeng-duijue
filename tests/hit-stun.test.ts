import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {applyHitStun,inHitStun} from '../src/game/HitStun';
import {createCombatPractice} from '../src/game/CombatPractice';
import type {ImpactKind} from '../src/game/types';
import {grantStorm} from '../src/game/YasuoStorm';

const setup=()=>{const m=createCombatPractice();m.start();return m;};
const advance=(m:Match,seconds:number)=>{const end=m.time+seconds;while(m.time+1e-8<end)m.step(Math.min(1/600,end-m.time));};
describe('short hit stun and shared protection',()=>{
 it.each(['blue','red'] as const)('applies a symmetric 50ms attack stun to %s',(team)=>{
  const m=setup(),victim=m.hero(team),source=m.hero(team==='blue'?'red':'blue');
  victim.speed=53;
  m.damage(source,victim,10);expect(victim.flinchUntil).toBeCloseTo(.05);expect(victim.flinchProtectedUntil).toBeCloseTo(.4);
  const from={x:victim.x,y:victim.y};m.orderMove(team,{x:victim.x-80,y:victim.y+50});
  advance(m,.04);expect({x:victim.x,y:victim.y}).toEqual(from);
  advance(m,.03);expect(Math.hypot(victim.x-from.x,victim.y-from.y)).toBeGreaterThan(0);
 });
 it('uses 70ms for Q and never stacks or extends from repeated or alternating attackers',()=>{
  const m=setup(),source=m.hero('blue'),target=m.hero('red');m.damage(source,target,10,false,'q');
  const ends=target.flinchUntil,protectedUntil=target.flinchProtectedUntil;
  const second={...source,id:999};
  for(let i=1;i<=40;i++)applyHitStun(i%2?source:second,target,'attack',i*.01,1);
  expect(ends).toBe(.07);expect(target.flinchUntil).toBe(ends);expect(target.flinchProtectedUntil).toBe(protectedUntil);
  expect(applyHitStun(second,target,'attack',.421,1)).toBe(.05);
 });
 it('continues damage during protection and leaves an escape window under continuous hits',()=>{
  const m=setup(),target=m.hero('red'),source=m.hero('blue');target.hp=target.maxHp=10000;target.speed=53;
  m.orderMove('red',{x:target.x+200,y:target.y});const x=target.x;let controlled=0;
  for(let i=0;i<180;i++){
   if(i%3===0)m.damage(source,target,1);
   m.step(1/600);if(inHitStun(target,m.time))controlled++;
  }
  expect(target.hp).toBe(9940);expect(target.x-x).toBeGreaterThan(10);expect(controlled).toBeLessThan(35);
 });
 it('ignores minion attacks, zero damage, towers, allies, and non-staggering skills',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red'),minion=m.spawnMinion('blue','melee',{x:450,y:340});
  expect(applyHitStun(minion,target,'attack',0,10)).toBe(0);
  expect(applyHitStun(hero,target,'attack',0,0)).toBe(0);
  expect(applyHitStun(hero,m.tower('red'),'q',0,85)).toBe(0);
  expect(applyHitStun(hero,hero,'q',0,85)).toBe(0);
  for(const kind of ['e','eq','q3','eq3','r','spell'] as ImpactKind[])expect(applyHitStun(hero,target,kind,0,85)).toBe(0);
 });
 it('allows normal Q3 knock-up during protection and never replaces its clock',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.damage(hero,target,5);
  target.airborneUntil=m.time+1.1;m.damage(hero,target,85,false,'q3');
  expect(target.airborneUntil).toBe(1.1);expect(target.flinchUntil).toBe(.05);
 });
 it('freezes timers on pause and clears stun on death or disabling the feature',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.damage(hero,target,5);m.togglePause();m.step(1);
  expect(m.time).toBe(0);expect(inHitStun(target,m.time)).toBe(true);
  m.togglePause();m.setHitStunEnabled(false);expect(inHitStun(target,0)).toBe(false);
  m.damage(hero,target,5);expect(target.flinchUntil).toBe(0);
  m.setHitStunEnabled(true);m.damage(hero,target,5);m.damage(hero,target,9999);expect(target.flinchUntil).toBe(0);
 });
});
describe('latest buffered input',()=>{
 it('stores copies and executes only the last move once recovery ends',()=>{
  const m=setup(),hero=m.hero('blue');m.damage(m.hero('red'),hero,5);
  const p={x:hero.x-70,y:hero.y+50};m.orderMove('blue',{x:hero.x+80,y:hero.y});m.orderMove('blue',p);p.x+=300;
  expect(m.bufferedOrder('blue')).toMatchObject({kind:'move',point:{x:hero.x-70,y:hero.y+50}});
  advance(m,.06);expect(m.bufferedOrder('blue')).toBeUndefined();expect(hero.destination?.x).toBeLessThan(hero.x);
  expect(m.drainEvents().filter(e=>e.type==='move')).toHaveLength(1);
 });
 it('queues a skill without spending mana or cooldown, then casts exactly once',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.damage(target,hero,5);
  expect(m.cast('blue','q',target)).toBe(true);expect(hero.mana).toBe(hero.maxMana);expect(hero.abilities.q).toBe(0);
  expect(m.drainEvents().some(e=>e.type==='cast')).toBe(false);
  advance(m,.08);expect(hero.abilities.q).toBeGreaterThan(1);expect(m.bufferedOrder('blue')).toBeUndefined();
  expect(m.drainEvents().filter(e=>e.type==='cast'&&e.team==='blue')).toHaveLength(1);
 });
 it('lets stop replace a buffered cast without paying its cost',()=>{
  const m=setup(),hero=m.hero('blue');m.damage(m.hero('red'),hero,5);m.cast('blue','q',m.hero('red'));m.stop('blue');
  advance(m,.08);expect(hero.mana).toBe(hero.maxMana);expect(hero.destination).toBeNull();expect(hero.qCast).toBeNull();
 });
 it('revalidates dead attack targets and invalid dash targets at execution time',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.damage(target,hero,5);m.cast('blue','e',target);target.x+=300;
  advance(m,.08);expect(hero.eCast).toBeFalsy();expect(hero.abilities.e).toBe(0);
  m.setHitStunEnabled(false);m.setHitStunEnabled(true);m.damage(target,hero,5);m.orderAttack('blue',target.id);target.hp=0;
  advance(m,.08);expect(hero.targetId).toBeNull();expect(m.bufferedOrder('blue')).toBeUndefined();
 });
 it('expires rather than firing a stale command after a long knock-up',()=>{
  const m=setup(),hero=m.hero('blue');m.damage(m.hero('red'),hero,5);m.cast('blue','q',m.hero('red'));hero.airborneUntil=1;
  advance(m,1.1);expect(hero.qCast).toBeNull();expect(hero.abilities.q).toBe(0);expect(m.bufferedOrder('blue')).toBeUndefined();
 });
 it('preserves a committed attack and waits to execute a buffered move until release',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.orderAttack('blue',target.id);m.step(1/60);
  const startedAt=hero.attackStartedAt;m.damage(target,hero,5);m.orderMove('blue',{x:hero.x-80,y:hero.y});
  advance(m,.07);expect(hero.attackStartedAt).toBe(startedAt);expect(hero.windup).toBeGreaterThan(0);expect(m.bufferedOrder('blue')).toBeDefined();
  advance(m,.16);expect(hero.attacksReleased).toBe(1);expect(m.bufferedOrder('blue')).toBeUndefined();
  advance(m,.5);expect(target.hp).toBeLessThan(target.maxHp);
 });
 it('does not cancel a committed Q or dash, and defers buffered actions until recovery',()=>{
  for(const ability of ['q','e'] as const){
   const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.cast('blue',ability,target);const cast=ability==='q'?hero.qCast:hero.eCast;
   m.damage(target,hero,5);m.orderMove('blue',{x:hero.x-100,y:hero.y});advance(m,.03);
   expect(ability==='q'?hero.qCast:hero.eCast).toBe(cast);
   advance(m,1);expect(m.bufferedOrder('blue')).toBeUndefined();expect(hero.destination?.x).toBeLessThan(hero.x);
  }
 });
 it('clears a queued action on death and gives a fresh match clean state',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.damage(target,hero,5);m.cast('blue','q',target);m.damage(target,hero,9999);
  expect(m.bufferedOrder('blue')).toBeUndefined();m.step(.02);expect(m.phase).toBe('ended');
  const fresh=setup();expect(fresh.bufferedOrder('blue')).toBeUndefined();expect(inHitStun(fresh.hero('blue'),0)).toBe(false);
 });
 it.each(['q3','r'] as const)('replays a queued skill after committed %s clears its cast record',(ability)=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');
  if(ability==='q3'){grantStorm(hero,0);grantStorm(hero,0);}else target.airborneUntil=3;
  expect(m.cast('blue',ability==='q3'?'q':'r',target)).toBe(true);
  m.damage(target,hero,5);expect(m.cast('blue','w',target)).toBe(true);
  advance(m,2.1);
  expect(m.drainEvents().filter(e=>e.type==='cast'&&e.team==='blue'&&e.ability==='w')).toHaveLength(1);
  expect(m.bufferedOrder('blue')).toBeUndefined();
 });
 it('can buffer Q into an ongoing E without cancelling the dash',()=>{
  const m=setup(),hero=m.hero('blue'),target=m.hero('red');m.cast('blue','e',target);const dash=hero.eCast;
  m.damage(target,hero,5);expect(m.cast('blue','q',target)).toBe(true);advance(m,.08);
  expect(hero.eCast).toBe(dash);expect(hero.eqCast).toBeTruthy();
 });
 it('keeps buffered input through pause and casts without mana when it executes',()=>{
  const m=setup(),hero=m.hero('blue');m.damage(m.hero('red'),hero,5);m.cast('blue','q',m.hero('red'));
  m.togglePause();m.step(5);expect(m.bufferedOrder('blue')).toBeDefined();expect(m.time).toBe(0);
  hero.mana=0;m.togglePause();advance(m,.08);
  expect(hero.abilities.q).toBeGreaterThan(m.time);expect(m.bufferedOrder('blue')).toBeUndefined();expect(hero.qCast).not.toBeNull();expect(hero.mana).toBe(0);
 });
});
