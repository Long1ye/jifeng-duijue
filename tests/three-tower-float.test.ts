import { expect, it, vi } from 'vitest';
import { Mesh, MeshBasicMaterial, Texture, TextureLoader, Vector3 } from 'three';
import { PaintedMapLandmarks } from '../src/render-three/PaintedMapLandmarks';
import { towerCrystalLayer, towerCrystalOffset, TOWER_FLOAT } from '../src/render-three/TowerCrystal';
import { bridgePoint } from '../src/game/Bridge';
import { crystalAnchor } from '../src/render-three/CrystalMotes';
import { ThreeCamera } from '../src/render-three/Coordinates';

it('keeps the crystal above its seat with a closed, deterministic float cycle', () => {
  for (let time = 0; time < 20; time += .05) {
    const offset = towerCrystalOffset(time, 1.3);
    expect(offset.y).toBeGreaterThanOrEqual(TOWER_FLOAT.lift - TOWER_FLOAT.amplitude);
    expect(offset.y).toBeLessThanOrEqual(TOWER_FLOAT.lift + TOWER_FLOAT.amplitude);
    expect(towerCrystalOffset(time, 1.3)).toEqual(offset);
    expect(towerCrystalOffset(time + TOWER_FLOAT.period, 1.3).y).toBeCloseTo(offset.y);
  }
});

it('separates all eight crystals, shares attack energy and textures, follows fading and releases geometry', () => {
  const loads: (() => void)[] = [];
  const mock = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => { const texture = new Texture<HTMLImageElement>(); loads.push(() => done?.(texture)); return texture; });
  const map = new PaintedMapLandmarks();
  try {
    loads.forEach(done => done()); map.update(0, bridgePoint(0));
    const crystals: Mesh[] = []; map.group.traverse(o => { if (o.name === 'floating-tower-crystal') crystals.push(o as Mesh); });
    expect(crystals).toHaveLength(8);
    const tower = crystals[0].parent as Mesh, stone = tower.geometry.getAttribute('position').array.slice(), start = crystals[0].position.clone();
    // A depth retreat must preserve the authored 45° projection, rather than
    // shifting the crystal artwork or leaving it coplanar with the stone seat.
    const camera = new ThreeCamera(); camera.setElevation(45);
    const anchor = crystalAnchor(tower, .5, .78), original = tower.geometry.getAttribute('position'), inset = crystals[0].geometry.getAttribute('position');
    for (let i = 0; i < original.count; i++) {
      const a = new Vector3().fromBufferAttribute(original, i).project(camera.camera);
      const b = new Vector3().fromBufferAttribute(inset, i).add(anchor).project(camera.camera);
      expect(b.x).toBeCloseTo(a.x, 5); expect(b.y).toBeCloseTo(a.y, 5);
      expect(b.z).toBeGreaterThan(a.z);
    }
    expect((crystals[0].material as MeshBasicMaterial).map).toBe((tower.material as MeshBasicMaterial).map);
    const outer = crystals.find(c => c.parent!.name === 'painted-tower')!;
    expect((outer.material as MeshBasicMaterial).userData.energy).toBe(((outer.parent as Mesh).material as MeshBasicMaterial).userData.energy);
    expect((outer.material as MeshBasicMaterial).customProgramCacheKey()).not.toBe(((outer.parent as Mesh).material as MeshBasicMaterial).customProgramCacheKey());
    map.update(1.2, bridgePoint(0)); expect(crystals[0].position.y).not.toBe(start.y);
    expect(tower.geometry.getAttribute('position').array).toEqual(stone);
    const paused = crystals[0].position.clone(); map.update(1.2, bridgePoint(0)); expect(crystals[0].position).toEqual(paused);
    map.update(0, bridgePoint(0)); expect(crystals[0].position).toEqual(start);
    map.towerFloatEnabled = false; map.update(0, bridgePoint(0)); expect(crystals.every(c => !c.visible)).toBe(true);
    const geometryDispose = crystals.map(c => vi.spyOn(c.geometry, 'dispose')); map.dispose(); map.dispose(); geometryDispose.forEach(d => expect(d).toHaveBeenCalledTimes(1));
  } finally { map.dispose(); mock.mockRestore(); }
});

it('composes the crystal cutout with the existing shader and preserves white facets by geometric masking', () => {
  const m = new MeshBasicMaterial(), enabled = { value: 1 };
  m.onBeforeCompile = shader => { shader.fragmentShader += '\n// existing facets'; };
  towerCrystalLayer(m, enabled, true);
  const shader = { uniforms: {}, vertexShader: '', fragmentShader: '#include <map_fragment>' };
  m.onBeforeCompile(shader as never, {} as never);
  expect(shader.fragmentShader).toContain('existing facets'); expect(shader.fragmentShader).toContain('towerCrystalMask(vMapUv)');
  expect(shader.uniforms).toHaveProperty('towerFloatEnabled', enabled); m.dispose();
});
