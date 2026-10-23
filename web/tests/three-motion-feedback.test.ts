import { describe, expect, it } from 'vitest';
import { Group, Matrix4, MeshBasicMaterial, Vector3 } from 'three';
import { applyTeamAccent, teamAccentRGB } from '../src/render-three/TeamPalette';
import { crystalAccents, sanctuaryFireMotion } from '../src/render-three/MaterialAccents';
import { LivingFire } from '../src/render-three/LivingFire';

describe('reported environment animation regressions', () => {
  it('recolors pale blue ice facets without recoloring neutral snow', () => {
    for (const facet of [[.55, .65, .8], [.4, .65, .9], [.2, .5, 1]]) {
      const red = teamAccentRGB(facet, 'red', 'ice');
      expect(red[0]).toBeGreaterThan(red[2] * 1.5);
      expect(teamAccentRGB(facet, 'blue', 'ice')).toEqual(facet);
    }
    expect(teamAccentRGB([.8, .87, .95], 'red', 'ice')).toEqual([.8, .87, .95]);
  });
  it('runs crystal light after the team palette and separates red/blue GPU programs', () => {
    const red = new MeshBasicMaterial(), blue = new MeshBasicMaterial(), time = { value: 0 };
    try {
      applyTeamAccent(red, 'red', 'ice'); applyTeamAccent(blue, 'blue', 'ice');
      crystalAccents(red, time); crystalAccents(blue, time);
      const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <map_fragment>\n#include <color_fragment>' };
      red.onBeforeCompile(shader as never, {} as never);
      expect(shader.fragmentShader.indexOf('vec3 teamSource')).toBeLessThan(shader.fragmentShader.indexOf('float cold'));
      expect(shader.fragmentShader).toContain('vec3 accent = vec3(1.0, 0.45, 0.27)');
      expect(red.customProgramCacheKey()).not.toEqual(blue.customProgramCacheKey());
    } finally { red.dispose(); blue.dispose(); }
  });
  it('keeps every fire vertex on the vertical source plane instead of crossing into charcoal depth', () => {
    const source = new Group(); source.position.set(5, 7, 11);
    const fire = new LivingFire([source]);
    try {
      const matrix = new Matrix4(); fire.mesh.getMatrixAt(0, matrix);
      for (const x of [-.5, .5]) for (const y of [-.5, .5]) {
        const vertex = new Vector3(x, y, 0).applyMatrix4(matrix);
        expect(vertex.z).toBeCloseTo(11.6, 5);
      }
      expect(new Vector3(0, -.5, 0).applyMatrix4(matrix).y).toBeCloseTo(51.5, 5);
    } finally { fire.dispose(); }
  });
  it('shares simulation time with wall fires and retains existing shader hooks', () => {
    const material = new MeshBasicMaterial(), time = { value: 2 };
    material.onBeforeCompile = shader => { shader.vertexShader += '\n// keep wall'; };
    sanctuaryFireMotion(material, time);
    const shader = { uniforms: {} as Record<string, { value: number }>, vertexShader: '', fragmentShader: '#include <map_fragment>' };
    material.onBeforeCompile(shader as never, {} as never);
    expect(shader.vertexShader).toContain('keep wall'); expect(shader.uniforms.wallFireTime).toBe(time);
    time.value = 0; expect(shader.uniforms.wallFireTime.value).toBe(0); material.dispose();
  });
});
