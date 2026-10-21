import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {grantStorm,STORM} from '../src/game/YasuoStorm';
import {YASUO_Q_HIT_SECONDS} from '../src/game/YasuoQ';
import {SUMMONERS} from '../src/game/SummonerSpells';
import {distance} from '../src/game/geometry';
import {EQ} from '../src/game/YasuoE';
import {ABILITIES} from '../src/game/config';

function setup(){
 const m=new Match({ai:false,waves:false,random:()=>1});m.start();m.setHitStunEnabled(false);
 const h=m.hero('blue');Object.assign(h,{x:400,y:350});Object.assign(m.hero('red'),{x:900,y:100,speed:0,damage:0});
 return {m,h};
}
function advance(m:Match,t:number){for(let i=0;i<Math.round(t*120);i++)m.step(1/120);}
function dummy(m:Match,x:number,y:number){const t=m.spawnMinion('red','melee',{x,y});t.speed=t.damage=0;t.hp=t.maxHp=2000;return t;}

describe('Yasuo Flash combinations',()=>{
 it.each([0,1])('preserves Q%d heading and contact time, striking from the Flash position',stacks=>{
  const {m,h}=setup();if(stacks)grantStorm(h,0);
  const old=dummy(m,460,350),landing=dummy(m,460,450);
  m.cast('blue','q',{x:600,y:350});const cast=h.qCast!;advance(m,.2);
  expect(m.castSummoner('blue','d',{x:400,y:450})).toBe(true);
  expect(h.qCast).toBe(cast);expect(cast.facing).toBe(0);expect(h.y).toBe(450);
  advance(m,YASUO_Q_HIT_SECONDS-.2-.02);expect(landing.hp).toBe(2000);
  advance(m,.05);expect(landing.hp).toBeLessThan(2000);expect(old.hp).toBe(2000);
  advance(m,1);expect(m.drainEvents().filter(e=>e.type==='hit'&&e.impact==='q')).toHaveLength(1);
 });
 it('does not repeat Q damage when Flash is used after contact',()=>{
  const {m,h}=setup(),old=dummy(m,460,350),landing=dummy(m,460,450);
  m.cast('blue','q',old);advance(m,.45);expect(h.qCast?.hit).toBe(true);
  expect(m.castSummoner('blue','d',{x:400,y:450})).toBe(true);advance(m,1);
  expect(old.hp).toBeLessThan(2000);expect(landing.hp).toBe(2000);
 });
 it.each([false,true])('relocates EQ (empowered=%s) without rewinding the dash or duplicating hits',empowered=>{
  const {m,h}=setup();if(empowered){grantStorm(h,0);grantStorm(h,0);}
  const anchor=dummy(m,440,350),old=dummy(m,485,350),landing=dummy(m,470,480);
  m.cast('blue','e',anchor);advance(m,.2);m.cast('blue','q',anchor);
  const eq=h.eqCast!,trigger=eq.triggerAt;advance(m,.2);
  expect(anchor.hp).toBe(2000-ABILITIES.e.damage);
  expect(m.castSummoner('blue','d',{x:h.x,y:480})).toBe(true);
  const point={x:h.x,y:h.y};expect(h.eCast).toBeNull();expect(h.eqCast).toBe(eq);
  expect(eq.triggerAt).toBe(m.time);expect(eq.triggerAt).toBeLessThan(trigger);expect(eq.hit).toBe(true);
  expect(landing.hp).toBe(2000-ABILITIES.q.damage);expect(old.hp).toBe(2000);
  expect(anchor.hp).toBe(2000-ABILITIES.e.damage);
  advance(m,.16);expect(distance(h,point)).toBeLessThan(.01);
  expect((landing.airborneUntil??0)>m.time).toBe(empowered);
  advance(m,1);expect(m.drainEvents().filter(e=>e.type==='hit'&&e.impact===(empowered?'eq3':'eq'))).toHaveLength(1);
 });
 it('judges every target at the landing circle, excluding the teleport path and late entrants',()=>{
  const {m,h}=setup(),anchor=dummy(m,440,350);
  m.cast('blue','e',anchor);advance(m,.2);m.cast('blue','q',anchor);advance(m,.2);
  const x=h.x,y=480;
  const edge=dummy(m,x+EQ.radius+6-.01,y),outside=dummy(m,x+EQ.radius+6+.01,y);
  const crossed=dummy(m,x,410),late=dummy(m,x+90,y);
  expect(m.castSummoner('blue','d',{x,y})).toBe(true);
  expect(edge.hp).toBe(2000-ABILITIES.q.damage);expect(outside.hp).toBe(2000);expect(crossed.hp).toBe(2000);
  Object.assign(late,{x,y});advance(m,.2);expect(late.hp).toBe(2000);expect(m.projectiles).toHaveLength(0);
 });
 it.each([false,true])('cannot move or repeat an already resolved EQ (empowered=%s)',empowered=>{
  const {m,h}=setup();if(empowered){grantStorm(h,0);grantStorm(h,0);}
  const anchor=dummy(m,440,350);
  m.cast('blue','e',anchor);m.cast('blue','q',anchor);
  const end=h.eCast!.end,first=dummy(m,end.x+25,end.y),landing=dummy(m,end.x,end.y+130);
  advance(m,.53);expect(h.eqCast?.hit).toBe(true);expect(first.hp).toBeLessThan(2000);
  expect(m.castSummoner('blue','d',landing)).toBe(true);advance(m,.4);
  expect(landing.hp).toBe(2000);expect(landing.airborneUntil??0).toBe(0);
  expect(m.drainEvents().filter(e=>e.type==='hit'&&e.targetId===first.id&&e.impact===(empowered?'eq3':'eq'))).toHaveLength(1);
 });
 it('does not apply E damage along an early EQ Flash teleport',()=>{
  const {m,h}=setup(),anchor=dummy(m,460,350),crossed=dummy(m,400,410);
  m.cast('blue','e',anchor);m.cast('blue','q',anchor);advance(m,.04);
  expect(m.castSummoner('blue','d',{x:400,y:490})).toBe(true);advance(m,.7);
  expect(h.y).toBe(490);expect(anchor.hp).toBe(2000);expect(crossed.hp).toBe(2000);
 });
 it('releases Q3 from the Flash landing point with its original heading',()=>{
  const {m,h}=setup();grantStorm(h,0);grantStorm(h,0);m.cast('blue','q',{x:600,y:350});advance(m,.15);
  expect(m.castSummoner('blue','d',{x:400,y:450})).toBe(true);advance(m,.16);
  expect(m.projectiles).toHaveLength(1);expect(m.projectiles[0]).toMatchObject({empowered:true,y:450,vx:1,vy:0});
  expect(m.projectiles[0].x).toBeGreaterThanOrEqual(h.x);expect(m.time).toBeGreaterThan(STORM.releaseDelay);
 });
 it('does not relocate an already released Q3 projectile',()=>{
  const {m}=setup();const h=m.hero('blue');grantStorm(h,0);grantStorm(h,0);m.cast('blue','q',{x:600,y:350});advance(m,.32);
  expect(m.castSummoner('blue','d',{x:400,y:450})).toBe(true);advance(m,.03);expect(m.projectiles[0].y).toBe(350);
 });
 it('still rejects Flash during plain E, W, R, crowd control, pause, or cooldown',()=>{
  for(const state of ['e','w','r','airborne','stun','paused','cooldown'] as const){
   const {m,h}=setup(),t=dummy(m,440,350);
   if(state==='e'||state==='w')m.cast('blue',state,t);
   if(state==='r'){const enemy=m.hero('red');Object.assign(enemy,{x:440,y:350,airborneUntil:2});expect(m.cast('blue','r',enemy)).toBe(true);}
   if(state==='airborne')h.airborneUntil=1;
   if(state==='stun')h.flinchUntil=1;
   if(state==='paused')m.togglePause();
   if(state==='cooldown')m.summonerCooldowns.blue.d=SUMMONERS.d.cooldown;
   expect(m.castSummoner('blue','d',{x:400,y:450}),state).toBe(false);
   expect(h.x).toBe(400+(state==='r'?72:0));
  }
 });
});
