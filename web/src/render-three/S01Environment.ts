import {
  BoxGeometry, BufferAttribute, BufferGeometry, Color, ConeGeometry, CylinderGeometry, DodecahedronGeometry,
  ExtrudeGeometry, Group, HemisphereLight, IcosahedronGeometry, InstancedMesh, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, NearestFilter, Object3D, PointLight, RepeatWrapping, Shape, SRGBColorSpace, Path,
  TextureLoader, Vector3, DirectionalLight, type Material,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import floorUrl from '../../assets/map-modules/arpg-s01-v1/runtime/floor.png?url';
import wallUrl from '../../assets/map-modules/arpg-s01-v1/runtime/wall.png?url';
import mossUrl from '../../assets/map-modules/arpg-s01-v1/runtime/moss.png?url';
import rubbleUrl from '../../assets/map-modules/arpg-s01-ground-v2/runtime/rubble.png?url';
import repairUrl from '../../assets/map-modules/arpg-s01-ground-v2/runtime/repair.png?url';
import iceUrl from '../../assets/map-modules/arpg-s01-ground-v2/runtime/ice.png?url';
import { BRIDGE, BRIDGE_OUTLINE, bridgePoint, onPlayableBridge } from '../game/Bridge';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';
import type { Point } from '../game/types';
import { SAMPLE_REGION } from './BridgeBlockout';
import { toThree, type ThreeCamera } from './Coordinates';
import { disposeSceneResources } from './SceneResources';
import { firePulse, S01_LIGHTING, S01_TORCHES, stoneMaterial, towerPlayerOpacity } from './S01Look';
import { createS01Ground } from './S01Ground';
import { cutBridgeSidewalls } from './BridgeSidewallCut';
import { CENTRAL_BRIDGE } from './CentralBridgeLayout';

export const S01_STYLE = { tileWorldSize: 64, texelsPerTile: 64, shadowMapSize: 2048, sampleFocusU: -155 } as const;
export const sampleContains = (u: number, v: number) => u >= SAMPLE_REGION.minU && u <= SAMPLE_REGION.maxU && v >= SAMPLE_REGION.minV && v <= SAMPLE_REGION.maxV;
const hash = (i: number) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

/** World-scaled planar UVs keep masonry texel density consistent across modules. */
export function worldUV(geometry: BufferGeometry, unit = 64): BufferGeometry {
  const position = geometry.getAttribute('position'), normal = geometry.getAttribute('normal');
  const uv = new Float32Array(position.count * 2);
  for (let i = 0; i < position.count; i++) {
    const ny = Math.abs(normal.getY(i)), nx = Math.abs(normal.getX(i));
    uv[i * 2] = (ny > 0.6 || nx <= Math.abs(normal.getZ(i)) ? position.getX(i) : position.getZ(i)) / unit;
    uv[i * 2 + 1] = (ny > 0.6 ? position.getZ(i) : position.getY(i)) / unit;
  }
  geometry.setAttribute('uv', new BufferAttribute(uv, 2)); return geometry;
}

export class S01Environment {
  readonly group = new Group();
  readonly towerViews = new Map<string, Group>();
  readonly textureErrors: string[] = [];
  private readonly batches = new Map<Material, BufferGeometry[]>();
  private readonly flames: { mesh: Mesh; light: PointLight; phase: number }[] = [];
  private readonly crystals: Mesh[] = [];
  private readonly towerMaterials = new Set<Material>();
  private towerOpacity = 1;
  private lastTime = 0;
  private disposed = false;
  constructor(options: { centralArt?: boolean } = {}) {
    this.group.name = 'S01 Howling Abyss · P2 ground 02';
    const loader = new TextureLoader();
    const texture = (url: string) => {
      const map = loader.load(url, loaded => { if (this.disposed) loaded.dispose(); }, undefined, () => this.textureErrors.push(url));
      map.magFilter = map.minFilter = NearestFilter; map.generateMipmaps = false;
      map.wrapS = map.wrapT = RepeatWrapping; map.colorSpace = SRGBColorSpace; return map;
    };
    const stone = stoneMaterial(texture(floorUrl), 'floor');
    const masonry = stoneMaterial(texture(wallUrl), 'wall');
    const moss = stoneMaterial(texture(mossUrl), 'moss');
    const pale = new MeshLambertMaterial({ color: 0x899ba7 });
    const iron = new MeshLambertMaterial({ color: 0x26383e });
    const earth = new MeshLambertMaterial({ color: 0x172a32 });
    const banner = new MeshLambertMaterial({ color: 0x365e73 });
    const recess = new MeshLambertMaterial({ color: 0x14262f });
    const cube = (at: Point, y: number, w: number, h: number, d: number, material: Material, angle = 0) => {
      const mesh = new Mesh(new BoxGeometry(w, h, d)); mesh.position.copy(toThree(at, y)); mesh.rotation.y = angle;
      mesh.updateMatrix(); this.batch(worldUV(mesh.geometry.applyMatrix4(mesh.matrix)), material);
    };
    const cylinder = (at: Point, y: number, top: number, bottom: number, height: number, material: Material, sides = 8) => {
      const geometry = new CylinderGeometry(top, bottom, height, sides).translate(at.x - 3100, y, at.y - 1700);
      this.batch(worldUV(geometry), material);
    };
    const span = (a: Point, b: Point, bottom: number, height: number, width: number, material: Material) => {
      cube({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, bottom + height / 2, Math.hypot(a.x - b.x, a.y - b.y), height, width, material, -Math.atan2(b.y - a.y, b.x - a.x));
    };
    // Full logical bridge remains usable; detailed art is limited to S01.
    const outline = new Shape();
    BRIDGE_OUTLINE.forEach((p, i) => { const v = toThree(p); if (i === 0) outline.moveTo(v.x, -v.z); else outline.lineTo(v.x, -v.z); });
    outline.closePath();
    const originalBase = new ExtrudeGeometry(outline, { depth: 112, bevelEnabled: false });
    originalBase.rotateX(-Math.PI / 2).translate(0, -114, 0);
    const base = options.centralArt ? cutBridgeSidewalls(originalBase, CENTRAL_BRIDGE.edgeMinU, CENTRAL_BRIDGE.edgeMaxU) : originalBase;
    if (base !== originalBase) originalBase.dispose(); worldUV(base);
    const slab = new Mesh(base, [stone, masonry]); slab.receiveShadow = true; this.group.add(slab);
    const cells: Point[] = [];
    const xs = BRIDGE_OUTLINE.map(p => p.x), ys = BRIDGE_OUTLINE.map(p => p.y), size = S01_STYLE.tileWorldSize;
    for (let y = Math.floor(Math.min(...ys) / size) * size; y < Math.max(...ys); y += size) for (let x = Math.floor(Math.min(...xs) / size) * size; x < Math.max(...xs); x += size) {
      const [u, v] = unproject(BRIDGE, x, y);
      if (!sampleContains(u, v)) continue;
      if ([-32, 32].every(dx => [-32, 32].every(dy => onPlayableBridge({ x: x + dx, y: y + dy })))) cells.push({ x, y });
    }
    const floorGeometry = new BoxGeometry(size + 0.06, 2, size + 0.06);
    const floor = new InstancedMesh(floorGeometry, stone, cells.length), transform = new Object3D();
    cells.forEach((p, i) => {
      transform.position.copy(toThree(p, -1)); transform.updateMatrix(); floor.setMatrixAt(i, transform.matrix);
      floor.setColorAt(i, new Color().setScalar(0.93 + hash(i) * 0.07));
    }); floor.instanceMatrix.needsUpdate = true; if (floor.instanceColor) floor.instanceColor.needsUpdate = true;
    floor.computeBoundingSphere(); floor.receiveShadow = true; this.group.add(floor);
    this.group.add(createS01Ground({ rubble: texture(rubbleUrl), repair: texture(repairUrl), ice: texture(iceUrl) }));
    // Broken parapets, stepped copings, structural ribs, masonry supports and ravine rocks.
    for (let side = -1; side <= 1; side += 2) for (let u = -280, i = 0; u < 80; u += 20, i++) {
      if (options.centralArt && u >= CENTRAL_BRIDGE.edgeMinU) continue;
      const endU = options.centralArt ? Math.min(u + 19.4, CENTRAL_BRIDGE.edgeMinU) : u + 19.4;
      const a = bridgePoint(u, side * 110), b = bridgePoint(endU, side * 110), broken = i % 5 === 2;
      span(a, b, -54, 54, 24, masonry);
      span(a, b, -12, 4, 25, recess);
      span(a, b, -53, 5, 28, pale);
      if (!broken) {
        const wallHeight = 24 + hash(i + side) * 12;
        span(a, b, 0, wallHeight, 15, masonry);
        span(a, b, wallHeight, 5, 22, pale);
        span(a, b, wallHeight - 2, 2, 23, recess);
      } else {
        span(a, bridgePoint(u + 8, side * 110), 0, 13, 17, masonry);
        cube(bridgePoint(u + 12, side * 101), 4, 13, 8, 9, pale, hash(i) * 2);
      }
      const pier = bridgePoint(u, side * 110);
      cube(pier, 23, 29, 48, 27, masonry); cube(pier, 50, 34, 7, 32, pale);
      cube(pier, -48, 30, 90, 29, masonry);
      if (i % 3 === 0) {
        cube(pier, -215, 42, 320, 45, masonry);
        cube(pier, -105, 66, 22, 62, masonry);
        cube(pier, -348, 68, 20, 65, pale);
        cube(pier, -370, 80, 26, 76, masonry);
      }
      const rock = new DodecahedronGeometry(1, 0); rock.scale(100 + hash(i) * 90, 180 + hash(i + 1) * 180, 110);
      rock.rotateY(hash(i) * Math.PI); const rp = toThree(bridgePoint(u + 12, side * (205 + hash(i) * 100)), -470);
      rock.translate(rp.x, rp.y, rp.z); this.batch(worldUV(rock), earth);
      // Ground rubble and quiet moss shoulders; the central fighting lane stays clear.
      for (let n = 0; n < 4; n++) {
        const p = bridgePoint(u + n * 4, side * (85 + hash(i * 13 + n) * 15));
        cube(p, 2 + n % 2, 5 + hash(n + i) * 8, 4 + n % 3, 5 + hash(n) * 7, n % 3 ? masonry : pale, hash(i + n) * 3);
      }
    }
    this.vegetation(moss, pale, !!options.centralArt);
    // Tower occupies the existing outer-tower anchor, with no new collision geometry.
    const tower = new Group(), tp = bridgePoint(-195, 0); tower.name = 'blue-outer';
    const towerMesh = (geometry: BufferGeometry, material: Material, y: number) => {
      const owned = material.clone(); owned.onBeforeCompile = material.onBeforeCompile; owned.customProgramCacheKey = material.customProgramCacheKey;
      this.towerMaterials.add(owned);
      const mesh = new Mesh(worldUV(geometry), owned); mesh.position.y = y; mesh.castShadow = mesh.receiveShadow = true; tower.add(mesh); return mesh;
    };
    const lowerBase = towerMesh(new CylinderGeometry(25, 28, 10, 8).scale(1, 1, 0.65), stone, 5); lowerBase.position.z = -8;
    const upperBase = towerMesh(new CylinderGeometry(22, 25, 16, 8).scale(1, 1, 0.70), masonry, 18); upperBase.position.z = -8;
    towerMesh(new CylinderGeometry(20, 27, 85, 8), masonry, 68);
    towerMesh(new CylinderGeometry(28, 29, 4, 8), recess, 29);
    towerMesh(new CylinderGeometry(23, 25, 5, 8), pale, 40);
    towerMesh(new CylinderGeometry(24, 25, 4, 8), recess, 106);
    towerMesh(new CylinderGeometry(27, 23, 9, 8), pale, 112);
    towerMesh(new CylinderGeometry(22, 26, 10, 8), iron, 122);
    for (let i = 0; i < 4; i++) {
      const x = Math.cos(i * Math.PI / 2 + Math.PI / 4) * 22, z = Math.sin(i * Math.PI / 2 + Math.PI / 4) * 22;
      const rib = towerMesh(new BoxGeometry(8, 80, 8), pale, 72); rib.position.x = x; rib.position.z = z;
      const spire = towerMesh(new ConeGeometry(7, 28, 4), masonry, 136); spire.position.x = x; spire.position.z = z;
    }
    const crystalMat = new MeshLambertMaterial({ color: 0x91c8d7, emissive: 0x2c8da9, emissiveIntensity: 0.32 });
    const crystal = towerMesh(new IcosahedronGeometry(13, 0).scale(0.85, 1.65, 0.85), crystalMat, 143); this.crystals.push(crystal);
    // Recessed pointed window: stone frame, dark cavity and a small metal mullion.
    const arch = new Shape(); arch.moveTo(-13, 0); arch.lineTo(13, 0); arch.lineTo(13, 34); arch.lineTo(0, 46); arch.lineTo(-13, 34); arch.closePath();
    const hole = new Path(); hole.moveTo(-7, 4); hole.lineTo(-7, 30); hole.lineTo(0, 37); hole.lineTo(7, 30); hole.lineTo(7, 4); hole.closePath(); arch.holes.push(hole);
    const windowBack = towerMesh(new BoxGeometry(22, 40, 2), recess, 72); windowBack.position.z = 23;
    const frame = towerMesh(new ExtrudeGeometry(arch, { depth: 4, bevelEnabled: false }), pale, 50); frame.position.z = 25;
    const mullion = towerMesh(new BoxGeometry(2, 28, 2), iron, 69); mullion.position.z = 26;
    const cloth = new Shape(); cloth.moveTo(-9, 22); cloth.lineTo(9, 22); cloth.lineTo(9, -17); cloth.lineTo(3, -22); cloth.lineTo(0, -16); cloth.lineTo(-5, -24); cloth.lineTo(-9, -19); cloth.closePath();
    const flag = towerMesh(new ExtrudeGeometry(cloth, { depth: 1.5, bevelEnabled: false }), banner, 66); flag.position.set(-23, 66, 14); flag.rotation.y = -Math.PI / 3;
    tower.position.copy(toThree(tp)); this.group.add(tower); this.towerViews.set('blue', tower);
    // These two prototypes were cloned only for the tower and have no other users.
    crystalMat.dispose(); banner.dispose();
    // Warm environmental sources, explicitly unrelated to skill casts.
    for (const source of S01_TORCHES) {
      const [sourceU] = unproject(BRIDGE, source.x, source.y);
      const painted = !!options.centralArt && sourceU >= CENTRAL_BRIDGE.edgeMinU && sourceU <= CENTRAL_BRIDGE.edgeMaxU;
      // Mount on parapet posts, outside the clear fighting lane.
      const p = source;
      if (!painted) { cylinder(p, 62, 9, 13, 24, masonry);
        cylinder(p, 80, 11, 7, 12, iron); cylinder(p, 89, 15, 10, 6, iron); }
      const flame = new Mesh(new ConeGeometry(9, 24, 5), new MeshBasicMaterial({ color: 0xffb85f, toneMapped: false }));
      flame.position.copy(toThree(p, 103)); flame.visible = !painted; this.group.add(flame);
      const heart = new Mesh(new ConeGeometry(4, 16, 4), new MeshBasicMaterial({ color: 0xffe2a5, toneMapped: false }));
      heart.position.y = -1; flame.add(heart);
      const light = new PointLight(0xffb065, S01_LIGHTING.fire, S01_LIGHTING.fireRadius, 1); light.position.copy(toThree(p, 98)); this.group.add(light);
      this.flames.push({ mesh: flame, light, phase: source.phase });
    }
    for (const [material, geometries] of this.batches) {
      const merged = mergeGeometries(geometries, false); if (!merged) throw new Error('Cannot merge S01 module batch');
      const mesh = new Mesh(merged, material); mesh.castShadow = mesh.receiveShadow = true; this.group.add(mesh);
      for (const geometry of geometries) geometry.dispose();
    } this.batches.clear();
    this.group.add(new HemisphereLight(0xa9c2d9, 0x233335, S01_LIGHTING.hemisphere));
    const target = toThree(bridgePoint(-110));
    const sun = new DirectionalLight(0xffe2c4, S01_LIGHTING.sun); sun.position.copy(target).add(new Vector3(-500, 850, 400));
    sun.target.position.copy(target); sun.castShadow = true;
    sun.shadow.mapSize.set(S01_STYLE.shadowMapSize, S01_STYLE.shadowMapSize);
    Object.assign(sun.shadow.camera, { left: -1050, right: 1050, top: 550, bottom: -550, near: 20, far: 2200 });
    sun.shadow.normalBias = 0.8; sun.shadow.bias = -0.0002; this.group.add(sun, sun.target);
    const fill = new DirectionalLight(0x789ab8, S01_LIGHTING.fill); fill.position.copy(target).add(new Vector3(500, 250, -600));
    fill.target.position.copy(target); this.group.add(fill, fill.target);
  }
  private batch(geometry: BufferGeometry, material: Material): void {
    const batch = this.batches.get(material) ?? []; batch.push(geometry); this.batches.set(material, batch);
  }
  private vegetation(moss: Material, pale: Material, centralArt: boolean): void {
    // Small angular tufts sit along shoulders only; no collision or target semantics.
    for (let i = 0; i < 180; i++) {
      const u = -275 + hash(i * 7) * 350, side = i % 2 ? 1 : -1;
      if (centralArt && u >= CENTRAL_BRIDGE.edgeMinU) continue;
      const p = toThree(bridgePoint(u, side * (84 + hash(i * 11) * 17)), 0.5);
      const blade = new ConeGeometry(2 + hash(i) * 3, 9 + hash(i + 1) * 15, 3);
      blade.rotateZ((hash(i + 3) - 0.5) * 0.5).translate(p.x, p.y + 6, p.z);
      // Snowdrifts occupy the opposite shoulder; keep sheltered vegetation on the damp side.
      if (side < 0) this.batch(worldUV(blade), i % 11 === 0 ? pale : moss); else blade.dispose();
    }
  }
  update(time: number, towerAlive: boolean, player?: { point: Point; height: number; camera: ThreeCamera }): void {
    this.towerViews.get('blue')!.visible = towerAlive;
    if (time < this.lastTime) this.towerOpacity = 1;
    const delta = Math.max(0, Math.min(0.1, time - this.lastTime)); this.lastTime = time;
    const opacity = player ? towerPlayerOpacity(player.point, bridgePoint(-195), player.height, player.camera) : 1;
    this.towerOpacity += (opacity - this.towerOpacity) * (1 - Math.exp(-12 * delta));
    for (const material of this.towerMaterials) {
      const transparent = this.towerOpacity < 0.995;
      if (material.transparent !== transparent) { material.transparent = transparent; material.needsUpdate = true; }
      material.opacity = transparent ? this.towerOpacity : 1; material.depthWrite = !transparent;
    }
    for (const flame of this.flames) {
      const pulse = firePulse(time, flame.phase);
      flame.mesh.scale.set(1 / Math.sqrt(pulse), pulse, 1); flame.light.intensity = S01_LIGHTING.fire * pulse;
    }
    for (const crystal of this.crystals) { crystal.rotation.y = time * 0.25; crystal.position.y = 143 + Math.sin(time * 1.7) * 2; }
  }
  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.group.traverse(object => { if (object instanceof DirectionalLight) object.shadow.dispose(); });
    disposeSceneResources(this.group); this.group.removeFromParent(); this.group.clear();
  }
}
