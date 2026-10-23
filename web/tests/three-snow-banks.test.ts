import { afterEach, expect, it, vi } from 'vitest';
import { Mesh, MeshBasicMaterial, Texture, TextureLoader } from 'three';
import { SNOW_BANK_ART, SNOW_BANK_PLACEMENTS, SnowBanks, snowBankGeometry } from '../src/render-three/SnowBanks';
import { QualitySettings } from '../src/render-three/QualitySettings';
import { EnvironmentIllumination } from '../src/render-three/EnvironmentIllumination';
import { ART_BRUSHES, ART_BRAZIERS } from '../src/render-three/PaintedMapLayout';
import { BRIDGE } from '../src/game/Bridge';

afterEach(() => vi.restoreAllMocks());

it('keeps shallow snow thickness while preserving the source projection at 45 degrees', () => {
  const width = 190, geometry = snowBankGeometry(width), [w, h] = SNOW_BANK_ART.size;
  try {
    const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      expect(p.getY(i)).toBeGreaterThan(1); expect(p.getY(i)).toBeLessThanOrEqual(1.2 + SNOW_BANK_ART.maxHeight + .0001);
      expect((p.getY(i) - p.getZ(i)) / Math.SQRT2).toBeCloseTo((SNOW_BANK_ART.anchor[1] - (1 - uv.getY(i)) * h) * width / w, 4);
      expect(p.getX(i)).toBeCloseTo((uv.getX(i) * w - SNOW_BANK_ART.anchor[0]) * width / w, 4);
    }
    for (const p of SNOW_BANK_PLACEMENTS) {
      const halfLength = p.width / Math.abs(BRIDGE.projection.along[0]) / 2;
      expect(ART_BRUSHES.some(b => Math.sign(b.v) === p.side && Math.abs(p.u - b.u) < b.length / 2 + halfLength + 3)).toBe(false);
      expect(ART_BRAZIERS.some(b => Math.sign(b.v) === p.side && Math.abs(p.u - b.u) < halfLength + 9)).toBe(false);
    }
  } finally { geometry.dispose(); }
});

it('shares its texture with contact shadows, remains depth-tested and releases owned resources once', () => {
  const maps: Texture<HTMLImageElement>[] = [], loaded: (() => void)[] = [];
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const map = new Texture<HTMLImageElement>(); maps.push(map); loaded.push(() => done?.(map)); return map;
  });
  const quality = new QualitySettings(), snow = new SnowBanks(quality, new EnvironmentIllumination([]));
  const children: Mesh<import('three').BufferGeometry, MeshBasicMaterial>[] = [];
  snow.group.traverse(o => { if (o instanceof Mesh) children.push(o); });
  const textureDisposes = maps.map(map => vi.spyOn(map, 'dispose')), geometryDisposes = children.map(m => vi.spyOn(m.geometry, 'dispose'));
  expect(children).toHaveLength(4); expect(maps).toHaveLength(2);
  expect(children.every(m => maps.includes(m.material.map as Texture<HTMLImageElement>) && m.material.depthTest && m.renderOrder === 0)).toBe(true);
  expect(snow.group.visible).toBe(false); loaded[0](); snow.update(); expect(snow.group.visible).toBe(true);
  snow.setVariety(false); expect(snow.group.visible).toBe(false); loaded[1](); snow.update(); expect(snow.group.visible).toBe(true);
  expect(snow.varieties.group.visible).toBe(false); snow.setVariety(true); expect(snow.varieties.group.visible).toBe(true);
  quality.winter.value = 0; snow.update(); expect(snow.group.visible).toBe(false);
  quality.winter.value = 1; quality.reduced = true; snow.update(); expect(snow.group.visible).toBe(true);
  snow.dispose(); snow.dispose(); loaded.forEach(done => done());
  textureDisposes.forEach(spy => expect(spy).toHaveBeenCalledOnce()); geometryDisposes.forEach(spy => expect(spy).toHaveBeenCalledOnce());
  expect(snow.group.children).toHaveLength(0);
});
