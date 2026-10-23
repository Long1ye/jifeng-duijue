import { describe, expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader, Vector3 } from 'three';
import { PAINTED_GUARDIAN, PAINTED_PIER_U, PAINTED_PILLARS, PaintedBridgeSample, paintedArchGeometry, paintedReliefGeometry } from '../src/render-three/PaintedBridgeSample';
import { ThreeCamera, WORLD_ORIGIN } from '../src/render-three/Coordinates';
import { bridgePoint } from '../src/game/Bridge';
import { ART_PIERS } from '../src/render-three/PaintedMapLayout';

describe('painted fixed-view architecture', () => {
  it('recovers depth and heights while retaining the pillar artwork projection at 45 degrees', () => {
    const geometry = paintedReliefGeometry(undefined, 80, 84);
    const camera = new ThreeCamera(); camera.setElevation(45); camera.lookAt(WORLD_ORIGIN);
    const p = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    const origin = camera.project(WORLD_ORIGIN);
    const scale = camera.size.height / (camera.camera.top - camera.camera.bottom);
    let checked = 0;
    for (let i = 0; i < p.count; i++) {
      const px = uv.getX(i) * PAINTED_GUARDIAN.width;
      if (px > 640) continue; // Attached wall has a deliberate bridge-axis correction.
      const py = (1 - uv.getY(i)) * PAINTED_GUARDIAN.height;
      const projected = new Vector3(p.getX(i), p.getY(i), p.getZ(i)).project(camera.camera);
      expect((projected.x + 1) * camera.size.width / 2 - origin.x).toBeCloseTo((px - 400) * .25 * scale, 3);
      expect((1 - projected.y) * camera.size.height / 2 - origin.y).toBeCloseTo((py - 1205) * .25 * scale, 3);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.y).toBeGreaterThan(350);
    expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeGreaterThan(100);
    geometry.dispose();
  });
  it('keeps opaque depth tests and alpha-tested shadow silhouettes; releases shared maps once even after late loads', () => {
    const loads: { map: Texture; done(): void }[] = [];
    const loader = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
      const map = new Texture<HTMLImageElement>(); loads.push({ map, done: () => done?.(map) }); return map;
    });
    const sample = new PaintedBridgeSample();
    try {
      const guardian = sample.group.getObjectByName('painted-guardian-pillar') as Mesh;
      expect(guardian.visible).toBe(false);
      loads.forEach(item => item.done()); sample.update(1, bridgePoint(-10));
      expect(guardian.visible).toBe(true);
      const materials = Array.isArray(guardian.material) ? guardian.material : [guardian.material];
      expect(materials[0].depthWrite).toBe(true); expect(materials[0].depthTest).toBe(true);
      expect(guardian.customDepthMaterial?.alphaTest).toBe(.48);
      const before = guardian.quaternion.clone();
      const camera = new ThreeCamera(); camera.lookAt(bridgePoint(30, 50));
      sample.update(4, bridgePoint(20), camera);
      expect(guardian.quaternion.equals(before)).toBe(true);
      const behind = bridgePoint(PAINTED_PILLARS[0].u, 100);
      sample.update(4.1, behind, camera);
      expect(materials[0].transparent).toBe(true);
      expect(materials[0].opacity).toBeLessThan(1);
      const paused = materials[0].opacity;
      sample.update(4.1, behind, camera);
      expect(materials[0].opacity).toBe(paused);
      sample.update(0, behind, camera);
      expect(materials[0].opacity).toBe(1);
      const disposal = loads.map(item => vi.spyOn(item.map, 'dispose'));
      const shadowDispose = vi.spyOn(guardian.customDepthMaterial!, 'dispose');
      sample.dispose(); sample.dispose(); loads.forEach(item => item.done());
      disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
      expect(shadowDispose).toHaveBeenCalledTimes(1);
    } finally { sample.dispose(); loader.mockRestore(); }
  });
  it('anchors guardians to matching load-bearing piers on both sides, clear of the playable road', () => {
    expect(PAINTED_PILLARS).toHaveLength(4);
    for (const pillar of PAINTED_PILLARS) {
      expect(Math.abs(pillar.v)).toBeGreaterThan(112);
      expect(PAINTED_PIER_U).toContain(pillar.u);
      expect(ART_PIERS.find(p => p.side === pillar.side)!.nodes).toContain(pillar.u);
      expect(PAINTED_PILLARS.some(other => other.u === pillar.u && other.v === -pillar.v)).toBe(false);
    }
    const arch = paintedArchGeometry();
    arch.computeBoundingBox();
    expect(arch.boundingBox!.max.y).toBeCloseTo(1.2);
    expect(arch.boundingBox!.min.y).toBeLessThan(-300);
    const p = arch.getAttribute('position');
    for (let i = 0; i < p.count; i++) expect(p.getZ(i)).toBeCloseTo(p.getX(i) * (-.28 / .59) + .15, 3);
    arch.dispose();
  });
});
