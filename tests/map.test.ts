import { describe, expect, it } from 'vitest';
import { AI_HOLD, BALANCE, BASES, MAP_LAYOUT, SPAWNS, TOWERS, WORLD, mapToWorld } from '../src/game/config';
import { clampPoint, distance } from '../src/game/geometry';
import { Match } from '../src/game/Match';
import { CameraRig } from '../src/render/CameraRig';

function advance(state: Match, seconds: number): void {
  for (let i = 0; i < Math.ceil(seconds / WORLD.step); i++) state.step(WORLD.step);
}

describe('expanded terrain footprint', () => {
  it('keeps the expanded world and character scale with a wider local camera', () => {
    expect(WORLD.width).toBe(1022); expect(WORLD.height).toBe(654);
    expect(MAP_LAYOUT.scale).toBe(2);
    const state = new Match(), rig = new CameraRig(); rig.reset(state.hero('blue'));
    expect(rig.zoom).toBe(1); expect(rig.bounds).toMatchObject({ width: 480, height: 270 });
    expect(state.hero('blue')).toMatchObject({ speed: 80, radius: 11, range: 58 });
    expect(BALANCE.melee.speed).toBe(28); expect(BALANCE.waveInterval).toBe(30);
  });

  it('keeps fountains, towers, spawns and the AI hold point aligned with terrain', () => {
    expect(BASES.blue).toEqual(mapToWorld({ x: 51, y: 305 }));
    expect(TOWERS.red).toEqual(mapToWorld({ x: 395, y: 85 }));
    expect(SPAWNS.blue).toEqual(mapToWorld({ x: 145, y: 241 }));
    expect(AI_HOLD).toEqual(mapToWorld({ x: 305, y: 147 }));
    for (const point of [...Object.values(BASES), ...Object.values(TOWERS), ...Object.values(SPAWNS), AI_HOLD]) {
      expect(clampPoint(point)).toEqual(point);
    }
  });

  it('provides at least 150 world units below both hero spawn positions', () => {
    for (const spawn of Object.values(SPAWNS)) {
      expect(WORLD.height - 8 - spawn.y).toBeGreaterThan(150);
      expect(spawn.y - 8).toBeGreaterThan(150);
    }
  });

  it('actually lets heroes move up and down beyond the old 327px map boundary', () => {
    const state = new Match({ ai: false, waves: false }); state.start();
    const hero = state.hero('blue'); hero.x = WORLD.width / 2; hero.y = WORLD.height / 2;
    state.orderMove('blue', { x: hero.x, y: 460 }); advance(state, 3);
    expect(Math.abs(hero.y - 460)).toBeLessThan(1); expect(hero.destination).toBeNull();
    state.orderMove('blue', { x: hero.x, y: 200 }); advance(state, 5.1);
    expect(Math.abs(hero.y - 200)).toBeLessThan(1); expect(hero.destination).toBeNull();
    expect(hero.hp).toBe(hero.maxHp);
  });

  it('routes the spawned wave from the relocated fountain towards the opposite side', () => {
    const state = new Match({ ai: false }); state.start(); advance(state, 2.1);
    const blue = state.entities.filter(e => e.team === 'blue' && e.kind === 'melee');
    expect(blue).toHaveLength(3);
    for (const unit of blue) {
      expect(distance(unit, BASES.blue)).toBeLessThan(200);
      expect(unit.destination).toEqual(unit.formation?.goal);
    }
  });

  it('keeps recovering AI inside the expanded fountain until sufficiently healed', () => {
    const state = new Match({ waves: false }); state.start();
    const hero = state.hero('red'); hero.x = BASES.red.x - 30; hero.y = BASES.red.y; hero.hp = 300;
    advance(state, 1.1);
    expect(hero.destination).toEqual(BASES.red);
    expect(hero.hp).toBeGreaterThan(300);
  });
});
