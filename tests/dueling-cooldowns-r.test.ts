import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {ABILITIES} from '../src/game/config';
import {E} from '../src/game/YasuoE';
import {enemyOf,type Team} from '../src/game/types';

function advance(m:Match,seconds:number){const until=m.time+seconds;while(m.time<until-1e-9)m.step(Math.min(1/120,until-m.time));}
function setup(team:Team='blue',range=110){
  const m=new Match({ai:false,waves:false});m.start();const h=m.hero(team),target=m.hero(enemyOf(team));
  Object.assign(h,{x:500,y:300});Object.assign(target,{x:500+range,y:300,speed:0,damage:0,hp:2000,maxHp:2000});return {m,h,target};
}
describe.each(['blue','red'] as const)('%s automatic R',team=>{
  it.each([200,350,419,420])('follows an airborne hero %s units away with the cursor pointing elsewhere',range=>{
    const {m,h,target}=setup(team,range);target.airborneUntil=2;
    expect(m.cast(team,'r',{x:50,y:600})).toBe(true);
    expect(h.rCast?.targetIds).toContain(target.id);expect(h.abilities.r-m.time).toBe(45);
    advance(m,1.4);expect(target.hp).toBe(1800);
  });
  it('does not spend R if the only airborne hero is outside range',()=>{
    const {m,h,target}=setup(team,421);target.airborneUntil=2;
    expect(m.cast(team,'r',target)).toBe(false);expect(h.abilities.r).toBe(0);expect(h.rCast).toBeFalsy();
  });
  it('does not cast on grounded, dead, allied or minion targets',()=>{
    const {m,h,target}=setup(team);
    expect(m.cast(team,'r',target)).toBe(false);target.airborneUntil=2;target.hp=0;
    const minion=m.spawnMinion(enemyOf(team),'melee',{x:510,y:300});minion.airborneUntil=2;h.airborneUntil=2;
    expect(m.rTarget(team)).toBeUndefined();expect(m.cast(team,'r',minion)).toBe(false);h.airborneUntil=0;
    expect(m.cast(team,'r',minion)).toBe(false);expect(h.abilities.r).toBe(0);
  });
  it('selects the nearest eligible hero deterministically',()=>{
    const {m,h,target}=setup(team,300);target.airborneUntil=2;
    const nearer={...target,id:999,x:680,airborneUntil:2};m.entities.push(nearer);
    expect(m.rTarget(team)?.id).toBe(nearer.id);expect(m.cast(team,'r',{x:0,y:0})).toBe(true);
    expect(h.rCast?.targetIds).toEqual([nearer.id]);
  });
  it('builds Q3 with real cooldowns and can R immediately on the close Q3 hit',()=>{
    const {m,h,target}=setup(team);
    expect(m.cast(team,'q',target)).toBe(true);advance(m,2.51);
    expect(m.cast(team,'q',target)).toBe(true);advance(m,2.51);expect(h.qStacks).toBe(2);
    expect(m.cast(team,'q',target)).toBe(true);advance(m,.66);
    expect(target.airborneUntil).toBeGreaterThan(m.time);expect(h.q3Cast?.released).toBe(true);
    expect(m.cast(team,'r',{x:0,y:0})).toBe(true);expect(h.q3Cast).toBeNull();
    expect(m.cast(team,'r',target)).toBe(false);advance(m,1.4);
    expect(target.hp).toBe(2000-3*ABILITIES.q.damage-ABILITIES.r.damage);
  });
});
describe('dueling cooldown windows',()=>{
  it('leaves a punish window after a wind wall ends',()=>{
    const {m,h}=setup();m.cast('blue','w',{x:600,y:300});advance(m,4.3);
    expect(m.windWalls).toHaveLength(0);expect(m.cast('blue','w',{x:600,y:300})).toBe(false);
    expect(h.abilities.w-m.time).toBeCloseTo(9.7);advance(m,9.71);
    expect(m.cast('blue','w',{x:600,y:300})).toBe(true);
  });
  it('limits E chains globally and prevents repeatedly dashing the same target',()=>{
    const {m,h}=setup();const first=m.spawnMinion('red','melee',{x:540,y:300});first.speed=first.damage=0;
    m.cast('blue','e',first);expect(h.abilities.e).toBeCloseTo(.1);advance(m,.11);
    const next=m.spawnMinion('red','melee',{x:h.x+40,y:h.y});next.speed=next.damage=0;
    expect(m.cast('blue','e',next)).toBe(false);advance(m,E.duration-.11+.01);
    Object.assign(next,{x:h.x+40,y:h.y});
    expect(m.cast('blue','e',next)).toBe(true);advance(m,E.duration+.01);
    expect(m.cast('blue','e',first)).toBe(false);expect(E.targetCooldown).toBe(6);
    advance(m,6-m.time-.001);expect(m.cast('blue','e',first)).toBe(false);
    advance(m,.002);expect(m.cast('blue','e',first)).toBe(true);
  });
});
