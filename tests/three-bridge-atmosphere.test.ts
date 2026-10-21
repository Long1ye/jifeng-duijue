import { expect, it, vi } from 'vitest';
import { Mesh, Points, ShaderMaterial } from 'three';
import { BridgeAtmosphere } from '../src/render-three/BridgeAtmosphere';
import { ART_BRAZIERS } from '../src/render-three/PaintedMapLayout';
import { QualitySettings } from '../src/render-three/QualitySettings';
import { ThreeCamera, toThree } from '../src/render-three/Coordinates';

it('keeps mist below the deck and sparse embers on the shared pause/restart clock', () => {
  const atmosphere = new BridgeAtmosphere();
  const embers = atmosphere.group.children.find(o => o instanceof Points) as Points;
  const material = embers.material as ShaderMaterial;
  expect(embers.geometry.getAttribute('position').count).toBe(ART_BRAZIERS.length * 5);
  for (const mist of atmosphere.group.children.filter(o => o instanceof Mesh)) expect(mist.position.y).toBeLessThan(-300);
  atmosphere.update(8); expect(material.uniforms.environmentTime.value).toBe(8);
  atmosphere.update(8); expect(material.uniforms.environmentTime.value).toBe(8);
  atmosphere.update(0); expect(material.uniforms.environmentTime.value).toBe(0);
  atmosphere.update(NaN); expect(material.uniforms.environmentTime.value).toBe(0);
  const objects = atmosphere.group.children as (Mesh | Points)[];
  const geometries = objects.map(o => vi.spyOn(o.geometry, 'dispose'));
  const materials = [...new Set(objects.map(o => o.material as ShaderMaterial))].map(m => vi.spyOn(m, 'dispose'));
  atmosphere.dispose(); atmosphere.dispose();
  geometries.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  materials.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
  expect(atmosphere.group.children).toHaveLength(0);
});

it('shares the grading toggle with all canyon mist layers and restores its baseline without changing the clock', () => {
  const quality = new QualitySettings(), atmosphere = new BridgeAtmosphere(quality);
  const mists = atmosphere.group.children.filter(o => o.name === 'bridge-canyon-mist') as Mesh[];
  atmosphere.update(3);
  for (const mist of mists) {
    const material = mist.material as ShaderMaterial;
    expect(material.uniforms.canyonGrade).toBe(quality.grading);
    expect(material.uniforms.environmentTime.value).toBe(3);
  }
  quality.setEnhanced(false);
  for (const mist of mists) expect((mist.material as ShaderMaterial).uniforms.canyonGrade.value).toBe(0);
  atmosphere.update(3); expect((mists[0].material as ShaderMaterial).uniforms.environmentTime.value).toBe(3);
  atmosphere.dispose();
});

it('covers a moving camera with a fixed snow allocation, shares an independent weather toggle and disables in light mode', () => {
  const quality = new QualitySettings(), atmosphere = new BridgeAtmosphere(quality), camera = new ThreeCamera();
  const snow = atmosphere.group.getObjectByName('bridge-sparse-snow') as Points;
  const material = snow.material as ShaderMaterial, seeds = snow.geometry.getAttribute('snowSeed');
  const original = Array.from(seeds.array); const geometry = snow.geometry;
  camera.lookAt({ x: 1000, y: 1500 }); atmosphere.update(3, camera);
  const expected = toThree(camera.focus);
  expect(material.uniforms.snowCenter.value.x).toBe(expected.x); expect(material.uniforms.snowCenter.value.y).toBe(expected.z);
  expect(material.uniforms.weatherQuality).toBe(quality.weather);
  quality.materials.value = 0; expect(material.uniforms.weatherQuality.value).toBe(1);
  camera.panScreen(200, 100); atmosphere.update(3, camera);
  expect(material.uniforms.snowCenter.value.x).not.toBe(expected.x);
  expect(material.uniforms.environmentTime.value).toBe(3); expect(snow.geometry).toBe(geometry); expect(Array.from(seeds.array)).toEqual(original);
  quality.setEnhanced(false); expect(material.uniforms.weatherQuality.value).toBe(0);
  atmosphere.setQuality(true); expect(snow.visible).toBe(false); atmosphere.setQuality(false); expect(snow.visible).toBe(true);
  atmosphere.dispose();
});
