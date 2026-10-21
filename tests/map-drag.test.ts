import { describe, expect, it } from 'vitest';
import { MapDrag } from '../src/presentation/MapDrag';
import { ThreeCamera, WORLD_ORIGIN } from '../src/render-three/Coordinates';

describe('left mouse map grab', () => {
  it.each([45, 60, 75])('keeps the grabbed ground under the cursor at %s degrees, for all zooms and long drags', angle => {
    for (const zoom of [.25, .6, 1.5]) {
      const camera = new ThreeCamera(); camera.setElevation(angle); camera.setZoom(zoom); camera.lookAt(WORLD_ORIGIN);
      const before = camera.project(WORLD_ORIGIN);
      camera.panScreen(-1700, -900);
      const after = camera.project(WORLD_ORIGIN);
      expect(after.x - before.x).toBeCloseTo(1700, 5); expect(after.y - before.y).toBeCloseTo(900, 5);
    }
  });
  it('keeps a slightly shaky click as target selection and never pans it', () => {
    const drag = new MapDrag(); drag.begin(1, { x: 100, y: 100 }, 42);
    expect(drag.move(1, { x: 103, y: 102 })).toBeNull();
    expect(drag.end(1, { x: 102, y: 101 })).toEqual({ pan: null, click: true, target: 42 });
    expect(drag.active).toBe(false);
  });
  it('pans opposite to the grab, includes the threshold movement, and retains final release movement', () => {
    const drag = new MapDrag(); drag.begin(3, { x: 10, y: 20 }, 9);
    expect(drag.move(3, { x: 13, y: 20 })).toBeNull();
    expect(drag.move(3, { x: 22, y: 29 })).toEqual({ x: -12, y: -9 });
    expect(drag.dragging).toBe(true);
    expect(drag.move(3, { x: 25, y: 25 })).toEqual({ x: -3, y: 4 });
    expect(drag.end(3, { x: 28, y: 25 })).toEqual({ pan: { x: -3, y: 0 }, click: false, target: 9 });
  });
  it('does not turn a drag back to its starting point into an accidental target click', () => {
    const drag = new MapDrag(); drag.begin(1, { x: 0, y: 0 }, 8);
    drag.move(1, { x: 30, y: 0 });
    expect(drag.end(1, { x: 0, y: 0 })?.click).toBe(false);
  });
  it('recognizes a fast down/up drag even if no intermediate move event arrived', () => {
    const drag = new MapDrag(); drag.begin(1, { x: 0, y: 0 }, null);
    expect(drag.end(1, { x: 20, y: 10 })).toEqual({ pan: { x: -20, y: -10 }, click: false, target: null });
  });
  it('ignores other pointers and cancels cleanly after capture loss, blur, or scene restart', () => {
    const drag = new MapDrag(); drag.begin(4, { x: 0, y: 0 }, 1);
    expect(drag.move(5, { x: 100, y: 100 })).toBeNull(); expect(drag.end(5, { x: 0, y: 0 })).toBeNull();
    expect(drag.active).toBe(true); drag.cancel();
    expect(drag.end(4, { x: 100, y: 100 })).toBeNull(); expect(drag.dragging).toBe(false);
    drag.begin(9, { x: 1, y: 1 }, null); expect(drag.end(9, { x: 1, y: 1 })?.click).toBe(true);
  });
});
