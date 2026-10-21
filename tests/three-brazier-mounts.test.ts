import { expect, it, vi } from 'vitest';
import { Mesh, MeshBasicMaterial, Points, Texture, TextureLoader } from 'three';
import { ART_BRAZIERS, ART_NEAR_BRAZIERS, artBrazierMount, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { ICE_PLACEMENTS } from '../src/render-three/ArchitecturalIce';
import { PaintedBridgeSample } from '../src/render-three/PaintedBridgeSample';
import { BridgeAtmosphere } from '../src/render-three/BridgeAtmosphere';
import { bridgePoint, onPlayableBridge } from '../src/game/Bridge';
import { toThree } from '../src/render-three/Coordinates';

it('replaces the foreground crystals with bowls at the same narrow shoulder sites', () => {
  expect(ART_NEAR_BRAZIERS).toHaveLength(7);
  for (const site of ART_NEAR_BRAZIERS) {
    expect(ART_BRAZIERS).toContain(site);
    expect(ICE_PLACEMENTS.some(p => p.u === site.u && p.side === 1 && p.attachment === 'ground')).toBe(false);
    expect(artEdgeV(site.u) - site.v).toBe(14);
  }
});

it('keeps bowls on the deck inside the fence and shares that mount with embers', () => {
  const loader = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
    const texture = new Texture<HTMLImageElement>(); done?.(texture); return texture;
  });
  const bridge = new PaintedBridgeSample(), atmosphere = new BridgeAtmosphere();
  try {
    const bowls = bridge.group.children.filter(o => o.name === 'painted-fire-bowl') as Mesh[];
    const embers = atmosphere.group.children.find(o => o instanceof Points) as Points;
    const vertices = embers.geometry.getAttribute('position');
    ART_BRAZIERS.forEach(({ u, v }, index) => {
      const mount = artBrazierMount(u, v), bowl = bowls[index];
      const expected = toThree(bridgePoint(mount.u, mount.v), mount.height);
      expect(bowl.position.distanceTo(expected)).toBeLessThan(.001);
      const material = bowl.material as MeshBasicMaterial;
      expect(material.depthTest && material.depthWrite).toBe(true);
      expect(bowl.renderOrder).toBe(0);
      if (v > 0) {
        expect(artEdgeV(u) - mount.v).toBe(14);
        expect(onPlayableBridge(bridgePoint(mount.u, mount.v))).toBe(true);
      } else expect(mount).toEqual({ u, v, height: .7 });
      expect(mount.height).toBe(.7);
      expect(mount.u).toBe(u);
      expect(vertices.getX(index * 5)).toBeCloseTo(expected.x, 3);
      expect(vertices.getZ(index * 5)).toBeCloseTo(expected.z, 3);
      expect(vertices.getY(index * 5)).toBeCloseTo(expected.y + 27.3, 3);
    });
  } finally { bridge.dispose(); atmosphere.dispose(); loader.mockRestore(); }
});
