import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { createCombatPractice } from '../src/game/CombatPractice';
import { MINION_LANE } from '../src/game/MinionLane';
import { BASES } from '../src/game/config';

function setup() {
 const m = new Match({ ai: false, waves: false }); m.start();
 Object.assign(m.hero('blue'), { x: 500, y: 350, flow: 0 });
 Object.assign(m.hero('red'), { x: 900, y: 600, speed: 0, damage: 0 });
 return m;
}
function advance(m: Match, seconds: number) { for (let i = 0; i < seconds * 120; i++) m.step(1 / 120); }
describe('minion proximity aggression', () => {
 for (const kind of ['melee', 'ranged'] as const) for (const formed of [false, true]) {
  it(`${formed ? 'lane' : 'standalone'} ${kind} acquires a hero in the expanded awareness band`, () => {
   const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', kind, { x: h.x + 105, y: h.y });
   if (formed) unit.formation = { wave: 99, slot: 0, goal: { x: unit.x, y: unit.y } };
   m.step(1 / 120); expect(unit.targetId).toBe(h.id);
   advance(m, 4); expect(unit.attacksReleased).toBeGreaterThan(0);
  });
  it(`${formed ? 'lane' : 'standalone'} ${kind} notices and damages a nearby passive hero`, () => {
   const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', kind, { x: h.x + 60, y: h.y });
   if (formed) unit.formation = { wave: 99, slot: 0, goal: { x: unit.x, y: unit.y } };
   m.step(1 / 120); expect(unit.targetId).toBe(h.id);
   advance(m, 3); expect(h.hp).toBeLessThan(h.maxHp);
   expect(unit.attacksReleased).toBeGreaterThan(0);
  });
 }
 it('retains a fighting minion target, but retaliates against a nearby hero trade', () => {
  const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', 'ranged', { x: 530, y: 350 });
  const enemy = m.spawnMinion('blue', 'melee', { x: 540, y: 350 }); enemy.speed = 0; enemy.damage = 0;
  m.step(.01); expect(unit.targetId).toBe(enemy.id);
  Object.assign(m.hero('red'), { x: 560, y: 350 }); m.damage(h, m.hero('red'), 1); m.step(.01);
  expect(unit.targetId).toBe(h.id);
  h.x = 750; m.step(.01); expect(unit.targetId).toBe(enemy.id);
 });
 it('does not acquire a remote hero or keep attacking a dead target', () => {
  const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', 'melee', { x: h.x + MINION_LANE.heroNotice + 5, y: h.y });
  m.step(.01); expect(unit.targetId).toBeNull();
  h.x = unit.x - 20; m.step(.01); expect(unit.targetId).toBe(h.id);
  h.hp = 0; m.step(.01); expect(unit.targetId).toBeNull(); expect(unit.windup).toBe(0);
 });
 it('returns a lane guard to its march instead of following a hero beyond the formation leash', () => {
  const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', 'melee', { x: 530, y: 350 });
  unit.formation = { wave: 99, slot: 0, goal: { x: 530, y: 350 } }; m.step(.01); expect(unit.targetId).toBe(h.id);
  h.x = 530 - MINION_LANE.leash - 10; m.step(.01); expect(unit.targetId).toBeNull(); expect(unit.destination).toEqual(unit.formation.goal);
 });
 it('releases a hero beyond the home leash even while still inside local awareness', () => {
  const m = setup(), h = m.hero('blue'), unit = m.spawnMinion('red', 'melee', { x: 530, y: 350 });
  unit.formation = { wave: 99, slot: 0, goal: { x: 590, y: 350 } };
  h.x = 590 - MINION_LANE.leash + 5; m.step(.001); expect(unit.targetId).toBe(h.id);
  h.x = 590 - MINION_LANE.leash - 5;
  expect(Math.abs(h.x - unit.x)).toBeLessThan(MINION_LANE.heroNotice);
  m.step(.001); expect(unit.targetId).toBeNull(); expect(unit.destination).toEqual(unit.formation.goal);
 });
 it('gives the current combat scene real melee and caster opponents', () => {
  const m = createCombatPractice(); m.start(); const h = m.hero('blue');
  const units = m.entities.filter(e => e.kind === 'melee' || e.kind === 'ranged');
  expect(units.some(e => e.kind === 'ranged')).toBe(true);
  expect(units.every(e => e.speed > 0 && e.damage > 0)).toBe(true);
  // Move away from the stationary hero dummy and stand beside a soldier.
  h.x = units[0].x - 20; h.y = units[0].y; h.flow = 0;
  advance(m, 2); expect(h.hp).toBeLessThan(h.maxHp);
  expect(units.some(e => e.targetId === h.id && e.attacksReleased > 0)).toBe(true);
  expect(Math.hypot(h.x - BASES.blue.x, h.y - BASES.blue.y)).toBeGreaterThan(60);
 });
});
