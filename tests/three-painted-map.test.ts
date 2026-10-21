import { describe, expect, it, vi } from 'vitest';
import { CylinderGeometry, Mesh, MeshBasicMaterial, Texture, TextureLoader, Vector3 } from 'three';
import { PaintedMapLandmarks, LANDMARK_SPECS, PAINTED_TOWER_BODY, PAINTED_TOWER_SCALE, landmarkRelief } from '../src/render-three/PaintedMapLandmarks';
import { ART_GUARDIANS, ART_PIERS, artEdgeV } from '../src/render-three/PaintedMapLayout';
import { bridgePoint } from '../src/game/Bridge';
import { ThreeCamera, WORLD_ORIGIN, toThree } from '../src/render-three/Coordinates';
import { pickActorId } from '../src/render-three/InputPicking';

describe('map assembled from four art targets', () => {
  it('keeps sanctuary rear walls opaque when a hero stands in front along the sloping road', () => {
    const loader = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
      const texture = new Texture<HTMLImageElement>(); done?.(texture); return texture;
    });
    const map = new PaintedMapLandmarks();
    try {
      const walls = map.group.children.filter(o => o.name === 'painted-backwall') as Mesh[];
      const camera = new ThreeCamera(); camera.setElevation(45);
      for (const wall of walls) {
        const { u } = wall.userData.mapAnchor;
        const hero = bridgePoint(u + 50, -100); camera.lookAt(hero);
        for (let i = 1; i <= 5; i++) map.update(i, hero, camera);
        const material = wall.material as MeshBasicMaterial;
        expect(material.transparent).toBe(false);
        expect(material.opacity).toBe(1);
        expect(material.depthWrite).toBe(true);
      }
    } finally { map.dispose(); loader.mockRestore(); }
  });
  it('can select the attack crown of the taller painted tower without enlarging combat radius', () => {
    const view = new ThreeCamera(); view.setElevation(45); view.setZoom(.4); const point = bridgePoint(-350); view.lookAt(point);
    const proxy = new Mesh(new CylinderGeometry(1, 1, 1, 8), new MeshBasicMaterial());
    proxy.scale.set(PAINTED_TOWER_BODY.radius, PAINTED_TOWER_BODY.height, PAINTED_TOWER_BODY.radius);
    proxy.position.copy(toThree(point, PAINTED_TOWER_BODY.height / 2)); proxy.userData.entityId = 42; proxy.visible = false;
    const screen = view.project(point, PAINTED_TOWER_BODY.height * .92);
    expect(pickActorId(view, { left: 0, top: 0, ...view.size }, screen, [proxy])).toBe(42);
    proxy.geometry.dispose(); proxy.material.dispose();
  });
  it('preserves four staggered guardians with independent structural support on the proper edge', () => {
    expect(ART_GUARDIANS).toHaveLength(4);
    for (const p of ART_GUARDIANS) {
      expect(ART_PIERS.find(side => side.side === Math.sign(p.v))!.nodes).toContain(p.u);
      expect(Math.abs(p.v)).toBeGreaterThan(112);
      expect(ART_GUARDIANS.some(other => other.u === p.u && other.v === -p.v)).toBe(false);
    }
    expect(artEdgeV(0)).toBe(122); expect(artEdgeV(720)).toBe(170);
  });
  it('projects every new asset to its source image and keeps foot depth distinct from height', () => {
    const camera = new ThreeCamera(); camera.setElevation(45); camera.lookAt(WORLD_ORIGIN);
    const origin = camera.project(WORLD_ORIGIN), factor = camera.size.height / (camera.camera.top - camera.camera.bottom);
    for (const spec of Object.values(LANDMARK_SPECS)) {
      const g = landmarkRelief(spec), p = g.getAttribute('position'), uv = g.getAttribute('uv');
      for (let i = 0; i < p.count; i += 47) {
        const screen = new Vector3(p.getX(i), p.getY(i), p.getZ(i)).project(camera.camera);
        expect((screen.x + 1) * camera.size.width / 2 - origin.x).toBeCloseTo((uv.getX(i) * spec.size[0] - spec.anchor[0]) * spec.scale * factor, 3);
        expect((1 - screen.y) * camera.size.height / 2 - origin.y).toBeCloseTo(((1 - uv.getY(i)) * spec.size[1] - spec.anchor[1]) * spec.scale * factor, 3);
      }
      g.dispose();
    }
  });
  it('loads all components, hides the matching destroyed tower, and releases shared resources once', () => {
    const loads: { texture: Texture; done(): void }[] = [];
    const load = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => {
      const texture = new Texture<HTMLImageElement>(); loads.push({ texture, done: () => done?.(texture) }); return texture;
    });
    const map = new PaintedMapLandmarks();
    try {
      const towers = map.group.children.filter(o => o.name === 'painted-tower') as Mesh[];
      expect(towers).toHaveLength(2); expect(towers.every(t => !t.visible)).toBe(true);
      for (const [name, count] of [['painted-inner-tower', 2], ['painted-nexus-tower', 4], ['painted-inhibitor', 2], ['painted-nexus', 2]] as const) {
        expect(map.group.children.filter(o => o.name === name)).toHaveLength(count);
      }
      const blueTower = towers.find(t => t.userData.team === 'blue')!;
      const redTower = towers.find(t => t.userData.team === 'red')!;
      expect((blueTower.material as MeshBasicMaterial).map).not.toBe((redTower.material as MeshBasicMaterial).map);
      const inhibitors = map.group.children.filter(o => o.name === 'painted-inhibitor') as Mesh[];
      expect((inhibitors[0].material as MeshBasicMaterial).map).not.toBe((inhibitors[1].material as MeshBasicMaterial).map);
      const nexus = map.group.children.find(o => o.name === 'painted-nexus') as Mesh;
      expect((inhibitors[0].material as MeshBasicMaterial).map).not.toBe((nexus.material as MeshBasicMaterial).map);
      const allTowers = map.group.children.filter(o => ['painted-tower','painted-inner-tower','painted-nexus-tower'].includes(o.name)) as Mesh[];
      expect(allTowers).toHaveLength(8);
      for (const tower of allTowers) {
        expect(tower.scale.toArray()).toEqual([PAINTED_TOWER_SCALE, PAINTED_TOWER_SCALE, PAINTED_TOWER_SCALE]);
        expect((tower.material as MeshBasicMaterial).depthTest).toBe(true);
        expect((tower.material as MeshBasicMaterial).depthWrite).toBe(true);
        expect(tower.customDepthMaterial).toBeDefined();
      }
      loads.forEach(item => item.done()); map.update(1, bridgePoint(0));
      expect(map.errors).toEqual([]);
      const camera = new ThreeCamera(); camera.setElevation(45);
      const anchor = bridgePoint(blueTower.userData.mapAnchor.u, blueTower.userData.mapAnchor.v);
      camera.lookAt(anchor);
      const screenFoot = camera.project(anchor), unitsToScreen = camera.size.height / (camera.camera.top - camera.camera.bottom);
      const heroAt = (offset: number) => camera.pick({ x: screenFoot.x + offset * unitsToScreen, y: screenFoot.y - 30 * unitsToScreen }, { left: 0, top: 0, ...camera.size })!;
      map.update(1.1, heroAt(80), camera);
      expect((blueTower.material as MeshBasicMaterial).opacity).toBe(1);
      map.update(1.2, heroAt(20), camera);
      expect((blueTower.material as MeshBasicMaterial).opacity).toBeLessThan(1);
      const broken = map.group.children.filter(o => o.name === 'painted-broken') as Mesh[];
      expect(broken).toHaveLength(0);
      map.update(2, bridgePoint(0), undefined, { blue: false, red: true });
      expect(towers.find(t => t.userData.team === 'blue')!.visible).toBe(false);
      expect(towers.find(t => t.userData.team === 'red')!.visible).toBe(true);
      expect(map.group.getObjectByName('destroyed-tower-blue')!.visible).toBe(true);
      expect(map.group.getObjectByName('destroyed-tower-red')!.visible).toBe(false);
      map.update(0, bridgePoint(0));
      expect(map.group.getObjectByName('destroyed-tower-blue')!.visible).toBe(false);
      const disposal = loads.map(item => vi.spyOn(item.texture, 'dispose'));
      const depths = towers.map(t => vi.spyOn(t.customDepthMaterial!, 'dispose'));
      map.dispose(); map.dispose(); loads.forEach(item => item.done());
      disposal.forEach(spy => expect(spy).toHaveBeenCalledTimes(1)); depths.forEach(spy => expect(spy).toHaveBeenCalledTimes(1));
    } finally { map.dispose(); load.mockRestore(); }
  });
});
