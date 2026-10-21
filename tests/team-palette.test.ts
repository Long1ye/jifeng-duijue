import { expect, it } from 'vitest';
import { MeshBasicMaterial } from 'three';
import { applyTeamAccent, mapTeamAt, teamAccentRGB } from '../src/render-three/TeamPalette';

it('keeps stone, snow and flame neutral while making blue energy ruby red', () => {
  const crystal = [.2,.5,1];
  const red = teamAccentRGB(crystal,'red');
  expect(red[0]).toBeGreaterThan(red[2]*2); expect(red[0]).toBeGreaterThan(red[1]*2);
  expect(teamAccentRGB(crystal,'blue')).toEqual(crystal);
  for (const neutral of [[.8,.87,.95],[.3,.4,.5],[.12,.16,.25],[1,.5,.1]]) expect(teamAccentRGB(neutral,'red')).toEqual(neutral);
  expect([-400,0,400].map(mapTeamAt)).toEqual(['blue','neutral','red']);
});

it('composes team accents with flag wind and uses different shader cache keys', () => {
  const material = new MeshBasicMaterial();
  material.onBeforeCompile = shader => { shader.vertexShader += '\n// retained wind'; };
  material.customProgramCacheKey = () => 'flag-wind';
  applyTeamAccent(material,'red');
  const shader = { fragmentShader: '#include <map_fragment>', vertexShader: '', uniforms: {} };
  material.onBeforeCompile(shader as never, {} as never);
  expect(shader.vertexShader).toContain('retained wind'); expect(shader.fragmentShader).toContain('teamMask');
  expect(material.customProgramCacheKey()).toContain('flag-wind-team-accent-v1-red');
  material.dispose();
});
