import { expect, it, vi } from 'vitest';
import { GroundSnow, GROUND_SNOW } from '../src/render-three/GroundSnow';
import { QualitySettings } from '../src/render-three/QualitySettings';
import { RavenBehavior } from '../src/render-three/RavenBehavior';
import { ravenPerches } from '../src/render-three/MapRavens';

it('uses fixed geometry, shares the simulation clock, supports quality fallback and releases instance resources once', () => {
  const quality = new QualitySettings(), snow = new GroundSnow(quality), material = snow.mesh.material;
  expect(snow.mesh.count).toBe(GROUND_SNOW.count); expect(snow.mesh.geometry.getAttribute('gustSeed').count).toBe(GROUND_SNOW.count);
  expect(material.depthTest).toBe(true); expect(material.depthWrite).toBe(false);
  snow.update(8); expect(material.uniforms.environmentTime.value).toBe(8);
  snow.update(8); expect(material.uniforms.environmentTime.value).toBe(8);
  quality.weather.value = 0; snow.update(8); expect(snow.group.visible).toBe(false);
  quality.weather.value = 1; quality.reduced = true; snow.update(8); expect(snow.group.visible).toBe(false);
  quality.reduced = false; snow.update(0); expect(snow.group.visible).toBe(true); expect(material.uniforms.environmentTime.value).toBe(0);
  const geometry = vi.spyOn(snow.mesh.geometry, 'dispose'), instance = vi.spyOn(snow.mesh, 'dispose'), shader = vi.spyOn(material, 'dispose');
  snow.dispose(); snow.dispose(); expect(geometry).toHaveBeenCalledOnce(); expect(instance).toHaveBeenCalledOnce(); expect(shader).toHaveBeenCalledOnce();
});

it('gives each raven two opposite wall perches and a continuous airborne crossing of the lane', () => {
  for (const route of ravenPerches()) {
    expect(route[0].v).toBeLessThan(-100); expect(route[1].v).toBeGreaterThan(100);
    const bird = new RavenBehavior(route, 0); let crossed = false, landed = false;
    let lastV = route[0].v;
    for (let i = 0; i < 900; i++) {
      bird.update(i / 60, []);
      if (bird.state === 'flying' && Math.abs(bird.v) < 30) crossed = true;
      if (bird.state === 'perched' && bird.v > 100) landed = true;
      expect(Math.abs(bird.v - lastV)).toBeLessThan(5); lastV = bird.v;
    }
    expect(crossed).toBe(true); expect(landed).toBe(true);
  }
});
