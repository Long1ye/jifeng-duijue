import {describe,it,expect} from 'vitest';
import {createEPractice} from '../src/game/EPractice';
import {ABILITIES} from '../src/game/config';
import {E,EQ} from '../src/game/YasuoE';
describe('Yasuo EQ',()=>{
  for(let i=0;i<8;i++)it(`direction ${i}: one circular hit, no straight projectile`,()=>{
    const m=createEPractice();m.start();const h=m.hero('blue'),target=m.entities.filter(e=>e.team==='red'&&e.kind==='melee')[i];
    expect(m.cast('blue','e',target)).toBe(true);
    const end=h.eCast!.end,v=m.spawnMinion('red','melee',{x:end.x,y:end.y});v.hp=v.maxHp=2000;v.speed=0;v.damage=0;
    const mana=h.mana;expect(m.cast('blue','q',target)).toBe(true);expect(m.cast('blue','q',target)).toBe(false);
    expect(h.mana).toBe(mana-ABILITIES.q.cost);expect(m.projectiles).toHaveLength(0);
    m.step(E.startup+E.dash);expect(v.hp).toBe(2000-ABILITIES.q.damage);m.step(EQ.recovery+.01);expect(v.hp).toBe(2000-ABILITIES.q.damage);expect(h.eqCast).toBeNull();
  });
  it('rejects unavailable Q and freezes queued EQ on pause',()=>{
    const m=createEPractice();m.start();const h=m.hero('blue'),t=m.entities.find(e=>e.team==='red'&&e.kind==='melee')!;
    m.cast('blue','e',t);h.abilities.q=10;expect(m.cast('blue','q',t)).toBe(false);h.abilities.q=0;
    expect(m.cast('blue','q',t)).toBe(true);m.togglePause();m.step(1);expect(h.eqCast?.hit).toBe(false);expect(m.time).toBe(0);
  });
});
