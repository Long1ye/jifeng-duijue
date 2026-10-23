import { describe, expect, it, vi } from 'vitest';
import { MeshBasicMaterial } from 'three';
import { YASUO_Q_HIT_SECONDS } from '../src/game/YasuoQ';
import { classicQPose, drawClassicQThrust, drawClassicQContact, CLASSIC_Q_DURATION } from '../src/render/ClassicQVfx';
import { installClassicQBody } from '../src/render-three/ClassicQMaterial';
import type { Point } from '../src/game/types';

describe('classic ordinary Q presentation', () => {
 it('stays hidden before contact, extends during the stab, and finishes before body recovery', () => {
  const stroke = vi.fn(), brush = { stroke };
  drawClassicQThrust(brush, YASUO_Q_HIT_SECONDS - .001, 0); expect(stroke).not.toHaveBeenCalled();
  const early = classicQPose(YASUO_Q_HIT_SECONDS, 0), extended = classicQPose(YASUO_Q_HIT_SECONDS + .03, 0);
  expect(extended.reach).toBeGreaterThan(early.reach);
  drawClassicQThrust(brush, YASUO_Q_HIT_SECONDS + .03, 0); expect(stroke).toHaveBeenCalled();
  stroke.mockClear(); drawClassicQThrust(brush, YASUO_Q_HIT_SECONDS + CLASSIC_Q_DURATION + .001, 0); expect(stroke).not.toHaveBeenCalled();
 });
 it('rotates a narrow wind envelope continuously for all eight aiming directions', () => {
  for (let i = 0; i < 8; i++) {
   const heading = i * Math.PI / 4, age = YASUO_Q_HIT_SECONDS + .04, pose = classicQPose(age, heading), points: Point[] = [];
   drawClassicQThrust({ stroke: (a, b) => { points.push(a, b); } }, age, heading);
   const forward = points.map(p => (p.x - pose.hand.x) * Math.cos(heading) + (p.y - pose.hand.y) * Math.sin(heading));
   const sideways = points.map(p => -(p.x - pose.hand.x) * Math.sin(heading) + (p.y - pose.hand.y) * Math.cos(heading));
   expect(Math.min(...forward)).toBeGreaterThanOrEqual(2.9); expect(Math.max(...forward)).toBeGreaterThan(100);
   expect(Math.max(...sideways.map(Math.abs))).toBeLessThan(12);
   expect(points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
  }
 });
 it('ends contact wisps independently and preserves existing actor lighting shader hooks', () => {
  const stroke = vi.fn(); drawClassicQContact({ stroke }, .05, Math.PI); expect(stroke).toHaveBeenCalled();
  stroke.mockClear(); drawClassicQContact({ stroke }, .201, 0); expect(stroke).not.toHaveBeenCalled();
  const material = new MeshBasicMaterial(), previous = vi.fn((shader: { fragmentShader: string }) => { shader.fragmentShader += '\n// original actor lighting'; });
  material.onBeforeCompile = previous;
  const controls = installClassicQBody(material);
  const shader = { uniforms: {}, fragmentShader: '#include <map_fragment>', vertexShader: '' } as unknown as Parameters<typeof material.onBeforeCompile>[0];
  material.onBeforeCompile(shader, {} as Parameters<typeof material.onBeforeCompile>[1]);
  expect(previous).toHaveBeenCalledOnce(); expect(shader.fragmentShader).toContain('original actor lighting');
  expect(shader.uniforms.classicQBody).toBe(controls.enabled); expect(controls.enabled.value).toBe(0);
  expect(shader.fragmentShader).toContain('sampledDiffuseColor.rgb'); expect(shader.fragmentShader).toContain('discard'); material.dispose();
 });
});
