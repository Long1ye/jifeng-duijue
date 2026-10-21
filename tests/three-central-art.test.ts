import { describe, expect, it, vi } from 'vitest';
import { BufferAttribute, BufferGeometry, Mesh, MeshBasicMaterial, Texture, TextureLoader, Group, Raycaster, Vector3 } from 'three';
import { CentralBridgeArt, bridgeArtQuad } from '../src/render-three/CentralBridgeArt';
import { cutBridgeSidewalls } from '../src/render-three/BridgeSidewallCut';
import { bridgeSupportGeometry } from '../src/render-three/CentralBridgeStructure';
import { CENTRAL_BRIDGE } from '../src/render-three/CentralBridgeLayout';
import { BRIDGE, bridgePoint, onPlayableBridge } from '../src/game/Bridge';
import { unproject } from '../assets/map-studies/howling-abyss-v1/geometry';
import { ThreeCamera } from '../src/render-three/Coordinates';

describe('central bridge layered art boundaries (CPU scene checks)', () => {
  it('projects top-view terrain exactly once and keeps painted surface below actors and inside the walkable bridge', () => {
    const geometry = bridgeArtQuad(-88, 80, -112, 112, CENTRAL_BRIDGE.groundY);
    const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
    const camera = new ThreeCamera(); camera.lookAt(bridgePoint(-4));
    for (let i = 0; i < positions.count; i++) {
      const p = { x: positions.getX(i) + 3100, y: positions.getZ(i) + 1700 };
      const [u, v] = unproject(BRIDGE, p.x, p.y);
      expect(u).toBeCloseTo(-88 + uv.getX(i) * 168, 3);
      expect(v).toBeCloseTo(112 - uv.getY(i) * 224, 3);
      expect(onPlayableBridge(p)).toBe(true); expect(positions.getY(i)).toBeLessThan(0.65);
      const projected = camera.project(p, CENTRAL_BRIDGE.groundY);
      const picked = camera.pick(projected, { left: 0, top: 0, ...camera.size });
      if (picked) expect(Math.hypot(p.x - picked.x, p.y - picked.y)).toBeLessThan(0.6);
    }
    expect(geometry.getAttribute('normal').getY(0)).toBeGreaterThan(0.99); geometry.dispose();
  });
  it('cuts old solid sidewalls across the painted arch span without cutting the deck or exploding draw groups', () => {
    const points = [[-120, -100], [120, -100], [120, 100], [-120, 100]].map(([u, v]) => bridgePoint(u, v));
    const values: number[] = [];
    const vertex = (i: number, y: number) => [points[i].x - 3100, y, points[i].y - 1700];
    // A horizontal deck and a long vertical wall spanning both cut boundaries.
    values.push(...vertex(0, 0), ...vertex(2, 0), ...vertex(1, 0));
    values.push(...vertex(0, -100), ...vertex(1, -100), ...vertex(1, 0), ...vertex(0, -100), ...vertex(1, 0), ...vertex(0, 0));
    const source = new BufferGeometry().setAttribute('position', new BufferAttribute(new Float32Array(values), 3));
    const cut = cutBridgeSidewalls(source, -88, 80), positions = cut.getAttribute('position');
    expect(cut.groups.length).toBeLessThanOrEqual(2);
    let deck = 0, walls = 0;
    for (let i = 0; i < positions.count; i += 3) {
      const height = [0, 1, 2].map(j => positions.getY(i + j));
      if (Math.max(...height) - Math.min(...height) < 0.01) deck++;
      else {
        walls++;
        const u = [0, 1, 2].map(j => unproject(BRIDGE, positions.getX(i + j) + 3100, positions.getZ(i + j) + 1700)[0]);
        expect(Math.max(...u) <= -87.999 || Math.min(...u) >= 79.999).toBe(true);
      }
    }
    expect(deck).toBe(1); expect(walls).toBeGreaterThan(1); source.dispose(); cut.dispose();
  });
  it('shows only loaded art, fades nearby foreground locally, freezes on pause, resets and disposes shared maps once', () => {
    const loaded: { map: Texture; done: () => void }[] = [];
    const loader = vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, onLoad) => {
      const map = new Texture<HTMLImageElement>(); loaded.push({ map, done: () => onLoad?.(map) }); return map;
    });
    const view = new CentralBridgeArt();
    try {
      expect(loaded).toHaveLength(3); expect(view.group.children.every(child => !child.visible)).toBe(true);
      loaded.forEach(item => item.done()); view.update(1, bridgePoint(-4, 90));
      expect(view.group.children.every(child => child.visible)).toBe(true);
      const floor = view.group.getObjectByName('central-ground') as Mesh<BufferGeometry, MeshBasicMaterial>;
      expect(floor.material.opacity).toBe(1); expect(floor.receiveShadow).toBe(true);
      // Road extensions may sample outer stone only, never repeat the landmark.
      const transitions = view.group.children.filter(child => child.name === 'central-road-transition') as Mesh<BufferGeometry>[];
      expect(transitions).toHaveLength(4);
      for (const mesh of transitions) {
        const uv = mesh.geometry.getAttribute('uv');
        const xs = Array.from({ length: uv.count }, (_, i) => uv.getX(i));
        expect(Math.max(...xs) <= 0.25 || Math.min(...xs) >= 0.75).toBe(true);
      }
      const structure = view.group.getObjectByName('central-solid-architecture')!;
      const walls = structure.children.filter(child => child.name === 'near-parapet') as Group[];
      const materials = walls.flatMap(wall => wall.children.filter(child => child instanceof Mesh).map(child => (child as Mesh).material as MeshBasicMaterial));
      expect(materials.some(material => material.opacity < 1)).toBe(true);
      const opacity = materials.map(material => material.opacity);
      view.update(1, bridgePoint(-4, 90)); expect(materials.map(material => material.opacity)).toEqual(opacity);
      view.update(0, bridgePoint(-4, 90)); expect(materials.every(material => material.opacity === 1)).toBe(true);
      const disposals = loaded.map(item => vi.spyOn(item.map, 'dispose'));
      view.dispose(); view.dispose(); for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
      loaded.forEach(item => item.done()); for (const dispose of disposals) expect(dispose).toHaveBeenCalledTimes(1);
    } finally { view.dispose(); loader.mockRestore(); }
  });
  it('builds a solid arch with a through opening, solid piers, crown and side faces', () => {
    const geometry = bridgeSupportGeometry(340), material = new MeshBasicMaterial();
    const mesh = new Mesh(geometry, material); mesh.updateMatrixWorld();
    try {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.max.z - geometry.boundingBox!.min.z).toBeGreaterThan(40);
      const ray = (x: number, y: number) => new Raycaster(new Vector3(x, y, 100), new Vector3(0, 0, -1)).intersectObject(mesh);
      expect(ray(170, -230)).toHaveLength(0); // Empty space under the arch.
      expect(ray(15, -250).length).toBeGreaterThan(0); // Solid pier.
      expect(ray(170, -40).length).toBeGreaterThan(0); // Solid crown.
      const side = new Raycaster(new Vector3(-100, -250, 0), new Vector3(1, 0, 0)).intersectObject(mesh);
      expect(side.length).toBeGreaterThan(0); expect(side[0].face!.normal.x).toBeLessThan(-0.9);
    } finally { geometry.dispose(); material.dispose(); }
  });
  it('runs the central fixture through the real host and lands a Q against a real target', async () => {
    vi.stubGlobal('location', { search: '?map=howling' }); vi.resetModules();
    try {
      const { createS01Match } = await import('../src/presentation/S01Match');
      const { PrototypeHost } = await import('../src/presentation/PrototypeHost');
      const host = new PrototypeHost(() => createS01Match(-10), { frame() {}, dispose() {} });
      try {
        const p = bridgePoint(-10); expect(host.match.hero('blue').x).toBeCloseTo(p.x);
        const target = host.match.hero('red'), hp = target.hp;
        expect(host.command({ kind: 'cast', ability: 'q', point: target })).toBe(true);
        for (let i = 0; i < 60; i++) host.update(1 / 120);
        expect(target.hp).toBeLessThan(hp);
      } finally { host.dispose(); }
    } finally { vi.unstubAllGlobals(); vi.resetModules(); }
  });
});
