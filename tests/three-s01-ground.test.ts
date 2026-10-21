import { describe, expect, it, vi } from 'vitest';
import { Mesh, Texture } from 'three';
import { createS01Ground, groundCover, groundZone, S01_GROUND_TOP } from '../src/render-three/S01Ground';
import { disposeSceneResources } from '../src/render-three/SceneResources';
import { BRIDGE, onPlayableBridge } from '../src/game/Bridge';
import { unproject } from '../assets/map-studies/howling-abyss-v1/geometry';

describe('Howling Abyss S01 ground contract', () => {
  it('gives the tower, central seal and repairs distinct regions while keeping the main road clear of snow and lichen', () => {
    expect(groundZone(-195, 0)).toBe('tower'); expect(groundZone(-6, 0)).toBe('emblem');
    expect(groundZone(-126, 15)).toBe('repair'); expect(groundZone(-150, 0)).toBe('road');
    for (let u = -280; u <= 80; u += 2) {
      for (const v of [-40, 0, 40]) { const cover = groundCover(u, v); expect(cover.snow).toBeLessThan(-0.3); expect(cover.moss).toBeLessThan(-0.12); }
      expect(groundCover(u, 104).snow).toBeGreaterThan(0.28);
      expect(groundCover(u, -104).moss).toBeGreaterThan(-0.12);
      const a = groundCover(u, 86), b = groundCover(u + 0.01, 86);
      expect(Math.abs(a.snow - b.snow)).toBeLessThan(0.01); // No independent per-tile terrain choice.
    }
  });
  it('keeps every vertex inside the decorative sample and playable bridge, below actor shadows, with eight merged surface draws', () => {
    const textures = { rubble: new Texture(), repair: new Texture(), ice: new Texture() };
    const disposals = Object.values(textures).map(texture => vi.spyOn(texture, 'dispose'));
    const group = createS01Ground(textures);
    try {
      expect(group.children).toHaveLength(8);
      let triangles = 0;
      for (const object of group.children) {
        expect(object).toBeInstanceOf(Mesh); const mesh = object as Mesh;
        expect(mesh.castShadow).toBe(false); expect(mesh.receiveShadow).toBe(true);
        const positions = mesh.geometry.getAttribute('position'); triangles += mesh.geometry.index!.count / 3;
        for (let i = 0; i < positions.count; i++) {
          const point = { x: positions.getX(i) + 3100, y: positions.getZ(i) + 1700 };
          const [u, v] = unproject(BRIDGE, point.x, point.y);
          expect(u).toBeGreaterThanOrEqual(-280.001); expect(u).toBeLessThanOrEqual(80.001);
          expect(Math.abs(v)).toBeLessThanOrEqual(104.001); expect(onPlayableBridge(point)).toBe(true);
          expect(positions.getY(i)).toBeLessThanOrEqual(S01_GROUND_TOP + 1e-6);
        }
      }
      expect(triangles).toBeLessThan(45000);
    } finally { disposeSceneResources(group); }
    for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
  });
});
