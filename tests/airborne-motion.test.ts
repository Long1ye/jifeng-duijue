import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { airborneMotion, LANDING_SECONDS } from '../src/render/AirborneMotion';
import { UNIT_METRICS } from '../src/game/UnitMetrics';

function launch() {
 const match = new Match({ ai: false, waves: false }); match.start();
 const hero = match.hero('blue'), target = match.hero('red');
 Object.assign(hero, { x: 400, y: 350, qStacks: 2, qStacksUntil: 6 });
 Object.assign(target, { x: 520, y: 350, speed: 0, damage: 0, hp: 2000, maxHp: 2000 });
 expect(match.cast('blue', 'q', target)).toBe(true);
 for (let i = 0; i < 120 && target.airborneStartedAt === undefined; i++) match.step(1 / 120);
 expect(target.airborneStartedAt).toBeDefined();
 return { match, hero, target, start: target.airborneStartedAt! };
}

describe('natural knock-up presentation', () => {
 it('rises from the ground, rounds the apex, then accelerates into the landing', () => {
  const { target, start } = launch(), at = (age: number) => airborneMotion(target, start + age);
  expect(at(0).lift).toBeCloseTo(0);
  expect(at(.016).lift).toBeGreaterThan(0); expect(at(.016).lift).toBeLessThan(10);
  expect(at(.04).lift).toBeLessThan(at(.08).lift); expect(at(.08).lift).toBeLessThan(at(.16).lift);
  expect(at(.35).lift).toBeGreaterThan(30); expect(at(.9).lift).toBeLessThan(at(.8).lift); expect(at(.99).lift).toBeLessThan(at(.9).lift);
  expect(at(.08).lean).toBeGreaterThan(.1); expect(at(.08).scaleY).toBeGreaterThan(1);
  const until = target.airborneUntil!;
  expect(airborneMotion(target, until + .04)).toMatchObject({ lift: 0, landing: true, airborne: false });
  expect(airborneMotion(target, until + .04).scaleY).toBeLessThan(1);
  expect(airborneMotion(target, until + LANDING_SECONDS + .001)).toMatchObject({ lift: 0, scaleX: 1, scaleY: 1, active: false });
 });
 it('does not change collision coordinates or control duration and freezes when simulation pauses', () => {
  const { match, target, start } = launch(), before = structuredClone(target);
  expect(target.airborneUntil! - start).toBeCloseTo(1); expect(target.airborneDirection).toEqual({ x: 1, y: 0 });
  for (let i = 0; i < 180; i++) airborneMotion(target, start + i / 120);
  expect(target).toEqual(before); expect(target.x).toBe(520); expect(target.y).toBe(350); expect(target.hp).toBe(1915);
  match.togglePause(); const pose = airborneMotion(target, match.time); match.step(2); expect(airborneMotion(target, match.time)).toEqual(pose);
 });
 it('extends a late Q3 into R without jumping back to maximum height or replaying the launch', () => {
  const { match, target, start } = launch(); match.time = start + .86;
  const before = airborneMotion(target, match.time); expect(match.cast('blue', 'r', target)).toBe(true);
  const after = airborneMotion(target, match.time); expect(after.lift).toBeCloseTo(before.lift); expect(after.offset).toBeCloseTo(before.offset); expect(after.lean).toBeCloseTo(before.lean);
  expect(target.airborneStartedAt).toBe(start); expect(target.airborneUntil! - match.time).toBeCloseTo(1.6);
  expect(airborneMotion(target, match.time + .13).lift).toBeCloseTo(UNIT_METRICS.hero.height * .4);
 });
 it('releases all pose state on death', () => {
  const { match, hero, target } = launch();
  match.damage(hero, target, 9999, false, 'q3'); expect(target.airborneStartedAt).toBeUndefined(); expect(target.airborneHold).toBeUndefined();
  expect(airborneMotion(target, match.time)).toMatchObject({ lift: 0, active: false });
 });
});
