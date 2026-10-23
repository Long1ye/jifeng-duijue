import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {refreshChampionStats,grantExperience} from '../src/game/ChampionProgression';
import {NailongAnimator,nailongDirection} from '../src/render/NailongAnimation';
import {NAILONG} from '../src/game/Nailong';

function setup(league=false){
 const m=new Match({ai:false,waves:false,league,enemyChampion:'nailong',random:()=>.99});m.start();
 const n=m.hero('red'),p=m.hero('blue');
 Object.assign(n,{x:500,y:350,speed:0});Object.assign(p,{x:640,y:350,speed:0,healthRegen:0});
 return {m,n,p};
}
const advance=(m:Match,t:number)=>{for(let i=0;i<Math.ceil(t*120);i++)m.step(1/120);};
describe('Nailong ranged opponent',()=>{
 it('starts with low damage and slow attacks and caps attack speed growth',()=>{
  const {n}=setup(true);expect(n.damage).toBe(28);expect(n.attackInterval).toBe(2.4);
  n.inventory=[3006,3046,3085,3091,3153,6672];n.level=18;refreshChampionStats(n);
  expect(n.attackInterval).toBeGreaterThanOrEqual(NAILONG.minimumAttackInterval);
  const {m:plain,n:enemy,p}=setup();plain.orderAttack('red',p.id);advance(plain,5);
  expect(enemy.attacksReleased).toBeLessThanOrEqual(2);
 });
 it('AI aims slow directional breaths and never emits Yasuo casts',()=>{
  const m=new Match({ai:true,waves:false,league:true,enemyChampion:'nailong',random:()=>.99});m.start();
  const n=m.hero('red'),p=m.hero('blue');Object.assign(n,{x:600,y:350,speed:0});
  Object.assign(p,{x:740,y:350,speed:0,hp:10000,maxHp:10000,healthRegen:0});
  advance(m,10);expect(n.attacksReleased).toBeGreaterThanOrEqual(3);expect(n.attacksReleased).toBeLessThanOrEqual(4);
  expect(m.events.some(e=>e.team==='red'&&e.type==='cast')).toBe(false);
  expect(m.events.filter(e=>e.sourceId===n.id&&e.type==='attack').every(e=>e.targetId===undefined)).toBe(true);
 });
 it('can choose a ground direction without selecting a target',()=>{
  const {m,n}=setup();expect(m.orderDirectionalAttack('red',{x:n.x,y:n.y-200})).toBe(true);
  expect(n.targetId).toBeNull();advance(m,.4);expect(m.projectiles[0]).toMatchObject({directional:true,targetId:null,vx:expect.any(Number),vy:-1});
 });
 it('releases a direction-only projectile, then damages on path contact',()=>{
  const {m,n,p}=setup();const hp=p.hp;m.orderAttack('red',p.id);advance(m,.38);
  expect(n.attacksReleased).toBe(1);expect(m.projectiles.some(s=>s.sourceId===n.id&&s.directional&&s.targetId===null)).toBe(true);expect(p.hp).toBe(hp);
  advance(m,.7);expect(p.hp).toBeLessThan(hp);
 });
 it('locks aim at windup and allows the opponent to dodge sideways',()=>{
  const {m,n,p}=setup();const hp=p.hp;m.orderAttack('red',p.id);advance(m,.1);const facing=n.attackFacing;
  p.y+=85;advance(m,.3);const shot=m.projectiles.find(s=>s.sourceId===n.id)!;
  expect(shot.vx).toBeCloseTo(Math.cos(facing!));expect(shot.vy).toBeCloseTo(Math.sin(facing!));
  advance(m,.7);expect(p.hp).toBe(hp);
 });
 it('continues a committed breath if the initially aimed opponent dies',()=>{
  const {m,n,p}=setup();m.orderAttack('red',p.id);advance(m,.1);p.hp=0;advance(m,.3);
  expect(n.attacksReleased).toBe(1);expect(m.projectiles[0]).toMatchObject({directional:true,targetId:null});
 });
 it('pierces the aimed path and hits each crossed unit only once',()=>{
  const {m,n,p}=setup();const minion=m.spawnMinion('blue','melee',{x:570,y:350});
  Object.assign(minion,{speed:0,damage:0});const hp=minion.hp,playerHp=p.hp;
  m.orderDirectionalAttack('red',{x:700,y:350});advance(m,1.2);
  expect(minion.hp).toBe(hp-n.damage);expect(p.hp).toBe(playerHp-n.damage);
  expect(m.events.filter(e=>e.type==='hit'&&e.sourceId===n.id&&e.targetId===p.id)).toHaveLength(1);
 });
 it('cannot cast Yasuo skills and does not gain Flow while moving',()=>{
  const {m,n,p}=setup();for(const key of ['q','w','e','r'] as const)expect(m.cast('red',key,p,p.id)).toBe(false);
  n.speed=80;m.orderMove('red',{x:450,y:350});advance(m,.3);expect(n.flow).toBe(0);
 });
 it('preserves ranged reach after items and level growth',()=>{
  const {n}=setup(true);refreshChampionStats(n);expect(n.range).toBe(168);
  grantExperience(n,1000);expect(n.range).toBe(168);
 });
 it('wind walls intercept its basic attack',()=>{
  const {m,n,p}=setup();const hp=p.hp;
  m.windWalls.push({id:100,team:'blue',x:570,y:350,angle:Math.PI/2,startsAt:0});
  m.orderAttack('red',p.id);advance(m,1);expect(n.attacksReleased).toBeGreaterThan(0);expect(p.hp).toBe(hp);expect(m.projectiles).toHaveLength(0);
 });
 it('keeps the supplied right attack and mirrors for left targets',()=>{
  const {n}=setup();const a=new NailongAnimator();Object.assign(n,{attackStartedAt:0,windup:.2,facing:0});
  expect(a.sample(n,.1)).toMatchObject({key:'nailong-attack',flip:false});
  n.facing=Math.PI;expect(a.sample(n,.2)).toMatchObject({key:'nailong-attack',flip:true});
 });
 it('selects eight directions and stops walking when actual motion stops',()=>{
  expect(Array.from({length:8},(_,i)=>nailongDirection(i*Math.PI/4))).toEqual(['e','se','s','sw','w','nw','n','ne']);
  const {n}=setup();const a=new NailongAnimator();a.sample(n,0);n.x+=1;
  expect(a.sample(n,.1).key).toContain('walk-');expect(a.sample(n,.2).key).toContain('idle-');
 });
});
