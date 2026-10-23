import {describe,it,expect} from 'vitest';
import {createRPractice} from '../src/game/RPractice';
import {YASUO_R,yasuoRFrame} from '../src/game/YasuoR';
describe('original Yasuo R integration',()=>{
 it('requires a living airborne enemy hero within range',()=>{
  const m=createRPractice();m.start();const t=m.hero('red'),h=m.hero('blue');
  expect(m.cast('blue','r',t)).toBe(false);t.airborneUntil=2;h.x=100;expect(m.cast('blue','r',t)).toBe(false);
  h.x=480;t.hp=0;expect(m.cast('blue','r',t)).toBe(false);
 });
 it('blinks to fixed staging, locks casts, hits once, then releases',()=>{
  const m=createRPractice();m.start();const t=m.hero('red'),h=m.hero('blue');t.airborneUntil=3;
  expect(m.cast('blue','r',t)).toBe(true);expect(h.x).toBe(t.x+32);expect(h.y).toBe(t.y-24);
  expect(m.cast('blue','q',t)).toBe(false);m.step(1.3);expect(t.hp).toBe(2000);expect(h.rCast).not.toBeNull();expect(t.airborneUntil).toBeGreaterThan(m.time);
  m.step(.02);expect(t.hp).toBe(1800);m.step(.53);expect(t.hp).toBe(1800);expect(h.rCast).toBeNull();expect(t.airborneUntil).toBeLessThan(m.time);
 });
 it('pauses simulation and cancels damage if caster dies',()=>{
  const m=createRPractice();m.start();const t=m.hero('red'),h=m.hero('blue');t.airborneUntil=3;m.cast('blue','r',t);
  m.togglePause();m.step(2);expect(t.hp).toBe(2000);expect(m.time).toBe(0);m.togglePause();m.damage(t,h,9999);m.step(2);expect(t.hp).toBe(2000);expect(h.rCast).toBeNull();
 });
 it('includes nearby airborne enemies, excludes grounded units',()=>{
  const m=createRPractice();m.start();const t=m.hero('red');t.airborneUntil=3;
  const a=m.spawnMinion('red','melee',{x:t.x+3,y:t.y}),b=m.spawnMinion('red','melee',{x:t.x-3,y:t.y});
  for(const v of [a,b]){v.hp=v.maxHp=1000;v.speed=0;v.damage=0;}a.airborneUntil=3;
  m.cast('blue','r',t);m.step(YASUO_R.hitAt+.01);expect(a.hp).toBe(800);expect(b.hp).toBe(1000);
 });
 it('slows the 16 frames to 10 fps and clamps the ends',()=>{
  expect(yasuoRFrame(0)).toBe(0);expect(yasuoRFrame(.5)).toBe(5);
  expect(yasuoRFrame(1.5)).toBe(15);expect(yasuoRFrame(2)).toBe(15);
 });
});
