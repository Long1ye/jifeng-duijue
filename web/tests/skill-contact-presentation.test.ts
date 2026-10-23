import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {ABILITIES} from '../src/game/config';
import {E,EQ,dashEndpoint} from '../src/game/YasuoE';
import {STORM,grantStorm} from '../src/game/YasuoStorm';
import {UNIT_METRICS} from '../src/game/UnitMetrics';
import {airborneLift,EQ_RING_SCALE,TORNADO_HEIGHT,TORNADO_SCALE} from '../src/render/SkillPresentation';
import {enemyOf,type Team} from '../src/game/types';

function setup(team:Team,direction:number,kind:'hero'|'melee',distance=59){
  const m=new Match({ai:false,waves:false});m.start();
  const h=m.hero(team);Object.assign(h,{x:500,y:350});
  const position={x:h.x+Math.cos(direction)*distance,y:h.y+Math.sin(direction)*distance};
  Object.assign(m.hero(enemyOf(team)),{x:850,y:500,speed:0,damage:0});
  const target=kind==='hero'?m.hero(enemyOf(team)):m.spawnMinion(enemyOf(team),'melee',position);
  Object.assign(target,position,{speed:0,damage:0,hp:2000,maxHp:2000});
  return {m,h,target};
}
function advance(m:Match,t:number){for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120);}

describe('E into EQ keeps the real dash target inside the spin',()=>{
  for(const team of ['blue','red'] as const)for(const kind of ['hero','melee'] as const)for(let direction=0;direction<8;direction++){
    it(`${team} direction ${direction}, ${kind}: one dash hit and one ring hit`,()=>{
      const {m,h,target}=setup(team,direction*Math.PI/4,kind);
      const end=dashEndpoint(h,target);
      expect(m.cast(team,'e',target)).toBe(true);expect(m.cast(team,'q',target)).toBe(true);
      advance(m,.9);
      const impacts=m.drainEvents().filter(e=>e.type==='hit'&&e.sourceId===h.id&&e.targetId===target.id);
      expect(impacts.filter(e=>e.impact==='e')).toHaveLength(1);
      expect(impacts.filter(e=>e.impact==='eq')).toHaveLength(1);
      expect(target.hp).toBe(2000-ABILITIES.e.damage-ABILITIES.q.damage);
      expect(Math.hypot(end.x-target.x,end.y-target.y)).toBeLessThan(EQ.radius+target.radius);
      expect(Math.hypot(h.x-500,h.y-350)).toBeLessThan(100);
    });
  }
  it.each([30,59,95])('EQ3 knocks up the original target at distance %s',distance=>{
    const {m,h,target}=setup('blue',0,'hero',distance);grantStorm(h,0);grantStorm(h,0);
    m.cast('blue','e',target);m.cast('blue','q',target);advance(m,.55);
    expect(target.hp).toBe(2000-ABILITIES.e.damage-ABILITIES.q.damage);
    expect(target.airborneUntil).toBeGreaterThan(m.time);expect(airborneLift(target,m.time)).toBeGreaterThan(0);
    advance(m,.2);expect(airborneLift(target,m.time)).toBeGreaterThan(30);
    expect(m.projectiles).toHaveLength(0);
  });
  it('a ring cannot damage a target beyond its displayed radius',()=>{
    const {m,h,target}=setup('blue',0,'hero');m.cast('blue','e',target);
    const end=h.eCast!.end,outside=m.spawnMinion('red','melee',{x:end.x,y:end.y+EQ.radius+8});outside.speed=0;
    m.cast('blue','q',target);advance(m,.9);expect(outside.hp).toBe(outside.maxHp);
  });
});

describe('skill artwork and hitbox proportions',()=>{
  it('does not flash or emit a hit when a practice dummy deals zero damage',()=>{
    const {m,h,target}=setup('blue',0,'hero'),before=h.hitAt;
    m.damage(target,h,0);expect(h.hitAt).toBe(before);expect(m.drainEvents()).toHaveLength(0);
  });
  it('keeps E selection shorter than Q and limits maximum travel',()=>{
    expect(E.range).toBe(ABILITIES.e.range);expect(E.range).toBeLessThan(ABILITIES.q.range);expect(E.travel).toBe(128);
  });
  it('sizes the ring to its hit diameter and makes Q3 taller than a hero',()=>{
    expect(EQ_RING_SCALE*176).toBeCloseTo(EQ.radius*2);
    expect(TORNADO_SCALE*640).toBe(TORNADO_HEIGHT);
    expect(TORNADO_HEIGHT).toBeGreaterThan(UNIT_METRICS.hero.height);
    expect(STORM.radius).toBe(14);
  });
  it('returns grounded actors to zero lift and scales minion knockup to their body',()=>{
    const {m,target}=setup('blue',0,'melee');target.airborneUntil=1;
    expect(airborneLift(target,m.time)).toBeCloseTo(UNIT_METRICS.melee.height*.4);
    expect(airborneLift(target,1)).toBe(0);
  });
});
