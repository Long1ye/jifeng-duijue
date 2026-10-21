import { describe, expect, it } from 'vitest';
import { BRIDGE, bridgePoint } from '../src/game/Bridge';
import { unproject } from '../assets/map-studies/howling-abyss-v1/geometry';
import { ThreeCamera } from '../src/render-three/Coordinates';

function expectSafeFootprint(camera: ThreeCamera): void {
  const rect = { ...camera.size, left: 0, top: 0 };
  for (const x of [0, rect.width]) for (const y of [0, rect.height]) {
    const point = camera.pick({ x, y }, rect)!;
    const [u] = unproject(BRIDGE, point.x, point.y);
    expect(Math.abs(u)).toBeLessThanOrEqual(712.000001);
  }
}

describe('gameplay camera bridge-end containment', () => {
  for (const [width, height] of [[1200, 800], [1920, 1080], [3440, 1440], [390, 844]]) {
    it(`hides both unfinished ends and keeps spawn heroes visible at ${width}x${height}`, () => {
      const camera = new ThreeCamera(); camera.resize(width, height); camera.setElevation(45); camera.setMapBounds(true);
      for (const sign of [-1, 1]) {
        const spawn = bridgePoint(sign * 674);
        camera.lookAt(spawn); expectSafeFootprint(camera);
        const screen = camera.project(spawn);
        expect(screen.x).toBeGreaterThan(0); expect(screen.x).toBeLessThan(width);
        expect(screen.y).toBeGreaterThan(0); expect(screen.y).toBeLessThan(height);
        const focus = { ...camera.focus }; camera.lookAt(focus);
        expect(camera.focus.x).toBeCloseTo(focus.x, 8); expect(camera.focus.y).toBeCloseTo(focus.y, 8);
      }
    });
  }
  it('rechecks drag, recenter, zoom, resize and elevation changes', () => {
    const camera = new ThreeCamera(); camera.setMapBounds(true);
    for (const elevation of [45, 60, 75]) for (const zoom of [.13, .6, 1, 1.5]) {
      camera.setElevation(elevation); camera.setZoom(zoom);
      camera.panScreen(-100000, 100000); expectSafeFootprint(camera);
      camera.panScreen(100000, -100000); expectSafeFootprint(camera);
      camera.lookAt(bridgePoint(-674)); expectSafeFootprint(camera);
      camera.resize(5120, 1440); expectSafeFootprint(camera);
      camera.resize(853, 637); expectSafeFootprint(camera);
    }
  });
  it('leaves inspection views free and interior tracking exact', () => {
    const camera = new ThreeCamera(); camera.setMapBounds(true);
    const point = bridgePoint(-200, 20); camera.lookAt(point);
    expect(camera.focus.x).toBeCloseTo(point.x, 8); expect(camera.focus.y).toBeCloseTo(point.y, 8);
    camera.setMapBounds(false); camera.setZoom(.13); camera.lookAt(bridgePoint(-900));
    expect(camera.zoom).toBe(.13); expect(camera.focus).toEqual(bridgePoint(-900));
  });
});
