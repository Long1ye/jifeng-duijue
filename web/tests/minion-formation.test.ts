import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {BALANCE,BASES} from '../src/game/config';
import {direction,distance} from '../src/game/geometry';
import {MINION_LANE} from '../src/game/MinionLane';
describe('six unit waves',()=>{
 it('spawns spread frontline and backline anchors within E chaining distance',()=>{
  const m=new Match({ai:false});m.start();m.step(2);
  for(const team of ['blue','red'] as const){
   const group=m.entities.filter(e=>e.team===team&&e.formation);
   expect(group.map(e=>e.kind)).toEqual(['melee','melee','melee','ranged','ranged','ranged']);
   expect(distance(group[0],group[1])).toBeGreaterThan(MINION_LANE.spacing);
   for(let i=0;i<3;i++)expect(distance(group[i],group[i+3])).toBeLessThan(100);
   expect(group[0].hp).toBe(150);expect(group[5].hp).toBe(105);
  }
  expect(BALANCE.waveInterval).toBe(30);
 });
 it('keeps a separated backline and allows every caster to attack',()=>{
  const m=new Match({ai:false});m.start();m.step(2);
  const blue=m.entities.filter(e=>e.team==='blue'&&e.formation);
  const dir=direction(BASES.blue,BASES.red),front=blue[0];
  const enemy=m.spawnMinion('red','melee',{x:front.x+dir.x*110,y:front.y+dir.y*110});
  enemy.hp=enemy.maxHp=10000;enemy.damage=0;enemy.speed=0;
  // Remove unrelated opponents to keep this a focused formation test.
  m.entities=m.entities.filter(e=>e.team==='blue'||e===enemy);
  for(let i=0;i<1800;i++)m.step(1/60);
  const a=blue[0].formation!.goal,b=blue[3].formation!.goal;
  expect(distance(a,b)).toBeCloseTo(MINION_LANE.backline);
  expect(distance(blue[0].formation!.goal,blue[1].formation!.goal)).toBeGreaterThanOrEqual(MINION_LANE.spacing);
  expect(enemy.hp).toBeLessThan(enemy.maxHp);
  expect(blue.filter(e=>e.kind==='ranged').every(e=>e.attacksReleased>0)).toBe(true);
 });
});
