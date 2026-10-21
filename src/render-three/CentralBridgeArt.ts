import {
  BufferAttribute, BufferGeometry, DirectionalLight, DoubleSide, Group, Mesh, MeshBasicMaterial, NearestFilter,
  SRGBColorSpace, TextureLoader, LinearMipmapLinearFilter, MeshStandardMaterial, RepeatWrapping, type Texture,
} from 'three';
import groundUrl from '../../assets/map-modules/howling-target-v2/ground.png?url';
import snowUrl from '../../assets/map-modules/howling-central-v1/runtime/snow.png?url';
import stoneUrl from '../../assets/map-modules/howling-target-v2/stone.png?url';
import assetRecords from '../../assets/map-modules/howling-central-v1/manifest.json';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';
import type { Point } from '../game/types';
import { toThree, type ThreeCamera } from './Coordinates';
import { firePulse } from './S01Look';
import { createCentralBridgeStructure, type StructuralCurtain } from './CentralBridgeStructure';
import { disposeSceneResources } from './SceneResources';
import { CENTRAL_BRIDGE as LAYOUT } from './CentralBridgeLayout';

/** Painted surface decals on a real deck; all structural silhouettes use solid geometry. */
export function bridgeArtQuad(minU: number, maxU: number, minV: number, maxV: number, y: number, flipV = false): BufferGeometry {
  const points = [[minU, minV], [maxU, minV], [maxU, maxV], [minU, maxV]].map(([u, v]) => toThree(bridgePoint(u, v), y));
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(points.flatMap(p => [p.x, p.y, p.z])), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(flipV ? [0, 0, 1, 0, 1, 1, 0, 1] : [0, 1, 1, 1, 1, 0, 0, 0]), 2));
  geometry.setIndex([0, 2, 1, 0, 3, 2]); geometry.computeVertexNormals(); return geometry;
}
export class CentralBridgeArt {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly curtains: StructuralCurtain[];
  private lastTime = 0;
  private disposed = false;
  private readonly loaded = new Set<Texture>();
  private readonly flames: Mesh[];
  private readonly structure: Group;
  private readonly structureMap: Texture;
  constructor() {
    this.group.name = 'Howling central · solid 3D bridge';
    const loader = new TextureLoader();
    const load = (url: string): Texture => {
      const texture = loader.load(url, ready => { if (!this.disposed) this.loaded.add(ready); }, undefined, () => { if (!this.disposed) this.errors.push(url); });
      texture.colorSpace = SRGBColorSpace; texture.magFilter = NearestFilter;
      // These are detailed painted layers, not a fixed-grid sprite atlas. Filter only
      // minification so fine frost and carvings do not turn into isolated samples.
      texture.minFilter = LinearMipmapLinearFilter; texture.generateMipmaps = true; return texture;
    };
    const maps = { ground: load(groundUrl), snow: load(snowUrl), stone: load(stoneUrl) };
    maps.stone.wrapS = maps.stone.wrapT = RepeatWrapping;
    const structure = createCentralBridgeStructure(maps.stone);
    this.structure = structure.group; this.structureMap = maps.stone;
    this.curtains = structure.curtains; this.flames = structure.flames;
    this.group.add(this.structure);
    const material = (map: Texture, cutout = false) => new MeshBasicMaterial({
      map, toneMapped: false, side: DoubleSide, alphaTest: cutout ? 0.35 : 0, fog: false,
    });
    const cropUV = <T extends BufferGeometry>(geometry: T, kind: 'snow', mirror = false): T => {
      const record = assetRecords.find(item => item.id === `howling-central-${kind}-v1`)!;
      const [left, top, right, bottom] = record.runtimeBounds, [width, height] = record.size;
      const uv = geometry.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (left + (mirror ? 1 - uv.getX(i) : uv.getX(i)) * (right - left)) / width, 1 - bottom / height + uv.getY(i) * (bottom - top) / height);
      return geometry;
    };
    const groundMaterial = new MeshStandardMaterial({ map: maps.ground, bumpMap: maps.ground,
      bumpScale: 0.65, roughness: 1, color: 0xe3e1e8, emissiveMap: maps.ground, emissive: 0x7a7f8e, emissiveIntensity: 0.25 });
    const ground = new Mesh(bridgeArtQuad(LAYOUT.minU, LAYOUT.maxU, -LAYOUT.halfWidth, LAYOUT.halfWidth, LAYOUT.groundY), groundMaterial);
    ground.receiveShadow = true;
    ground.name = 'central-ground'; this.group.add(ground);
    // Continue the plain outer stone, without duplicating the central medallion.
    // Mirrored strips meet on identical source columns at each joint.
    for (const side of [-1, 1]) for (let i = 0; i < 2; i++) {
      const start = side < 0 ? LAYOUT.minU - (i + 1) * 42 : LAYOUT.maxU + i * 42;
      const geometry = bridgeArtQuad(start, start + 42, -LAYOUT.halfWidth, LAYOUT.halfWidth, LAYOUT.groundY);
      const uv = geometry.getAttribute('uv');
      for (let j = 0; j < uv.count; j++) {
        const x = uv.getX(j), t = i % 2 === 0 ? 1 - x : x;
        uv.setX(j, side < 0 ? t * 0.25 : 0.75 + t * 0.25);
      }
      const mesh = new Mesh(geometry, ground.material); mesh.receiveShadow = true;
      mesh.name = 'central-road-transition'; this.group.add(mesh);
    }
    const snowMaterial = material(maps.snow, true);
    for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
      const start = LAYOUT.edgeMinU + i * 56;
      const snow = new Mesh(cropUV(bridgeArtQuad(start, start + 56, side < 0 ? -112 : 58, side < 0 ? -58 : 112, LAYOUT.snowY, side > 0), 'snow', i % 2 === 1), snowMaterial);
      snow.name = `snow-fringe-${side}-${i}`; this.group.add(snow);
    }
    for (const child of this.group.children) child.visible = false;
  }
  update(time: number, actor: Point, _camera?: ThreeCamera): void {
    for (const child of this.group.children) {
      if (child === this.structure) child.visible = this.loaded.has(this.structureMap);
      else {
        const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>;
        child.visible = !!mesh.material.map && this.loaded.has(mesh.material.map);
      }
    }
    const [u, v] = unproject(BRIDGE, actor.x, actor.y);
    const reset = time < this.lastTime;
    const dt = reset ? 0 : Math.max(0, Math.min(0.1, time - this.lastTime)); this.lastTime = time;
    for (const curtain of this.curtains) {
      if (reset) curtain.opacity = 1;
      const target = v > 64 && v < 120 && u >= curtain.start - 8 && u <= curtain.end + 8 ? 0.4 : 1;
      curtain.opacity += (target - curtain.opacity) * (1 - Math.exp(-14 * dt));
      const fading = curtain.opacity < 0.995;
      for (const material of curtain.materials) {
        if (material.transparent !== fading) { material.transparent = fading; material.needsUpdate = true; }
        material.opacity = fading ? curtain.opacity : 1; material.depthWrite = !fading;
      }
    }
    for (const flame of this.flames) {
      const pulse = firePulse(time, flame.userData.phase);
      flame.scale.set(1 / Math.sqrt(pulse), pulse, 1);
    }
    // Architecture is fixed in world space; changing the camera reveals real
    // end faces, soffits and thickness instead of rotating a facade billboard.
  }

  dispose(): void {
    if (this.disposed) return; this.disposed = true;
    this.group.traverse(object => { if (object instanceof DirectionalLight) object.shadow.dispose(); });
    disposeSceneResources(this.group); this.group.removeFromParent(); this.group.clear();
  }
}
