import { describe, expect, it, vi } from 'vitest';
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PlaneGeometry, Vector3 } from 'three';
import { LivingFire } from '../src/render-three/LivingFire';
import { CrystalMotes, crystalAnchor } from '../src/render-three/CrystalMotes';
import { ThreeCamera } from '../src/render-three/Coordinates';

describe('live fire and crystal resource ownership', () => {
  it('keeps flames at their bowls, hides unloaded sources, and reuses a single batch', () => {
    const sources = [new Group(), new Group()]; sources[0].position.set(10, 2, 30); sources[1].visible = false;
    const fire = new LivingFire(sources), matrices = fire.mesh.instanceMatrix;
    try {
      const before = Array.from(matrices.array);
      fire.update(2); fire.update(2);
      expect(fire.mesh.instanceMatrix).toBe(matrices); expect(Array.from(matrices.array)).toEqual(before);
      expect(fire.mesh.count).toBe(2); expect(fire.time.value).toBe(2);
      expect(matrices.array[12]).toBe(10);
      expect(matrices.array[16]).toBe(0); // Invisible second source collapses in width.
      sources[0].position.x += 25; fire.update(0);
      expect(matrices.array[12]).toBe(35); expect(fire.time.value).toBe(0);
    } finally { fire.dispose(); }
  });
  it('releases flame instance/material/geometry once without touching source assets', () => {
    const source = new Mesh(new BoxGeometry(), new MeshBasicMaterial()), fire = new LivingFire([source]);
    const sourceDispose = vi.spyOn(source.geometry, 'dispose');
    const geometryDispose = vi.spyOn(fire.mesh.geometry, 'dispose'), materialDispose = vi.spyOn(fire.mesh.material, 'dispose');
    fire.dispose(); fire.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
    expect(sourceDispose).not.toHaveBeenCalled(); source.geometry.dispose(); source.material.dispose();
  });
  it('anchors glints to source hierarchy, respects hidden ancestors and uses fixed attributes', () => {
    const root = new Group(), source = new Group(); root.add(source); root.position.set(20, 30, 40);
    const motes = new CrystalMotes([{ source, anchor: new Vector3(1, 2, 3), spread: 5, red: true }]);
    const camera = new ThreeCamera(), positions = motes.points.geometry.getAttribute('position');
    try {
      motes.update(2, camera, 1080);
      expect(positions.count).toBe(3); expect(positions.getX(0)).toBe(21);
      expect(positions.getY(0)).toBe(37); expect(positions.getZ(0)).toBe(48);
      const before = Array.from(positions.array); motes.update(2, camera, 1080);
      expect(Array.from(positions.array)).toEqual(before);
      root.visible = false; motes.update(2, camera, 1080);
      expect(Array.from(motes.points.geometry.getAttribute('enabled').array)).toEqual([0, 0, 0]);
      root.visible = true; motes.update(0, camera, 720);
      expect(Array.from(motes.points.geometry.getAttribute('enabled').array)).toEqual([1, 1, 1]);
      expect(motes.points.material.uniforms.moteTime.value).toBe(0);
      expect(motes.points.geometry.getAttribute('position')).toBe(positions);
    } finally { motes.dispose(); }
  });
  it('uses authored UVs to locate an anchor without altering the shared geometry', () => {
    const geometry = new PlaneGeometry(30, 50, 4, 8), before = Array.from(geometry.getAttribute('position').array);
    expect(crystalAnchor({ geometry }, .5, .75).toArray()).toEqual([0, 12.5, 0]);
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(before); geometry.dispose();
  });
  it('adds only one orbit per active tower and hides it together with a destroyed source', () => {
    const source = new Group(), camera = new ThreeCamera();
    const motes = new CrystalMotes([{ source, anchor: new Vector3(), spread: 16, red: false, orbit: true }]);
    const geometryDispose = vi.spyOn(motes.points.geometry, 'dispose'), materialDispose = vi.spyOn(motes.points.material, 'dispose');
    expect(motes.points.geometry.getAttribute('position').count).toBe(4);
    expect(motes.points.geometry.getAttribute('mote').getW(3)).toBe(1);
    motes.update(0, camera, 1080); source.visible = false; motes.update(1, camera, 1080);
    expect(Array.from(motes.points.geometry.getAttribute('enabled').array)).toEqual([0, 0, 0, 0]);
    motes.dispose(); motes.dispose();
    expect(geometryDispose).toHaveBeenCalledTimes(1); expect(materialDispose).toHaveBeenCalledTimes(1);
  });
});
