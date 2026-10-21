import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {ABILITIES,WORLD} from '../src/game/config';
import {YASUO_Q_HIT_SECONDS} from '../src/game/YasuoQ';
import {containsUnitBody,pickUnit,UNIT_METRICS,basicAttackReach} from '../src/game/UnitMetrics';
import {E,pickDashTarget,dashEndpoint} from '../src/game/YasuoE';
import {grantStorm,STORM} from '../src/game/YasuoStorm';
import {YasuoAnimator} from '../src/render/YasuoAnimation';
import {enemyOf,type Team} from '../src/game/types';

function setup(team:Team){
  const match=new Match({ai:false,waves:false});match.start();
  const hero=match.hero(team);Object.assign(hero,{x:400,y:350});
  Object.assign(match.hero(enemyOf(team)),{x:850,y:500,speed:0});
  return {match,hero};
}
function advance(match:Match,seconds:number){for(let i=0;i<Math.ceil(seconds/WORLD.step);i++)match.step(WORLD.step);}

describe.each(['blue','red'] as const)('%s Yasuo melee combat',team=>{
  it('deals basic damage on release without emitting a projectile',()=>{
    const {match,hero}=setup(team),target=match.spawnMinion(enemyOf(team),'melee',{x:440,y:350});target.speed=0;
    match.orderAttack(team,target.id);advance(match,.3);
    const events=match.drainEvents(),attack=events.find(e=>e.type==='attack'&&e.sourceId===hero.id),hit=events.find(e=>e.type==='hit'&&e.sourceId===hero.id);
    expect(target.hp).toBe(target.maxHp-hero.damage);expect(hit?.at).toBe(attack?.at);
    expect(match.projectiles.filter(p=>p.sourceId===hero.id)).toHaveLength(0);
  });
  it('cancels a swing if its target leaves melee range before release',()=>{
    const {match,hero}=setup(team),target=match.spawnMinion(enemyOf(team),'melee',{x:440,y:350});target.speed=0;
    match.orderAttack(team,target.id);match.step(WORLD.step);target.x=hero.x+basicAttackReach(hero,target,true)+1;
    match.step(WORLD.step);expect(hero.windup).toBe(0);expect(hero.attacksReleased).toBe(0);
    match.stop(team);advance(match,.25);expect(target.hp).toBe(target.maxHp);
  });
  it('pierces all three bodies on one contact tick, grants one stack and ignores a wind wall',()=>{
    const {match,hero}=setup(team);
    const targets=[35,85,140].map(dx=>{const t=match.spawnMinion(enemyOf(team),'melee',{x:400+dx,y:350});t.speed=0;return t;});
    const outside=match.spawnMinion(enemyOf(team),'melee',{x:490,y:380});outside.speed=0;
    const beyond=match.spawnMinion(enemyOf(team),'melee',{x:400+ABILITIES.q.range+22,y:350});beyond.speed=0;
    match.windWalls.push({id:990,team:enemyOf(team),x:460,y:350,angle:0,startsAt:0});
    match.cast(team,'q',{x:600,y:350});advance(match,YASUO_Q_HIT_SECONDS-.03);
    expect(targets.every(t=>t.hp===t.maxHp)).toBe(true);
    advance(match,.05);
    expect(targets.every(t=>t.hp===t.maxHp-ABILITIES.q.damage)).toBe(true);
    expect(outside.hp).toBe(outside.maxHp);expect(beyond.hp).toBe(beyond.maxHp);
    expect(hero.qStacks).toBe(1);expect(match.projectiles).toHaveLength(0);
    const hits=match.drainEvents().filter(e=>e.type==='hit'&&e.sourceId===hero.id);
    expect(hits).toHaveLength(3);expect(new Set(hits.map(e=>e.at)).size).toBe(1);
    advance(match,.3);expect(targets.every(t=>t.hp===t.maxHp-ABILITIES.q.damage)).toBe(true);
  });
  it('does not miss contact when a simulation step passes the whole cast',()=>{
    const {match}=setup(team),target=match.spawnMinion(enemyOf(team),'melee',{x:480,y:350});target.speed=0;
    match.cast(team,'q',target);match.step(.8);expect(target.hp).toBe(target.maxHp-ABILITIES.q.damage);
  });
  it('keeps Q3 as a separate travelling tornado',()=>{
    const {match,hero}=setup(team);grantStorm(hero,0);grantStorm(hero,0);
    match.cast(team,'q',{x:600,y:350});advance(match,STORM.releaseDelay+.02);
    expect(match.projectiles).toHaveLength(1);expect(match.projectiles[0]).toMatchObject({team,empowered:true});
    expect(hero.qStacks).toBe(0);expect(hero.qCast).toBeNull();
  });
  it('uses the same E and W kit and approved animation on either team',()=>{
    const {match,hero}=setup(team),target=match.spawnMinion(enemyOf(team),'melee',{x:400+E.range-5,y:350});target.speed=0;
    const end=dashEndpoint(hero,target);expect(match.cast(team,'e',target)).toBe(true);expect(new YasuoAnimator().sample(hero,match.time).state).toBe('E');
    advance(match,E.duration+.02);expect(hero.x).toBeCloseTo(end.x);
    expect(match.cast(team,'w',{x:hero.x+100,y:350})).toBe(true);expect(match.windWalls[0].team).toBe(team);
    expect(match.zones).toHaveLength(0);
  });
  it('can use R on an airborne opposing hero',()=>{
    const {match,hero}=setup(team),target=match.hero(enemyOf(team));
    Object.assign(target,{x:hero.x+100,y:hero.y,airborneUntil:3,hp:2000,maxHp:2000});
    expect(match.cast(team,'r',target)).toBe(true);advance(match,1.5);
    expect(target.hp).toBe(2000-ABILITIES.r.damage);
  });
});

describe('body selection and proportions',()=>{
  it('selects both hero torsos but excludes weapon margins and empty corners',()=>{
    const m=new Match();
    for(const hero of [m.hero('blue'),m.hero('red')]){
      expect(containsUnitBody(hero,{x:hero.x,y:hero.y-45})).toBe(true);
      expect(containsUnitBody(hero,{x:hero.x+45,y:hero.y-45})).toBe(false);
      expect(containsUnitBody(hero,{x:hero.x+20,y:hero.y-76})).toBe(false);
      expect(hero.radius).toBe(UNIT_METRICS.hero.radius);
    }
    expect(UNIT_METRICS.melee.height/UNIT_METRICS.hero.height).toBeGreaterThan(.38);
    expect(UNIT_METRICS.melee.height/UNIT_METRICS.hero.height).toBeLessThan(.45);
    expect(E.range).toBe(ABILITIES.e.range);expect(E.range).toBeLessThan(ABILITIES.q.range);expect(STORM.range).toBe(2*ABILITIES.q.range);
  });
  it('uses the same body selection for clicks and E, including a target north of the hero',()=>{
    const {match,hero}=setup('blue'),target=match.spawnMinion('red','melee',{x:hero.x,y:hero.y-58});
    expect(pickUnit(match.entities,target)?.id).toBe(target.id);
    expect(pickDashTarget(hero,match.entities,target)?.id).toBe(target.id);
    const torso={x:target.x+5,y:target.y-20};
    expect(pickUnit(match.entities,torso)?.id).toBe(target.id);
    expect(pickDashTarget(hero,match.entities,torso)?.id).toBe(target.id);
  });
});
