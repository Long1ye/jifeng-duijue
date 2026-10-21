import { describe, expect, it, vi } from 'vitest';
import { Match } from '../src/game/Match';
import { PrototypeHost, type PrototypeFrame } from '../src/presentation/PrototypeHost';
import { WORLD } from '../src/game/config';
import type { GameEvent } from '../src/game/types';

function createMatch(): Match {
  const match = new Match({ ai: false, waves: false, random: () => 0.99 });
  Object.assign(match.hero('blue'), { x: 470, y: 350 });
  Object.assign(match.hero('red'), { x: 529, y: 350, speed: 0, damage: 0, hp: 2000, maxHp: 2000 });
  return match;
}
describe('Three.js minimal simulation host', () => {
  it('routes attack-move through the original simulation and retains paused input rejection', () => {
    const host = new PrototypeHost(createMatch, { frame() {}, dispose() {} });
    const direct = createMatch(); direct.start();
    const goal = { x: 600, y: 350 };
    expect(host.command({ kind: 'attack-move', point: goal })).toBe(true);
    direct.orderAttackMove('blue', goal);
    for (let i = 0; i < 90; i++) { host.update(WORLD.step); direct.step(WORLD.step); }
    expect(host.match.entities).toEqual(direct.entities);
    expect(host.match.hero('blue').targetId).toBe(host.match.hero('red').id);
    host.pause();
    expect(host.command({ kind: 'attack-move', point: { x: 400, y: 300 } })).toBe(false);
    host.dispose();
  });
  it('keeps 120 Hz presentation identical to direct 60 Hz simulation and drains events once', () => {
    const received: GameEvent[] = [];
    const frames: PrototypeFrame[] = [];
    const host = new PrototypeHost(createMatch, { frame: value => { frames.push(value); received.push(...value.events); }, dispose() {} });
    const direct = createMatch(); direct.start();
    expect(host.command({ kind: 'cast', ability: 'q', point: host.match.hero('red') })).toBe(true);
    direct.cast('blue', 'q', direct.hero('red'));
    const expected: GameEvent[] = [];
    expected.push(...direct.drainEvents());
    for (let i = 0; i < 60; i++) {
      direct.step(WORLD.step); expected.push(...direct.drainEvents());
      host.update(1 / 120); host.update(1 / 120);
    }
    expect(host.match.entities).toEqual(direct.entities); expect(host.match.time).toBe(direct.time);
    expect(received).toEqual(expected); expect(received.filter(e => e.type === 'hit')).toHaveLength(1);
    expect(host.match.drainEvents()).toHaveLength(0);
    const count = received.length; host.update(0); expect(received).toHaveLength(count);
    expect(frames.every(frame => frame.alpha >= 0 && frame.alpha <= 1)).toBe(true);
  });
  it('freezes paused time, rejects paused input, drops long-frame backlog and restarts cleanly', () => {
    const frame = vi.fn(); const dispose = vi.fn();
    const host = new PrototypeHost(createMatch, { frame, dispose });
    host.update(4); expect(host.match.time).toBeCloseTo(0.25, 10);
    host.pause(); const time = host.match.time; host.update(2); expect(host.match.time).toBe(time);
    expect(host.command({ kind: 'move', point: { x: 500, y: 360 } })).toBe(false);
    host.restart(); expect(host.match.phase).toBe('playing'); expect(host.match.time).toBe(0);
    host.update(0); expect(frame.mock.lastCall![0].events).toHaveLength(0);
    host.dispose(); host.dispose(); expect(dispose).toHaveBeenCalledTimes(1);
    const calls = frame.mock.calls.length; host.update(1); expect(frame).toHaveBeenCalledTimes(calls);
    expect(host.command({ kind: 'stop' })).toBe(false);
  });
  it('matches paused presentation to exact current positions and prevents teleport interpolation', () => {
    let latest: PrototypeFrame | undefined;
    const host = new PrototypeHost(createMatch, { frame: value => { latest = value; }, dispose() {} });
    host.update(WORLD.step); const hero = host.match.hero('blue'); hero.x += 100;
    host.update(0); expect(latest!.positions.sample(hero, latest!.alpha).x).toBe(hero.x);
    host.pause(); host.update(0); expect(latest!.alpha).toBe(1);
  });
  it('uses the real howling startup configuration and preserves the P0 Q contact tick', async () => {
    vi.resetModules(); vi.stubGlobal('location', { search: '?map=howling' });
    try {
      const [{ PrototypeHost: Host }, { createCombatPractice }, { HOWLING_MAP, WORLD: world }] = await Promise.all([
        import('../src/presentation/PrototypeHost'), import('../src/game/CombatPractice'), import('../src/game/config'),
      ]);
      expect(HOWLING_MAP).toBe(true); expect(world.width).toBe(6200);
      const events: GameEvent[] = [];
      const host = new Host(createCombatPractice, { frame: frame => events.push(...frame.events), dispose() {} });
      const target = host.match.hero('red');
      expect(host.command({ kind: 'cast', ability: 'q', point: target })).toBe(true);
      for (let i = 0; i < 60; i++) host.update(world.step);
      const hit = events.find(event => event.type === 'hit' && event.targetId === target.id)!;
      expect(hit).toBeDefined(); expect(hit.amount).toBe(85); expect(hit.at).toBeCloseTo(26 / 60, 10);
      expect(target.hp).toBe(1915); host.dispose();
    } finally { vi.unstubAllGlobals(); vi.resetModules(); }
  });
  it('routes eight picked ground directions into actual howling movement and survives five restarts', async () => {
    vi.resetModules(); vi.stubGlobal('location', { search: '?map=howling' });
    try {
      const [{ PrototypeHost: Host }, { createS01Match }, { ThreeCamera }] = await Promise.all([
        import('../src/presentation/PrototypeHost'), import('../src/presentation/S01Match'), import('../src/render-three/Coordinates'),
      ]);
      const eventCounts: number[] = [];
      const host = new Host(createS01Match, { frame: frame => eventCounts.push(frame.events.length), dispose() {} });
      const camera = new ThreeCamera(); camera.resize(853, 637);
      for (let i = 0; i < 8; i++) {
        host.restart(); const hero = host.match.hero('blue'), start = { x: hero.x, y: hero.y };
        camera.lookAt(hero); camera.setElevation(i % 2 ? 45 : 75);
        const dx = Math.cos(i * Math.PI / 4), dy = Math.sin(i * Math.PI / 4);
        const screen = camera.project({ x: hero.x + dx * 40, y: hero.y + dy * 40 });
        const picked = camera.pick({ x: screen.x + 20, y: screen.y + 40 }, { left: 20, top: 40, width: 853, height: 637 })!;
        host.command({ kind: 'move', point: picked });
        for (let tick = 0; tick < 12; tick++) host.update(1 / 60);
        expect((hero.x - start.x) * dx + (hero.y - start.y) * dy).toBeGreaterThan(1);
      }
      for (let i = 0; i < 5; i++) {
        host.command({ kind: 'cast', ability: 'q', point: host.match.hero('red') });
        host.restart(); host.update(0);
        expect(host.match.time).toBe(0); expect(host.match.entities).toHaveLength(6);
        expect(eventCounts.at(-1)).toBe(0);
      }
      host.dispose();
    } finally { vi.unstubAllGlobals(); vi.resetModules(); }
  });
});
