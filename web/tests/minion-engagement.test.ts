import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {createMinionPractice} from '../src/game/MinionPractice';
import {MinionAnimator} from '../src/render/MinionAnimation';

function setup(){
 const m=new Match({ai:false,waves:false});m.start();
 Object.assign(m.hero('blue'),{x:100,y:100});Object.assign(m.hero('red'),{x:900,y:600});
 return m;
}
describe('minions engage instead of marching back to exact slots',()=>{
 it('holds an in-range attack position during recovery instead of orbiting its opponent',()=>{
  const m=setup(),a=m.spawnMinion('blue','melee',{x:500,y:350}),b=m.spawnMinion('red','melee',{x:518,y:350});
  a.formation={wave:99,slot:0,goal:{x:450,y:350}};b.speed=0;b.damage=0;
  a.targetId=b.id;a.cooldown=1;a.attackStartedAt=0;a.attackReleasedAt=0;
  const start={x:a.x,y:a.y};
  for(let i=0;i<48;i++)m.step(1/60);
  expect(Math.hypot(a.x-start.x,a.y-start.y)).toBeLessThan(1);
  expect(a.targetId).toBe(b.id);
 });
 it.each(['melee','ranged'] as const)('lets an in-range %s complete its attack away from its formation point',kind=>{
  const m=setup(),a=m.spawnMinion('blue',kind,{x:500,y:350}),b=m.spawnMinion('red','melee',{x:516,y:350});
  a.formation={wave:99,slot:0,goal:{x:450,y:350}};b.speed=0;b.damage=0;
  const start={x:a.x,y:a.y};m.step(.01);expect(a.attackTargetId).toBe(b.id);
  for(let i=0;i<60;i++)m.step(1/120);
  expect(a.attacksReleased).toBe(1);expect(b.hp).toBeLessThan(b.maxHp);
  expect(Math.hypot(a.x-start.x,a.y-start.y)).toBeLessThan(3);
 });
 it('holds a live target when a slightly nearer neighbour enters and switches after death',()=>{
  const m=setup(),a=m.spawnMinion('blue','melee',{x:500,y:350}),b=m.spawnMinion('red','melee',{x:517,y:350});
  a.formation={wave:99,slot:0,goal:{x:450,y:350}};b.speed=0;b.damage=0;m.step(.01);
  const c=m.spawnMinion('red','melee',{x:500,y:366});c.speed=0;c.damage=0;
  m.step(.01);expect(a.targetId).toBe(b.id);expect(a.attackTargetId).toBe(b.id);
  b.hp=0;m.step(.01);expect(a.targetId).toBe(c.id);expect(a.windup).toBe(0);
  m.step(.01);expect(a.attackTargetId).toBe(c.id);expect(a.attacksReleased).toBe(0);
 });
 it('runs the review skirmish with real melee and caster attacks',()=>{
  const m=createMinionPractice();m.start();const units=m.entities.filter(e=>e.kind==='melee'||e.kind==='ranged');
  for(let i=0;i<600;i++)m.step(1/60);
  for(const team of ['blue','red'] as const)for(const kind of ['melee','ranged'] as const)
   expect(units.some(e=>e.team===team&&e.kind===kind&&e.attacksReleased>0)).toBe(true);
 });
});
describe('minion motion presentation',()=>{
 it('does not alternate walk and idle between render frames on the same simulation tick',()=>{
  const m=setup(),a=m.spawnMinion('blue','melee',{x:500,y:350}),anim=new MinionAnimator();
  anim.sample(a,0);a.x+=3.2;
  const first=anim.sample(a,.12);expect(anim.sample(a,.12)).toEqual(first);
  a.x+=3.2;expect(anim.sample(a,.24).frame).not.toBe(first.frame);
  expect(anim.sample(a,.3).frame).toBe(0);
 });
 it('faces its target, preserves the foot anchor on mirroring and avoids vertical flicker',()=>{
  const m=setup(),a=m.spawnMinion('blue','melee',{x:500,y:350}),anim=new MinionAnimator();
  a.facing=0;const right=anim.sample(a,0);expect(right.flip).toBe(false);
  a.facing=Math.PI;const left=anim.sample(a,.1);expect(left.flip).toBe(true);expect(left.originX).toBeCloseTo(1-right.originX);
  a.facing=Math.PI/2-.01;expect(anim.sample(a,.2).flip).toBe(true);
  anim.reset();a.facing=0;expect(anim.sample(a,0).flip).toBe(false);
 });
});
