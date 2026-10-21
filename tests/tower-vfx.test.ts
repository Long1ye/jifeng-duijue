import { describe, expect, it, vi } from 'vitest';
import { Texture, TextureLoader, Vector3 } from 'three';
import { Match } from '../src/game/Match';
import { ThreeCamera, toThree } from '../src/render-three/Coordinates';
import { towerBoltPose, towerImpactPose } from '../src/render-three/TowerAttackPresentation';
import { PaintedMapLandmarks } from '../src/render-three/PaintedMapLandmarks';
import type { Projectile } from '../src/game/types';

describe('tower energy presentation', () => {
 it('keeps the bolt head aimed at its homing target at every camera elevation and direction', () => {
  const m = new Match({ ai: false, waves: false }), source = m.tower('red'), target = m.hero('blue'), camera = new ThreeCamera();
  Object.assign(source, { x: 500, y: 350 });
  const muzzle = toThree(source, 165).add(new Vector3(2, 0, 9));
  for (const elevation of [45, 60, 75]) for (let dir = 0; dir < 8; dir++) {
   camera.setElevation(elevation); Object.assign(target, { x: source.x + Math.cos(dir * Math.PI / 4) * 150, y: source.y + Math.sin(dir * Math.PI / 4) * 150 });
   const shot: Projectile = { id: 999, sourceId: source.id, targetId: target.id, team: 'red', kind: 'attack', x: source.x, y: source.y,
    damage: 90, speed: 145, vx: 0, vy: 0, radius: 3, remaining: 4, startedAt: 1 };
   const first = towerBoltPose(shot, source, target, muzzle, camera, 1);
   expect(first.position.distanceTo(muzzle)).toBeCloseTo(0);
   shot.x += (target.x - source.x) * .5; shot.y += (target.y - source.y) * .5;
   const before = structuredClone(shot), pose = towerBoltPose(shot, source, target, muzzle, camera, 1.1);
   const from = pose.position.clone().project(camera.camera), to = toThree(target, 35).project(camera.camera);
   expect(Math.sin(pose.angle) * (to.x - from.x) * camera.size.width - Math.cos(pose.angle) * (to.y - from.y) * camera.size.height).toBeCloseTo(0);
   expect(pose.position.y).toBeLessThan(first.position.y); expect(pose.position.y).toBeGreaterThan(35);
   expect(shot).toEqual(before); expect(pose.frame).toBeGreaterThanOrEqual(4); expect(pose.frame).toBeLessThan(8);
  }
 });
 it('does not jump back toward the tower crystal when a fleeing target moves farther away', () => {
  const m = new Match({ ai: false, waves: false }), source = m.tower('red'), target = m.hero('blue'), camera = new ThreeCamera();
  Object.assign(source, { x: 500, y: 350 }); Object.assign(target, { x: 650, y: 350 });
  const shot: Projectile = { id: 999, sourceId: source.id, targetId: target.id, team: 'red', kind: 'attack', x: 575, y: 350, damage: 90, speed: 145, vx: 0, vy: 0, radius: 3, remaining: 4 };
  const muzzle = toThree(source, 165), before = towerBoltPose(shot, source, target, muzzle, camera, 1);
  target.x += 200;
  const after = towerBoltPose(shot, source, target, muzzle, camera, 1, before.progress);
  expect(after.position.y).toBeLessThanOrEqual(before.position.y);
  expect(after.position.x).toBeCloseTo(before.position.x);
 });
 it('takes its muzzle from the rendered floating crystal and follows its toggle', () => {
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => { const texture = new Texture<HTMLImageElement>(); done?.(texture); return texture; });
  const map = new PaintedMapLandmarks(), match = new Match({ ai: false, waves: false });
  try {
   const source = match.tower('red'); map.update(0, source); const before = map.towerMuzzle(source)!;
   map.update(1, source); const after = map.towerMuzzle(source)!;
   expect(after.y).toBeGreaterThan(100); expect(before.distanceTo(after)).toBeGreaterThan(.1);
   map.towerFloatEnabled = false; map.update(1, source); const fixed = map.towerMuzzle(source)!;
   map.update(3, source); expect(map.towerMuzzle(source)!.distanceTo(fixed)).toBeCloseTo(0);
  } finally { map.dispose(); mock.mockRestore(); }
 });
 it('releases all impact pixels at 240ms and separates red and blue atlas rows', () => {
  for (const team of ['blue', 'red'] as const) {
   expect(towerImpactPose(team, -.01).visible).toBe(false);
   expect(towerImpactPose(team, .24)).toMatchObject({ visible: false, alpha: 0 });
   expect(towerImpactPose(team, .01).frame).toBe(team === 'blue' ? 8 : 12);
  }
 });
});
