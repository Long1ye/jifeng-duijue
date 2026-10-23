import { describe, expect, it } from 'vitest';
import { TeamVision } from '../src/presentation/TeamVision';
import { WarFog } from '../src/render-three/WarFog';
import { Match } from '../src/game/Match';

describe('shared team sight and fog memory', () => {
  it('keeps the original full-rate pixels while skipping identical GPU uploads', () => {
    const match = units(), vision = new TeamVision(), fog = new WarFog();
    try {
      vision.update(0, match.entities); fog.update(0, vision);
      const pixels = fog.data.slice(), version = fog.texture.version;
      for (let i = 1; i <= 20; i++) { vision.update(i / 120, match.entities); fog.update(i / 120, vision); }
      expect(fog.data).toEqual(pixels); expect(fog.texture.version).toBe(version); expect(fog.updateInterval).toBe(0);
      match.hero('blue').x += 100; vision.update(.2, match.entities); fog.update(.2, vision);
      expect(fog.data).not.toEqual(pixels); expect(fog.texture.version).toBeGreaterThan(version);
    } finally { fog.dispose(); }
  });
  it('limits visual texture work without delaying gameplay visibility checks', () => {
    const match = new Match({ ai: false, waves: false }), vision = new TeamVision(), fog = new WarFog();
    fog.updateInterval = 1 / 30;
    try {
      vision.update(0, match.entities); fog.update(0, vision);
      const version = fog.texture.version;
      Object.assign(match.hero('blue'), { x: 1000, y: 1000 }); Object.assign(match.hero('red'), { x: 1100, y: 1000 });
      vision.update(1 / 120, match.entities); fog.update(1 / 120, vision);
      expect(vision.entityVisible(match.hero('red'))).toBe(true);
      expect(fog.texture.version).toBe(version);
      fog.update(1 / 30, vision); expect(fog.texture.version).toBeGreaterThan(version);
      fog.reset(); fog.update(0, vision); expect(fog.texture.version).toBeGreaterThan(version + 1);
    } finally { fog.dispose(); }
  });
  function units() {
    const match = new Match({ ai: false, waves: false });
    Object.assign(match.hero('blue'), { x: 1000, y: 1000 });
    Object.assign(match.hero('red'), { x: 2000, y: 1000 });
    match.tower('blue').hp = 0;
    return match;
  }
  it('combines living friendly sources and never grants sight from enemies or corpses', () => {
    const match = units(), vision = new TeamVision();
    const ally = match.spawnMinion('blue', 'melee', { x: 1900, y: 1000 });
    vision.update(0, match.entities);
    expect(vision.entityVisible(match.hero('red'))).toBe(true);
    ally.hp = 0; vision.update(1, match.entities);
    expect(vision.entityVisible(match.hero('red'))).toBe(false);
    expect(vision.pointVisible({ x: 1050, y: 1000 })).toBe(true);
    expect(vision.strength({ x: 1350, y: 1000 })).toBeLessThan(vision.strength({ x: 1300, y: 1000 }));
  });
  it('hides opponents in unoccupied brush but reveals them from the same brush', () => {
    const match = units(); match.hero('red').x = 1100;
    const vision = new TeamVision('blue', point => point.x >= 1080 && point.x <= 1200 ? 'bush' : null);
    vision.update(0, match.entities); expect(vision.entityVisible(match.hero('red'))).toBe(false);
    match.hero('blue').x = 1085; vision.update(1, match.entities);
    expect(vision.entityVisible(match.hero('red'))).toBe(true);
  });
  it('temporarily reveals an attacker damaging an ally and expires using simulation time', () => {
    const match = units(), vision = new TeamVision();
    const event = { type: 'hit' as const, team: 'red' as const, x: 1000, y: 1000, sourceId: match.hero('red').id, targetId: match.hero('blue').id };
    vision.update(1, match.entities, [event]); expect(vision.entityVisible(match.hero('red'))).toBe(true);
    vision.update(1, match.entities); expect(vision.entityVisible(match.hero('red'))).toBe(true);
    vision.update(2.6, match.entities); expect(vision.entityVisible(match.hero('red'))).toBe(false);
    vision.reset(); expect(vision.sources).toHaveLength(0);
  });
  it('lights nearby grass without revealing its enemies, and darkens grass outside sight', () => {
    const match = units(); match.hero('red').x = 1100;
    const vision = new TeamVision('blue', point => point.x >= 1080 && point.x <= 1200 ? 'bush' : null);
    const fog = new WarFog();
    const index = (Math.floor(1000 / 3400 * fog.height) * fog.width + Math.floor(1100 / 6200 * fog.width)) * 4;
    try {
      vision.update(0, match.entities); fog.update(0, vision);
      expect(vision.entityVisible(match.hero('red'))).toBe(false);
      expect(fog.data[index]).toBe(255);
      match.hero('blue').x = 3000;
      for (let step = 1; step <= 30; step++) {
        vision.update(step / 10, match.entities); fog.update(step / 10, vision);
      }
      expect(fog.data[index]).toBeLessThan(2);
      expect(fog.data[index + 1]).toBe(255);
      expect(vision.entityVisible(match.hero('red'))).toBe(false);
      match.hero('blue').x = 1000;
      for (let step = 31; step <= 60; step++) {
        vision.update(step / 10, match.entities); fog.update(step / 10, vision);
      }
      expect(fog.data[index]).toBe(255);
      expect(vision.entityVisible(match.hero('red'))).toBe(false);
    } finally { fog.dispose(); }
  });
  it('does not leak remote enemy combat events into presentation or sound', () => {
    const match = units(), vision = new TeamVision(); vision.update(0, match.entities);
    const hidden = { type: 'cast' as const, team: 'red' as const, x: 2000, y: 1000 };
    expect(vision.eventVisible(hidden)).toBe(false);
    expect(vision.eventVisible({ ...hidden, x: 1100 })).toBe(true);
    expect(vision.eventVisible({ ...hidden, team: 'blue' })).toBe(true);
    expect(vision.eventVisible({ ...hidden, type: 'end' })).toBe(true);
  });
  it('retains explored terrain without keeping it visible; pause and restart are deterministic', () => {
    const match = units(), vision = new TeamVision(), fog = new WarFog();
    const at = (x: number, y: number) => (Math.floor(y / 3400 * fog.height) * fog.width + Math.floor(x / 6200 * fog.width)) * 4;
    try {
      vision.update(0, match.entities); fog.update(0, vision);
      const index = at(1000, 1000); expect(fog.data[index]).toBe(255); expect(fog.data[index + 1]).toBe(255);
      const paused = fog.data.slice(); fog.update(0, vision); expect(fog.data).toEqual(paused);
      match.hero('blue').x = 3000; vision.update(2, match.entities);
      for (let time = .1; time <= 3; time += .1) fog.update(time, vision);
      expect(fog.data[index]).toBeLessThan(2); expect(fog.data[index + 1]).toBe(255);
      fog.reset(); expect(fog.data.some(value => value !== 0)).toBe(false);
    } finally { fog.dispose(); }
  });
});
