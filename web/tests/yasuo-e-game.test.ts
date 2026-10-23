import { describe, it, expect } from 'vitest';
import { Match } from '../src/game/Match';
import { E,dashEndpoint } from '../src/game/YasuoE';
import {ABILITIES} from '../src/game/config';
import { YasuoAnimator } from '../src/render/YasuoAnimation';
function setup() {
  const m=new Match({ai:false,waves:false}); m.start(); const h=m.hero('blue'); h.x=500; h.y=350;
  const t=m.spawnMinion('red','melee',{x:540,y:350}); t.speed=0; t.damage=0;
  return {m,h,t};
}
describe('Yasuo targeted dash',()=>{
  it('moves halfway along its configured dash during the travel phase',()=>{
    const {m,h,t}=setup();
    expect(E.dash).toBe(.44); expect(E.duration).toBe(.64);
    const end=dashEndpoint(h,t);m.cast('blue','e',t); m.step(E.startup+E.dash/2);
    expect(h.x).toBeCloseTo((500+end.x)/2); expect(h.eCast).not.toBeNull();
  });
  it('rejects ground, allies and distant targets without cooldown',()=>{
    const {m,h}=setup(); expect(m.cast('blue','e',{x:700,y:300})).toBe(false);
    expect(m.cast('blue','e',h)).toBe(false); expect(h.abilities.e).toBe(0);
    const far=m.spawnMinion('red','melee',{x:500+E.range+20,y:350}); expect(m.cast('blue','e',far)).toBe(false);
  });
  it('moves continuously, damages only once and stops beyond target',()=>{
    const {m,h,t}=setup(); const other=m.spawnMinion('red','melee',{x:590,y:350}); other.speed=0;
    const end=dashEndpoint(h,t);expect(m.cast('blue','e',t)).toBe(true); m.step(.02); expect(h.x).toBe(500);
    m.step(.12); expect(h.x).toBeGreaterThan(500); expect(h.x).toBeLessThan(500+E.travel);
    m.step(E.duration-.14); expect(h.x).toBe(end.x); expect(t.hp).toBe(t.maxHp-55); expect(other.hp).toBe(other.maxHp);
    expect(h.eCast).toBeNull(); expect(m.zones).toHaveLength(0);
  });
  it('rejects repeat target but accepts a different one after global cooldown',()=>{
    const {m,h,t}=setup(); m.cast('blue','e',t); m.step(Math.max(E.duration,ABILITIES.e.cooldown)+.01);
    expect(m.cast('blue','e',t)).toBe(false);
    const next=m.spawnMinion('red','melee',{x:h.x+40,y:h.y}); expect(m.cast('blue','e',next)).toBe(true);
  });
  it('keeps trajectory on target death and honors pause and death',()=>{
    const {m,h,t}=setup();const end=dashEndpoint(h,t); m.cast('blue','e',t); t.hp=0; m.togglePause(); m.step(1); expect(h.x).toBe(500);
    m.togglePause(); m.step(E.duration); expect(h.x).toBe(end.x);
    const next=m.spawnMinion('red','melee',{x:620,y:350}); m.step(.2); m.cast('blue','e',next);
    m.damage(m.hero('red'),h,9999); expect(h.eCast).toBeNull();
  });
  it('blocks other casts and queues movement until dash ends',()=>{
    const {m,h,t}=setup(); m.cast('blue','e',t); m.orderMove('blue',{x:580,y:450});
    expect(m.cast('blue','e',t)).toBe(false); expect(m.cast('blue','w',t)).toBe(false);
    m.step(E.duration); expect(h.y).toBe(350); m.step(.1); expect(h.y).toBeGreaterThan(350);
  });
  it('uses existing directional artwork without rotating it',()=>{
    const {m,h,t}=setup(); const animator=new YasuoAnimator(); m.cast('blue','e',t);
    const sample=animator.sample(h,.1); expect(sample.state).toBe('E');
    expect('direction' in sample.clip && sample.clip.direction).toBe('e');
  });
});
