import { expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader } from 'three';
import { RavenBehavior } from '../src/render-three/RavenBehavior';
import { MapRavens, ravenPerches } from '../src/render-three/MapRavens';
import { PoroBehavior, PORO_PLACEMENTS } from '../src/render-three/PoroBehavior';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { bridgePoint } from '../src/game/Bridge';

it('flies between wall caps, pauses exactly, lands and resets on a new match', () => {
  const [perches] = ravenPerches(), bird = new RavenBehavior(perches, 0);
  const states = new Set<string>();
  for (let frame = 0; frame < 60 * 15; frame++) {
    const time = frame / 60; bird.update(time, []); states.add(bird.state);
    const snapshot = { u: bird.u, v: bird.v, height: bird.height, state: bird.state, frame: bird.frame };
    bird.update(time, []); expect({ u: bird.u, v: bird.v, height: bird.height, state: bird.state, frame: bird.frame }).toEqual(snapshot);
    expect(bird.height).toBeGreaterThanOrEqual(Math.min(...perches.map(p => p.height)));
    expect(bird.u).toBeGreaterThanOrEqual(Math.min(...perches.map(p => p.u)));
    expect(bird.u).toBeLessThanOrEqual(Math.max(...perches.map(p => p.u)));
  }
  expect([...states].sort()).toEqual(['flying', 'landing', 'perched', 'takeoff']);
  bird.update(0, []); expect(bird.u).toBe(perches[0].u); expect(bird.height).toBe(perches[0].height);
  bird.update(.1, [bridgePoint(bird.u, bird.v)]); expect(bird.state).toBe('takeoff');
});

it('uses one atlas, waits for loading and disposes shared resources once', () => {
  const texture = new Texture<HTMLImageElement>(); let loaded: (() => void) | undefined;
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => { loaded = () => done?.(texture); return texture; });
  const birds = new MapRavens(), camera = new ThreeCamera();
  try {
    expect(mock).toHaveBeenCalledTimes(1); birds.update(0, camera, []);
    expect(birds.group.children.every(o => !o.visible)).toBe(true);
    loaded?.(); birds.update(0, camera, []); expect(birds.group.children.every(o => o.visible)).toBe(true);
    for (const body of birds.group.children as Mesh[]) expect(body.material).toHaveProperty('depthTest', true);
    const disposed = vi.spyOn(texture, 'dispose'); birds.dispose(); birds.dispose(); loaded?.();
    expect(disposed).toHaveBeenCalledTimes(1); expect(birds.group.children).toHaveLength(0);
  } finally { birds.dispose(); mock.mockRestore(); }
});

it('gives poros occasional gestures without moving their grounded wander enclosure', () => {
  const gestures = new Set<string>();
  for (const placement of PORO_PLACEMENTS) {
    const poro = new PoroBehavior(placement);
    for (let frame = 0; frame < 60 * 30; frame++) { poro.update(frame / 60, []); gestures.add(poro.gesture); }
    poro.update(0, []); expect(poro.gesture).toBe('none');
  }
  expect(gestures).toEqual(new Set(['none', 'sniff', 'shake', 'hop']));
});
