import { afterEach, describe, expect, it, vi } from 'vitest';
import { DoubleSide } from 'three';
import { Match } from '../src/game/Match';
import { SummonerAudio } from '../src/ui/SummonerAudio';
import { CombatInk } from '../src/render-three/CombatInk';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { drawClassicReady, drawClassicShield, drawClassicFlash, drawClassicIgnite, type SpellBrush } from '../src/render/ClassicSpellVfx';

afterEach(() => vi.unstubAllGlobals());
function setup() {
 vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
 const sources: { loop: boolean; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended?: () => void }[] = [];
 const parameter = () => ({ value: .5, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() });
 const context = { currentTime: 1, state: 'running', destination: {}, decodeAudioData: vi.fn(async () => ({ duration: 4 })),
  createBufferSource: () => { const source = { loop: false, start: vi.fn(), stop: vi.fn(), connect: vi.fn(), disconnect: vi.fn() }; sources.push(source); return source; },
  createGain: () => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }) } as unknown as AudioContext;
 const match = new Match({ ai: false, waves: false }); match.start();
 const hero = match.hero('blue'), target = match.hero('red'); target.x = hero.x + 80; target.y = hero.y;
 match.summonerEffects.push({ kind: 'flash', team: 'blue', startedAt: 0, endsAt: .5, from: { ...hero }, to: { ...hero }, sourceId: hero.id });
 return { audio: new SummonerAudio(), context, sources, match, hero, target };
}

describe('summoner audio follows real spell instances', () => {
 it('plays flash once, resumes only the burn after pause, and stops both ignite layers on death', async () => {
  const { audio, context, sources, match, hero, target } = setup(); await audio.load(context);
  audio.update(match, context, true, true); audio.update(match, context, true, true); expect(sources).toHaveLength(1);
  match.phase = 'paused'; audio.update(match, context, true, true); expect(sources[0].stop).toHaveBeenCalledOnce();
  match.phase = 'playing'; audio.update(match, context, true, true); expect(sources).toHaveLength(1);
  match.time = 1; match.summonerEffects.push({ kind: 'ignite', team: 'blue', startedAt: 1, endsAt: 6, from: { ...hero }, to: { ...target }, sourceId: hero.id, targetId: target.id });
  audio.update(match, context, true, true); expect(sources).toHaveLength(3); expect(sources[2].loop).toBe(true);
  match.time = 2; audio.update(match, context, false, true); expect(sources[1].stop).toHaveBeenCalledOnce(); expect(sources[2].stop).toHaveBeenCalledOnce();
  audio.update(match, context, true, true); expect(sources).toHaveLength(4); expect(sources[3].start).toHaveBeenCalledWith(1, 1);
  target.hp = 0; audio.update(match, context, true, true); expect(sources[3].stop).toHaveBeenCalledOnce();
  for (const source of sources) source.onended!(); expect(sources.every(s => s.disconnect.mock.calls.length === 1)).toBe(true); audio.dispose();
 });
 it('releases sounds on expiry and background, and permits the same cast in a fresh match', async () => {
  const { audio, context, sources, match, hero, target } = setup(); await audio.load(context);
  match.summonerEffects = [{ kind: 'ignite', team: 'blue', startedAt: 0, endsAt: 5, from: { ...hero }, to: { ...target }, sourceId: hero.id, targetId: target.id }];
  audio.update(match, context, true, true); audio.update(match, context, true, false); expect(sources.every(s => s.stop.mock.calls.length === 1)).toBe(true);
  match.time = 4; audio.update(match, context, true, true); const loop = sources.at(-1)!;
  match.time = 5; audio.update(match, context, true, true); expect(loop.stop).toHaveBeenCalledOnce();
  const fresh = setup().match; audio.update(fresh, context, true, true); expect(sources.at(-1)!.loop).toBe(false); audio.dispose();
 });
});

describe('classic visual timing and visibility', () => {
 it('renders front and back wind, and ends flash and shield release at their visual lifetimes', () => {
  const stroke = vi.fn(), brush: SpellBrush = { stroke };
  drawClassicReady(brush, .8, 1); expect(stroke.mock.calls.some(call => call[5])).toBe(true); expect(stroke.mock.calls.some(call => !call[5])).toBe(true);
  stroke.mockClear(); drawClassicFlash(brush, .32, true); drawClassicShield(brush, 1.3, .3, 1); expect(stroke).not.toHaveBeenCalled();
  drawClassicShield(brush, .2, .1, 1); expect(stroke).toHaveBeenCalled();
  stroke.mockClear(); drawClassicIgnite(brush, 1, 3); expect(stroke.mock.calls.every(call => call[0].y <= 0 && call[1].y <= 0)).toBe(true);
 });
 it('keeps camera-facing stroke triangles visible and reuses the GPU batch', () => {
  const ink = new CombatInk(true), camera = new ThreeCamera(); ink.begin(camera);
  ink.cut({ x: 400, y: 300 }, 1, { x: 0, y: 0 }, { x: 0, y: -20 }, 0xffffff, 1, 2); ink.end();
  expect(ink.mesh.material.side).toBe(DoubleSide); expect(ink.mesh.material.depthTest).toBe(false); expect(ink.mesh.geometry.drawRange.count).toBe(6);
  const geometry = ink.mesh.geometry; ink.begin(camera); ink.end(); expect(ink.mesh.geometry).toBe(geometry); expect(geometry.drawRange.count).toBe(0); ink.dispose();
 });
});
