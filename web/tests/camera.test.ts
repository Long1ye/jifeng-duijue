import { describe, expect, it } from 'vitest';
import { BASES, TOWERS, VIEWPORT, WORLD } from '../src/game/config';
import { Match } from '../src/game/Match';
import { CameraRig } from '../src/render/CameraRig';

describe('local camera and world-space input', () => {
  it('shows a wider local 480 × 270 region instead of the whole lane', () => {
    const rig = new CameraRig(); rig.reset({ x: 250, y: 170 });
    expect(rig.zoom).toBe(1);
    expect(rig.bounds.width).toBe(480); expect(rig.bounds.height).toBe(270);
    expect(rig.bounds.width).toBeLessThan(WORLD.width);
    expect(rig.bounds.height).toBeLessThan(WORLD.height);
    expect(rig.screenToWorld({ x: VIEWPORT.width / 2, y: VIEWPORT.height / 2 })).toEqual(rig.center);
  });

  it('clamps all corners without exposing outside the map at either zoom', () => {
    const rig = new CameraRig();
    for (const zoom of [1, 1.5] as const) for (const x of [-1000, 1000]) for (const y of [-1000, 1000]) {
      rig.setZoom(zoom); rig.lookAt({ x, y });
      const b = rig.bounds;
      expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(WORLD.width);
      expect(b.y + b.height).toBeLessThanOrEqual(WORLD.height);
    }
  });

  it('pans independently of the hero and relocks on demand', () => {
    const hero = { x: 250, y: 170 }, rig = new CameraRig(); rig.reset(hero);
    rig.pan(40, -20);
    expect(rig.following).toBe(false); expect(rig.center).toEqual({ x: 290, y: 150 });
    expect(hero).toEqual({ x: 250, y: 170 });
    rig.toggleFollow(hero);
    expect(rig.following).toBe(true); expect(rig.center).toEqual(hero);
  });

  it('retains high-frame-rate pan increments without accelerating or stalling', () => {
    const slow = new CameraRig(), fast = new CameraRig();
    slow.reset({ x: 250, y: 170 }); fast.reset({ x: 250, y: 170 });
    for (let i = 0; i < 60; i++) slow.pan(125 / 60, 0);
    for (let i = 0; i < 240; i++) fast.pan(125 / 240, 0);
    expect(slow.center.x).toBeCloseTo(fast.center.x,9);expect(slow.center.y).toBe(fast.center.y);expect(fast.center.x).toBeCloseTo(375,9);
  });

  it('temporary recentering does not change an unlocked mode', () => {
    const rig = new CameraRig(); rig.pan(10, 0); rig.lookAt({ x: 250, y: 170 });
    expect(rig.following).toBe(false);
  });

  it('projects and unprojects correctly after panning and zooming', () => {
    const rig = new CameraRig(); rig.lookAt({ x: 320, y: 160 });
    for (const zoom of [1, 1.5] as const) {
      rig.setZoom(zoom);
      for (const point of [{ x: 290, y: 130 }, { x: 370, y: 190 }]) {
        const result = rig.screenToWorld(rig.worldToScreen(point));
        expect(result.x).toBeCloseTo(point.x); expect(result.y).toBeCloseTo(point.y);
      }
    }
  });

  it('uses transformed coordinates for movement and skills, not screen coordinates', () => {
    const state = new Match({ ai: false, waves: false }); state.start();
    const hero = state.hero('blue'); hero.x = 250; hero.y = 170;
    const rig = new CameraRig(); rig.reset(hero); rig.pan(35, -10); rig.setZoom(1.5);
    const target = { x: 280, y: 175 }, aim = rig.screenToWorld(rig.worldToScreen(target));
    state.orderMove('blue', aim);
    expect(hero.destination).toEqual(target);
    state.cast('blue', 'w', aim);
    expect(hero.x).toBe(250); expect(hero.y).toBe(170);
    expect(state.windWalls[0].angle).toBeCloseTo(Math.atan2(target.y - hero.y, target.x - hero.x));
  });

  it('keeps towers in front of the fountains and resets all camera state for a new match', () => {
    expect(TOWERS.blue.x).toBeGreaterThan(BASES.blue.x);
    expect(TOWERS.red.x).toBeLessThan(BASES.red.x);
    const rig = new CameraRig(); rig.pan(50, 50); rig.setZoom(1.5);
    const hero = new Match().hero('blue'); rig.reset(hero);
    expect(rig.following).toBe(true); expect(rig.zoom).toBe(1);
    expect(rig.center).toEqual({ x: hero.x, y: hero.y });
  });
});


describe('window-sized camera viewport',()=>{
 it('uses resized dimensions for bounds, input and the view center',()=>{
  const rig=new CameraRig();rig.setZoom(1);rig.setViewport(320,510);rig.lookAt({x:500,y:320});
  expect(rig.bounds.width).toBe(320);expect(rig.bounds.height).toBe(510);
  expect(rig.screenToWorld({x:160,y:255})).toEqual(rig.center);
  const point={x:470,y:310};const restored=rig.screenToWorld(rig.worldToScreen(point));
  expect(restored.x).toBeCloseTo(point.x);expect(restored.y).toBeCloseTo(point.y);
  rig.setViewport(640,270);expect(rig.screenToWorld({x:320,y:135})).toEqual(rig.center);
  expect(()=>rig.setViewport(0,270)).toThrow();
 });
});
