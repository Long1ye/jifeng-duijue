import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {E} from '../src/game/YasuoE';
import {dashTargetTimer} from '../src/render/DashTargetTimerState';

describe('E target countdown matches eligibility',()=>{
 function setup(){
  const match=new Match({ai:false,waves:false});match.start();
  const hero=match.hero('blue'),target=match.hero('red');
  Object.assign(hero,{x:500,y:350});Object.assign(target,{x:559,y:350,speed:0,damage:0,hp:2000,maxHp:2000});
  expect(match.cast('blue','e',target)).toBe(true);
  return {match,target};
 }
 it('consumes the white arc against the real target lock and removes it exactly on reuse',()=>{
  const {match,target}=setup(),until=match.eTargetLocks.get(target.id)!;
  expect(dashTargetTimer(target,until,match.time)!.remaining).toBe(1);
  match.step(E.targetCooldown/2);
  expect(dashTargetTimer(target,until,match.time)!.remaining).toBeCloseTo(.5);
  expect(match.dashError(target)).toContain('暂时不能');
  match.step(E.targetCooldown/2);
  expect(dashTargetTimer(target,until,match.time)).toBeNull();
  expect(match.eTargetLocks.has(target.id)).toBe(false);
  expect(match.dashError(target)).toBeNull();
 });
 it('follows position and knock-up, scales for minions and disappears on death',()=>{
  const {match,target}=setup(),until=match.eTargetLocks.get(target.id)!;
  const standing=dashTargetTimer(target,until,1)!;
  target.x+=17;target.airborneUntil=2;
  const airborne=dashTargetTimer(target,until,1)!;
  expect(airborne.x-standing.x).toBe(17);expect(airborne.y).toBeLessThan(standing.y);
  const minion=match.spawnMinion('red','melee',target);
  expect(dashTargetTimer(minion,until,1)!.radiusX).toBeLessThan(standing.radiusX);
  target.hp=0;expect(dashTargetTimer(target,until,1)).toBeNull();
 });
 it('freezes on pause and clears with a fresh match without changing cooldown rules',()=>{
  const {match,target}=setup(),until=match.eTargetLocks.get(target.id)!;
  const before=dashTargetTimer(target,until,match.time);
  match.togglePause();match.step(2);
  expect(dashTargetTimer(target,until,match.time)).toEqual(before);
  const fresh=new Match({ai:false,waves:false});
  expect(dashTargetTimer(fresh.hero('red'),fresh.eTargetLocks.get(target.id)??0,fresh.time)).toBeNull();
 });
});
