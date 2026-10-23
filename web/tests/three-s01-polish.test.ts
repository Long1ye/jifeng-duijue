import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Mesh, Texture, TextureLoader } from 'three';
import { actorEnvironmentTint, contactShadowTexture, firePulse, S01_TORCHES, towerPlayerOpacity } from '../src/render-three/S01Look';
import { S01Environment, worldUV } from '../src/render-three/S01Environment';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { bridgePoint } from '../src/game/Bridge';

describe('S01 polish presentation boundaries', () => {
  it('preserves world texel density on top and vertical faces with different physical sizes', () => {
    const geometry = worldUV(new BoxGeometry(64, 80, 128));
    const normal = geometry.getAttribute('normal'), uv = geometry.getAttribute('uv');
    const upper: number[] = [], front: number[] = [];
    for (let i = 0; i < normal.count; i++) { if (normal.getY(i) > 0.99) upper.push(i); if (normal.getZ(i) > 0.99) front.push(i); }
    const span = (indices: number[], axis: 'x' | 'y') => {
      const values = indices.map(i => axis === 'x' ? uv.getX(i) : uv.getY(i)); return Math.max(...values) - Math.min(...values);
    };
    expect(span(upper, 'x')).toBeCloseTo(1); expect(span(upper, 'y')).toBeCloseTo(2);
    expect(span(front, 'x')).toBeCloseTo(1); expect(span(front, 'y')).toBeCloseTo(1.25); geometry.dispose();
  });
  it('warms only actors near environmental fires and is deterministic on a stopped simulation clock', () => {
    const fire = S01_TORCHES[0], far = actorEnvironmentTint({ x: 0, y: 0 }, 2, 'blue');
    const near = actorEnvironmentTint(fire, 2, 'blue');
    expect(near.r).toBeGreaterThan(far.r); expect(near.b).toBeLessThan(far.b);
    expect(actorEnvironmentTint(fire, 2, 'blue')).toEqual(near);
    for (let tick = 0; tick < 100; tick++) {
      const pulse = firePulse(tick / 60, fire.phase); expect(pulse).toBeGreaterThanOrEqual(0.92); expect(pulse).toBeLessThanOrEqual(1.08);
    }
  });
  it('keeps a transparent shadow border and a denser center without smoothing the pixel sampler', () => {
    const texture = contactShadowTexture(), data = texture.image.data as Uint8Array;
    expect(data[3]).toBe(0); expect(data[(16 * 32 + 16) * 4 + 3]).toBeGreaterThan(220);
    const alpha = new Set<number>(); for (let i = 3; i < data.length; i += 4) alpha.add(data[i]);
    expect(alpha.size).toBeGreaterThan(3); expect(alpha.size).toBeLessThanOrEqual(7); texture.dispose();
  });
  it('only fades a tower covering the player torso, freezes opacity on pause and resets without fading the floor', () => {
    const camera = new ThreeCamera(), anchor = bridgePoint(-195); camera.lookAt(anchor);
    const actor = { x: anchor.x, y: anchor.y - 10 };
    expect(towerPlayerOpacity(actor, anchor, 78, camera)).toBeLessThan(1);
    expect(towerPlayerOpacity({ x: anchor.x, y: anchor.y + 20 }, anchor, 78, camera)).toBe(1);
    expect(towerPlayerOpacity({ x: anchor.x + 200, y: anchor.y - 10 }, anchor, 78, camera)).toBe(1);
    const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation(() => new Texture<HTMLImageElement>());
    const environment = new S01Environment();
    try {
      const ctx = { point: actor, height: 78, camera };
      environment.update(1, true, ctx);
      const towerMesh = environment.towerViews.get('blue')!.children.find(object => object instanceof Mesh) as Mesh;
      const material = Array.isArray(towerMesh.material) ? towerMesh.material[0] : towerMesh.material;
      const opacity = material.opacity; expect(opacity).toBeLessThan(1); expect(material.depthWrite).toBe(false);
      environment.update(1, true, ctx); expect(material.opacity).toBe(opacity);
      const outsideTower = environment.group.children.filter(object => object instanceof Mesh) as Mesh[];
      for (const mesh of outsideTower) for (const mat of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) expect(mat.opacity).toBe(1);
      environment.update(0, true); expect(material.opacity).toBe(1); expect(material.transparent).toBe(false);
    } finally { environment.dispose(); load.mockRestore(); }
  });
});
