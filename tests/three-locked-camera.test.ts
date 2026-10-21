import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { RenderPositions } from '../src/render/RenderPositions';
import { trackHeroCamera } from '../src/render-three/CameraTracking';
import { ThreeCamera } from '../src/render-three/Coordinates';

describe('Three.js locked camera render-time tracking', () => {
  for (const rate of [60, 120, 165, 240]) for (const zoom of [.6, 1, 1.5]) {
    it(`holds the interpolated hero on one screen position at ${rate} Hz, zoom ${zoom}`, () => {
      const match = new Match({ ai: false, waves: false }), hero = match.hero('blue');
      const camera = new ThreeCamera(), positions = new RenderPositions();
      camera.resize(852, 884); camera.setElevation(45); camera.setZoom(zoom);
      let accumulator = 0, simulationTime = 0, lastFocus = { x: hero.x, y: hero.y };
      for (let frame = 0; frame < rate * 2; frame++) {
        accumulator += 1 / rate;
        while (accumulator + 1e-12 >= 1 / 60) {
          positions.capture([hero]); hero.x += 80 / 60; hero.y += 35 / 60;
          accumulator -= 1 / 60; simulationTime += 1 / 60;
        }
        match.time = simulationTime;
        const sample = trackHeroCamera(camera, { match, positions, alpha: accumulator * 60 }, true);
        const screen = camera.project(sample, .7);
        const scale = camera.size.height / (camera.camera.top - camera.camera.bottom);
        expect(screen.x).toBeCloseTo(426, 6);
        expect(screen.y).toBeCloseTo(442 - .7 * Math.SQRT1_2 * scale, 6);
        expect(camera.focus.x).toBeCloseTo(sample.x, 10);
        if (frame > 3) {
          expect(camera.focus.x - lastFocus.x).toBeCloseTo(80 / rate, 7);
          expect(camera.focus.y - lastFocus.y).toBeCloseTo(35 / rate, 7);
        }
        lastFocus = { ...camera.focus };
      }
    });
  }
  it('uses render-time positions for held Space without enabling the persistent lock', () => {
    const match = new Match({ ai: false, waves: false }), hero = match.hero('blue');
    const positions = new RenderPositions(), camera = new ThreeCamera();
    positions.capture([hero]); hero.x += 2; hero.y += 1;
    const sample = trackHeroCamera(camera, { match, positions, alpha: .25 }, false, true);
    expect(camera.focus).toEqual({ x: sample.x, y: sample.y });
    expect(camera.focus.x).not.toBe(hero.x);
    const focus = { ...camera.focus };
    trackHeroCamera(camera, { match, positions, alpha: .75 }, false, false);
    expect(camera.focus).toEqual(focus);
  });
  it('keeps free-camera framing and immediately tracks teleports when locked', () => {
    const match = new Match({ ai: false, waves: false }), hero = match.hero('blue');
    const positions = new RenderPositions(), camera = new ThreeCamera(), focus = { ...camera.focus };
    positions.capture([hero]); hero.x += 100;
    trackHeroCamera(camera, { match, positions, alpha: .1 }, false);
    expect(camera.focus).toEqual(focus);
    const sample = trackHeroCamera(camera, { match, positions, alpha: .1 }, true);
    expect(sample.x).toBe(hero.x); expect(camera.focus.x).toBe(hero.x);
  });
});
