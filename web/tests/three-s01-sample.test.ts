import { describe, expect, it, vi } from 'vitest';
import { InstancedMesh, Mesh, Texture, TextureLoader } from 'three';
import { S01Environment, sampleContains } from '../src/render-three/S01Environment';
import { atlasRect } from '../src/render-three/ActorSprites';
import { toThree } from '../src/render-three/Coordinates';
import { bridgePoint } from '../src/game/Bridge';

describe('P2 S01 scene and sprite contract (no browser rendering)', () => {
  it('assembles real scene geometry, keeps the tower anchor and shares six source textures', () => {
    const textures: Texture[] = [];
    const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => {
      const texture = new Texture<HTMLImageElement>(); textures.push(texture); return texture;
    });
    let environment: S01Environment | undefined;
    try {
      environment = new S01Environment();
      expect(load).toHaveBeenCalledTimes(6);
      expect(environment.towerViews.get('blue')!.position.distanceTo(toThree(bridgePoint(-195)))).toBeLessThan(1e-8);
      let tileCount = 0, meshCount = 0;
      environment.group.traverse(object => {
        if (object instanceof InstancedMesh) tileCount += object.count;
        if (object instanceof Mesh) {
          meshCount++;
          const position = object.geometry.getAttribute('position');
          for (let i = 0; i < position.count; i++) expect(Number.isFinite(position.getX(i) + position.getY(i) + position.getZ(i))).toBe(true);
        }
      });
      expect(tileCount).toBeGreaterThan(100); expect(meshCount).toBeGreaterThan(20);
      const namesBefore = environment.group.children.length;
      environment.update(1, true); environment.update(1, true);
      expect(environment.group.children).toHaveLength(namesBefore);
      environment.update(2, false); expect(environment.towerViews.get('blue')!.visible).toBe(false);
      const disposals = textures.map(texture => vi.spyOn(texture, 'dispose'));
      environment.dispose(); environment.dispose();
      for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
    } finally { environment?.dispose(); load.mockRestore(); }
  });
  it('maps first/last atlas cells without stretching margins or selecting empty frames', () => {
    expect(atlasRect(0, 128, 128, 512, 512)).toEqual({ left: 0, right: 0.25, top: 1, bottom: 0.75 });
    expect(atlasRect(15, 128, 128, 512, 512)).toEqual({ left: 0.75, right: 1, top: 0.25, bottom: 0 });
    expect(() => atlasRect(16, 128, 128, 512, 512)).toThrow();
    expect(() => atlasRect(1.5, 128, 128, 512, 512)).toThrow();
    expect(() => atlasRect(0, 128, 128, 500, 512)).toThrow();
    expect(() => atlasRect(0, 0, 128, 512, 512)).toThrow();
  });
  it('keeps the declared sample boundary separate from gameplay/map coordinates', () => {
    expect(sampleContains(-195, 0)).toBe(true); expect(sampleContains(-18, 0)).toBe(true);
    expect(sampleContains(-281, 0)).toBe(false); expect(sampleContains(81, 0)).toBe(false);
    expect(sampleContains(0, 113)).toBe(false);
  });
});
