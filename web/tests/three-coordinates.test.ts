import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ThreeCamera, toSimulation, toThree } from '../src/render-three/Coordinates';
import { bridgePoint } from '../src/game/Bridge';

describe('Three.js simulation/camera contract', () => {
  it('keeps optional follow still inside the central area and catches up without snapping', () => {
    const view = new ThreeCamera(); view.setElevation(45); view.setZoom(.4); view.resize(1920, 1080);
    const origin = { ...view.focus };
    view.follow({ x: origin.x + 25, y: origin.y + 20 }, 1 / 60);
    expect(view.focus).toEqual(origin);
    const target = { x: origin.x + 700, y: origin.y };
    view.follow(target, 0); expect(view.focus).toEqual(origin);
    view.follow(target, 1 / 60);
    expect(view.focus.x).toBeGreaterThan(origin.x); expect(view.focus.x).toBeLessThan(target.x);
    for (let i = 0; i < 120; i++) view.follow(target, 1 / 60);
    const screen = view.project(target);
    expect(screen.x).toBeLessThan(view.size.width * .66 + 1);
    expect(screen.x).toBeGreaterThan(view.size.width / 2);
  });
  it('preserves existing world distances in every direction, independently of visual height', () => {
    const origin = bridgePoint(-195);
    for (let i = 0; i < 8; i++) {
      const point = { x: origin.x + Math.cos(i * Math.PI / 4) * 145, y: origin.y + Math.sin(i * Math.PI / 4) * 145 };
      expect(toThree(origin).distanceTo(toThree(point))).toBeCloseTo(145, 10);
      const restored = toSimulation(toThree(point, 78));
      expect(restored.x).toBeCloseTo(point.x, 10); expect(restored.y).toBeCloseTo(point.y, 10);
    }
    expect(toSimulation(new Vector3(0, 900, 0))).toEqual({ x: 3100, y: 1700 });
  });
  it.each([45, 60, 75])('picks the same world point after pan, zoom and viewport resize at %s degrees', elevation => {
    const view = new ThreeCamera(); view.setElevation(elevation);
    for (const size of [{ width: 1280, height: 720 }, { width: 853, height: 637 }]) for (const zoom of [0.6, 1, 1.5]) {
      view.resize(size.width, size.height); view.setZoom(zoom); view.lookAt(bridgePoint(-90));
      for (const offset of [-50, 0, 50]) {
        const point = { x: view.focus.x + offset, y: view.focus.y + offset / 2 };
        const screen = view.project(point), rect = { ...size, left: 137.25, top: 81.5 };
        const hit = view.pick({ x: screen.x + rect.left, y: screen.y + rect.top }, rect)!;
        expect(hit.x).toBeCloseTo(point.x, 7); expect(hit.y).toBeCloseTo(point.y, 7);
      }
    }
  });
  it('rejects outside/zero-area picking and invalid frusta', () => {
    const view = new ThreeCamera(), rect = { width: 640, height: 360, left: 10, top: 20 };
    expect(view.pick({ x: 9, y: 50 }, rect)).toBeNull();
    expect(view.pick({ x: 50, y: 50 }, { ...rect, width: 0 })).toBeNull();
    expect(() => view.resize(0, 720)).toThrow(); expect(() => view.setZoom(0)).toThrow();
    expect(() => view.setElevation(0)).toThrow();
  });
  it('keeps eight cardinal/diagonal sprite headings tied to screen projection', () => {
    const view = new ThreeCamera(), p = bridgePoint(0);
    expect(view.screenHeading(p, 0)).toBeCloseTo(0, 8);
    expect(view.screenHeading(p, Math.PI / 2)).toBeCloseTo(Math.PI / 2, 8);
    expect(view.screenHeading(p, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2, 8);
    expect(view.screenHeading(p, Math.PI / 4)).toBeGreaterThan(0);
    expect(view.screenHeading(p, Math.PI / 4)).toBeLessThan(Math.PI / 4);
  });
});
