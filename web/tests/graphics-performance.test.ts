import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdaptiveGraphics, GRAPHICS_PROFILES, PresentationCadence, graphicsBufferSize, initialGraphicsTier, readGraphicsPreferences } from '../src/render-three/GraphicsPerformance';
import { ThreeArena } from '../src/render-three/ThreeArena';
import { Match } from '../src/game/Match';
import { PrototypeHost, type PrototypeFrame } from '../src/presentation/PrototypeHost';
import type { GameEvent } from '../src/game/types';
import { WarFog } from '../src/render-three/WarFog';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { Scene, type WebGLRenderer } from 'three';

afterEach(() => vi.restoreAllMocks());
function run(policy: AdaptiveGraphics, fps: number, seconds: number, active = true) {
  const changes: string[] = [];
  for (let i = 0; i < fps * seconds; i++) { const tier = policy.sample(1 / fps, active); if (tier) changes.push(tier); }
  return changes;
}
describe('graphics performance policy', () => {
  it('bounds tall, small, ultrawide and high DPI viewports without changing the camera aspect', () => {
    expect(graphicsBufferSize(3840, 2160, 960)).toEqual({ width: 960, height: 540 });
    expect(graphicsBufferSize(400, 225, 1920)).toEqual({ width: 400, height: 225 });
    for (const [w, h] of [[568, 884], [2560, 1080], [1920, 1080]]) {
      const size = graphicsBufferSize(w, h, 640);
      expect(size.width * size.height).toBeLessThanOrEqual(640 * 360);
      expect(size.width).toBeLessThanOrEqual(640);
      expect(Math.abs(size.width / size.height - w / h)).toBeLessThan(.01);
    }
  });
  it('reallocates fog MSAA attachments only when the graphics tier changes', () => {
    const fog = new WarFog();
    const renderer = { domElement: { width: 960, height: 540 }, capabilities: { maxSamples: 4 },
      getRenderTarget: () => null, setRenderTarget: vi.fn(), render: vi.fn() } as unknown as WebGLRenderer;
    const scene = new Scene(), camera = new ThreeCamera();
    try {
      fog.render(renderer, scene, camera);
      const dispose = vi.spyOn(fog.target, 'dispose');
      fog.samples = 0; fog.render(renderer, scene, camera);
      expect(fog.target.samples).toBe(0); expect(dispose).toHaveBeenCalledTimes(1);
      fog.render(renderer, scene, camera); expect(dispose).toHaveBeenCalledTimes(1);
      fog.samples = 4; fog.render(renderer, scene, camera);
      expect(fog.target.samples).toBe(4); expect(dispose).toHaveBeenCalledTimes(2);
    } finally { fog.dispose(); }
  });
  it('starts conservatively and validates persisted modes, tiers and custom controls', () => {
    expect(initialGraphicsTier({})).toBe('balanced');
    expect(initialGraphicsTier({ hardwareConcurrency: 4 })).toBe('low');
    expect(initialGraphicsTier({ hardwareConcurrency: 12, deviceMemory: 4 })).toBe('low');
    for (const raw of [null, '{}', 'bad json', '{"mode":"auto","tier":"__proto__"}', '{"mode":"custom","tier":"low"}'])
      expect(readGraphicsPreferences(raw, 'low')).toEqual({ mode: 'auto', tier: 'low' });
    expect(readGraphicsPreferences('{"mode":"high","tier":"low"}', 'low')).toEqual({ mode: 'high', tier: 'high' });
    const custom = { mode: 'custom', tier: 'low', custom: { width: 640, reduced: true, enhanced: true, effects: ['grading'] } };
    expect(readGraphicsPreferences(JSON.stringify(custom), 'balanced')).toEqual(custom);
    expect(readGraphicsPreferences('{"mode":"auto","tier":"minimum"}', 'balanced').tier).toBe('minimum');
  });
  it('ignores isolated stalls, warmup, hidden or paused sessions, and manual choices', () => {
    const policy = new AdaptiveGraphics('auto', 'balanced');
    run(policy, 60, 5);
    expect(policy.sample(.2, true)).toBeNull();
    expect(run(policy, 60, 15)).toEqual([]);
    expect(run(policy, 10, 30, false)).toEqual([]);
    expect(run(policy, 30, 2)).toEqual([]);
    policy.select('high'); expect(run(policy, 10, 30)).toEqual([]);
    policy.select('custom'); expect(run(policy, 10, 30)).toEqual([]);
    for (const seconds of [NaN, Infinity, -1, 0, 2]) expect(policy.sample(seconds, true)).toBeNull();
  });
  it('lowers one tier after sustained load, retains a stable 30 FPS low mode, and never oscillates upwards', () => {
    const policy = new AdaptiveGraphics('auto', 'balanced');
    expect(run(policy, 30, 9)).toEqual(['low']);
    expect(run(policy, 30, 30)).toEqual([]);
    expect(run(policy, 15, 10)).toEqual(['minimum']);
    expect(run(policy, 10, 30)).toEqual([]);
    expect(run(policy, 120, 60)).toEqual([]);
    expect(policy.tier).toBe('minimum');
  });
  it('requires consecutive slow windows and restarts sampling when auto resumes', () => {
    const policy = new AdaptiveGraphics('auto', 'high');
    run(policy, 60, 4); run(policy, 30, 2); run(policy, 60, 3);
    expect(run(policy, 30, 2)).toEqual([]);
    policy.select('low'); policy.select('auto');
    expect(run(policy, 15, 2)).toEqual([]);
    expect(run(policy, 15, 8)).toEqual(['minimum']);
  });
  it('caps only drawing, recovers from gaps, and retains a lower pixel budget with clearer low and balanced modes', () => {
    for (const rafHz of [60, 120, 144]) {
      const cadence = new PresentationCadence(30);
      let draws = 0;
      for (let i = 0; i < rafHz * 10; i++) if (cadence.due(i * 1000 / rafHz)) draws++;
      expect(draws).toBe(300);
      expect(cadence.due(60000)).toBe(true);
      expect(cadence.due(60001)).toBe(false);
      cadence.reset(); expect(cadence.due(60001)).toBe(true);
    }
    expect((GRAPHICS_PROFILES.low.width / GRAPHICS_PROFILES.high.width) ** 2).toBeCloseTo(4 / 9);
    expect(GRAPHICS_PROFILES.balanced.width).toBe(1600);
    expect(GRAPHICS_PROFILES.low.effects).toEqual(['contact', 'grading']);
    expect(GRAPHICS_PROFILES.balanced.effects).toContain('materials');
    expect(GRAPHICS_PROFILES.balanced.effects).not.toContain('weather');
    expect(GRAPHICS_PROFILES.low.fogSamples).toBe(0);
  });
  it('delivers every combat event and audio/HUD callback even when every expensive scene draw is skipped', () => {
    const createMatch = () => {
      const match = new Match({ ai: false, waves: false, random: () => .99 });
      Object.assign(match.hero('blue'), { x: 470, y: 350 });
      Object.assign(match.hero('red'), { x: 529, y: 350, damage: 0, speed: 0, hp: 2000, maxHp: 2000 });
      return match;
    };
    const consumed: GameEvent[] = [], heard: GameEvent[] = [];
    const callback = vi.fn((frame: PrototypeFrame) => heard.push(...frame.events));
    // No renderer, scene, sprites or DOM is available: accessing any of those draw paths fails this test.
    const arena = Object.assign(Object.create(ThreeArena.prototype) as ThreeArena, {
      localTeam: 'blue', fogEnabled: false, sprites: {}, visibleIds: new Set(),
      combat: { consume: (frame: PrototypeFrame) => consumed.push(...frame.events) },
      cadence: { due: () => false }, onFrame: callback,
    });
    const host = new PrototypeHost(createMatch, arena);
    Object.assign(arena, { currentMatch: host.match });
    const direct = createMatch(); direct.start();
    expect(host.command({ kind: 'cast', ability: 'q', point: host.match.hero('red') })).toBe(true);
    direct.cast('blue', 'q', direct.hero('red'));
    const expected = direct.drainEvents();
    for (let i = 0; i < 120; i++) {
      host.update(1 / 120);
      if (i % 2) { direct.step(1 / 60); expected.push(...direct.drainEvents()); }
    }
    expect(host.match.time).toBe(direct.time); expect(host.match.entities).toEqual(direct.entities);
    expect(callback).toHaveBeenCalledTimes(120);
    expect(consumed).toEqual(expected); expect(heard).toEqual(expected);
    expect(heard.some(event => event.type === 'hit')).toBe(true);
  });
});
