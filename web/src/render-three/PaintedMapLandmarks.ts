import { DodecahedronGeometry, BufferAttribute, BufferGeometry, DoubleSide, Group, InstancedMesh, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, MeshDepthMaterial, MeshLambertMaterial, Object3D, PlaneGeometry, RGBADepthPacking, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import altarUrl from '../../assets/map-modules/howling-painted-v4/sanctuary-altar.png?url';
import backwallUrl from '../../assets/map-modules/howling-painted-v4/sanctuary-backwall.png?url';
import pavingUrl from '../../assets/map-modules/howling-painted-v4/sanctuary-paving.png?url';
import towerBlueUrl from '../../assets/map-modules/howling-team-structures-v1/tower-blue.png?url';
import towerRedUrl from '../../assets/map-modules/howling-team-structures-v1/tower-red.png?url';
import inhibitorBlueUrl from '../../assets/map-modules/howling-team-structures-v1/inhibitor-blue.png?url';
import inhibitorRedUrl from '../../assets/map-modules/howling-team-structures-v1/inhibitor-red.png?url';
import teamGeometry from '../../assets/map-modules/howling-team-structures-v1/geometry.json';
import { bridgePoint } from '../game/Bridge';
import {SANCTUARY_SHOPS} from '../game/SanctuaryLayout';
import type { Point } from '../game/types';
import { toThree, type ThreeCamera } from './Coordinates';
import { ART_OUTER_U, ART_BASE } from './PaintedMapLayout';
import { disposeSceneResources } from './SceneResources';
import { applyTeamAccent } from './TeamPalette';
import { crystalAccents, sanctuaryFireMotion } from './MaterialAccents';
import type { Entity } from '../game/types';
import { crystalAnchor, type CrystalEmitter } from './CrystalMotes';
import { TOWER_FLOAT, TOWER_CRYSTAL_DEPTH_INSET, towerCrystalLayer, towerCrystalOffset } from './TowerCrystal';

type Profile = readonly (readonly [number, number])[];
export interface ReliefSpec { size: readonly [number, number]; anchor: readonly [number, number]; scale: number; baseline: Profile; }
export const LANDMARK_SPECS = {
  altar: { size: [1374, 1145], anchor: [690, 800], scale: .205, baseline: [[210, 825], [430, 970], [690, 1078], [1145, 915]] },
  backwall: { size: [1672, 941], anchor: [335, 893], scale: .36, baseline: [[125, 805], [200, 869], [300, 890], [400, 893], [500, 846], [600, 757], [700, 739], [800, 696], [900, 648], [1000, 621], [1100, 622], [1200, 618], [1300, 612], [1400, 595], [1500, 565], [1550, 550]] },
  // Place the projected footprint centre over the circular paving, rather
  // than using the frontmost toe of the visible stone base as the map anchor.
  tower: { ...teamGeometry.tower, size: [344, 513], anchor: teamGeometry.tower.anchor as [number, number], baseline: teamGeometry.tower.baseline as [number, number][] },
  inhibitor: { ...teamGeometry.inhibitor, size: [308, 366], anchor: teamGeometry.inhibitor.anchor as [number, number], baseline: teamGeometry.inhibitor.baseline as [number, number][] },
} as const satisfies Record<string, ReliefSpec>;
/** All eight towers use the established inner-tower presentation size. */
export const PAINTED_TOWER_SCALE = .78;
export const PAINTED_TOWER_CROWN_LIFT = (TOWER_FLOAT.lift + TOWER_FLOAT.amplitude) * PAINTED_TOWER_SCALE;
export const PAINTED_TOWER_BODY = { radius: 70 * PAINTED_TOWER_SCALE, height: 350 * PAINTED_TOWER_SCALE + PAINTED_TOWER_CROWN_LIFT } as const;

function baseline(profile: Profile, px: number): number {
  for (let i = 1; i < profile.length; i++) if (px <= profile[i][0]) {
    const a = profile[i - 1], b = profile[i];
    return a[1] + Math.max(0, Math.min(1, (px - a[0]) / (b[0] - a[0]))) * (b[1] - a[1]);
  }
  return profile[profile.length - 1][1];
}
/** Preserve source screen projection while assigning each column a foot and
 * recovering approximate height. This supports actual world depth/shadows. */
export function landmarkRelief(spec: ReliefSpec): BufferGeometry {
  const columns = 32, rows = 48, p: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = col / columns * spec.size[0], py = row / rows * spec.size[1];
    const x = (px - spec.anchor[0]) * spec.scale, up = (spec.anchor[1] - py) * spec.scale;
    // Solid foot pixels must remain above the receiving ground. Otherwise an
    // underestimated profile buries the lower row and exposes the abyss behind.
    const y = Math.max(.25, (baseline(spec.baseline, px) - py) * spec.scale * Math.SQRT2);
    p.push(x, y, y - up * Math.SQRT2); uv.push(px / spec.size[0], 1 - py / spec.size[1]);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col; indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}

export class PaintedMapLandmarks {
  readonly crystalEmitters: CrystalEmitter[] = [];
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private readonly depths: MeshDepthMaterial[] = [];
  private readonly towers: { mesh: Mesh; rubble: Group; team: 'blue' | 'red' }[] = [];
  private readonly time = { value: 0 };
  towerFloatEnabled = true;
  private readonly floatEnabled = { value: 1 };
  private readonly floatingCrystals: { mesh: Mesh<BufferGeometry, MeshBasicMaterial>; parent: Mesh<BufferGeometry, MeshBasicMaterial>; anchor: import('three').Vector3; phase: number }[] = [];
  private readonly occluders: { mesh: Mesh<BufferGeometry, MeshBasicMaterial>; anchor: Point; opacity: number; width: number; height: number }[] = [];
  private disposed = false;
  private lastTime = 0;
  constructor() {
    this.group.name = 'painted-team-map-landmarks-v1';
    const loader = new TextureLoader();
    const load = (url: string) => {
      const map = loader.load(url, t => { if (!this.disposed) this.ready.add(t); }, undefined, () => { if (!this.disposed) this.errors.push(url); });
      map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4; return map;
    };
    const maps = { altar: load(altarUrl), backwall: load(backwallUrl), paving: load(pavingUrl),
      tower: { blue: load(towerBlueUrl), red: load(towerRedUrl) },
      inhibitor: { blue: load(inhibitorBlueUrl), red: load(inhibitorRedUrl) } };
    const add = (kind: keyof typeof LANDMARK_SPECS, u: number, v: number, red = false) => {
      const spec = LANDMARK_SPECS[kind];
      const team = red ? 'red' : 'blue';
      const map = kind === 'tower' || kind === 'inhibitor' ? maps[kind][team] : maps[kind];
      const material = new MeshBasicMaterial({ map, alphaTest: .48, side: DoubleSide, toneMapped: false, fog: false });
      if (kind === 'altar' || kind === 'backwall') applyTeamAccent(material, team);
      else material.userData.team = team;
      if (kind === 'backwall') sanctuaryFireMotion(material, this.time);
      if (kind === 'tower' || kind === 'inhibitor' || kind === 'altar') { const energy = { value: 0 }; material.userData.energy = energy; crystalAccents(material, this.time, energy, kind); }
      const mesh = new Mesh(landmarkRelief(spec), material); mesh.position.copy(toThree(bridgePoint(u, v), .8)); mesh.name = `painted-${kind}`;
      if (kind === 'tower') mesh.scale.setScalar(PAINTED_TOWER_SCALE);
      mesh.userData.mapAnchor = { u, v }; mesh.userData.team = team; mesh.castShadow = true;
      if (kind === 'inhibitor' || kind === 'altar') this.crystalEmitters.push({ source: mesh,
        anchor: crystalAnchor(mesh, .5, .65), spread: 9, red });
      const depth = new MeshDepthMaterial({ map, alphaTest: .48, side: DoubleSide, depthPacking: RGBADepthPacking });
      mesh.customDepthMaterial = depth; this.depths.push(depth); this.group.add(mesh);
      if (kind === 'tower') {
        towerCrystalLayer(material, this.floatEnabled); towerCrystalLayer(depth, this.floatEnabled);
        const anchor = crystalAnchor(mesh, .5, .78);
        const crystalMaterial = new MeshBasicMaterial({ map, alphaTest: .48, side: DoubleSide, toneMapped: false, fog: false });
        crystalMaterial.userData.team = team;
        crystalMaterial.userData.energy = material.userData.energy;
        crystalAccents(crystalMaterial, this.time, material.userData.energy, 'tower');
        towerCrystalLayer(crystalMaterial, this.floatEnabled, true);
        const crystal = new Mesh(mesh.geometry.clone().translate(-anchor.x, -anchor.y - TOWER_CRYSTAL_DEPTH_INSET, -anchor.z - TOWER_CRYSTAL_DEPTH_INSET), crystalMaterial);
        crystal.name = 'floating-tower-crystal'; crystal.position.copy(anchor); mesh.add(crystal);
        this.floatingCrystals.push({ mesh: crystal, parent: mesh, anchor, phase: u * .013 + v * .019 });
        this.crystalEmitters.push({ source: crystal, anchor: anchor.clone().set(0, 0, 0), spread: 16, red, orbit: true });
      }
      // The sanctuary rear wall is outside the playable edge and cannot stand
      // between the camera and a hero on the deck. Its long sloping footprint
      // invalidates a single-anchor screen box and falsely fades the whole wall.
      if (kind !== 'backwall') this.occluders.push({ mesh, anchor: bridgePoint(u, v), opacity: 1,
        width: spec.size[0] * spec.scale * .5, height: spec.size[1] * spec.scale });
      return mesh;
    };
    const paving = (u: number, width: number, v=0) => {
      const material = new MeshBasicMaterial({ map: maps.paving, toneMapped: false, fog: false, transparent: true, depthWrite: false });
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace('#include <alphatest_fragment>', 'diffuseColor.a *= 1.0 - smoothstep(0.43, 0.5, length(vMapUv - vec2(0.5)));\n#include <alphatest_fragment>');
      };
      material.customProgramCacheKey = () => 'sanctuary-circular-paving-edge-v1';
      const mesh = new Mesh(new PlaneGeometry(width, width), material);
      mesh.rotation.x = -Math.PI / 2; mesh.position.copy(toThree(bridgePoint(u,v), .68)); mesh.name = 'painted-circular-paving'; this.group.add(mesh);
    };
    for (const sign of [-1, 1]) {
      // The altar is central in its circular court. The paired niches sit only
      // behind it; the bridge-side opening and spawn approach remain free.
      const nexusU = -ART_BASE.nexus[0] * sign;
      paving(nexusU, 290); const nexus = add('altar', nexusU, 0, sign > 0);
      nexus.name = 'painted-nexus'; nexus.scale.setScalar(.86);
      add('backwall', sign < 0 ? -647 : 510, -145, sign > 0);
      paving(sign * ART_OUTER_U, 150);
      const mesh = add('tower', sign * ART_OUTER_U, 0, sign > 0);
      const team = sign < 0 ? 'blue' : 'red'; mesh.userData.team = team;
      const rubble = new Group(); rubble.name = `destroyed-tower-${team}`; rubble.position.copy(mesh.position); this.group.add(rubble);
      const stone = new DodecahedronGeometry(1, 0), uv = stone.getAttribute('uv');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, .35 + uv.getX(i) * .28, .03 + uv.getY(i) * .12);
      const stoneMaterial = new MeshLambertMaterial({ map: maps.paving, color: 0xb1bac4, emissive: 0x253344, emissiveIntensity: .65, fog: false });
      const chunks = new InstancedMesh(stone, stoneMaterial, 12), chunk = new Object3D(); chunks.castShadow = true;
      for (let i = 0; i < 12; i++) {
        const angle = i * 2.399963, radius = i ? 10 + i % 3 * 8 : 0;
        chunk.scale.set(8 + i % 3 * 5, 5 + i % 4 * 2, 8 + i % 2 * 5);
        chunk.position.set(Math.cos(angle) * radius, chunk.scale.y * .7, Math.sin(angle) * radius);
        chunk.rotation.set(.22 * (i % 3), angle, .25 * (i % 2)); chunk.updateMatrix(); chunks.setMatrixAt(i, chunk.matrix);
      }
      rubble.add(chunks);
      this.towers.push({ mesh, rubble, team });
      const innerU = -ART_BASE.innerTower[0] * sign;
      paving(innerU, 150);
      const inner = add('tower', innerU, 0, sign > 0); inner.name = 'painted-inner-tower';
      const inhibitorU = -ART_BASE.inhibitor[0] * sign;
      paving(inhibitorU, 126);
      const inhibitor = add('inhibitor', inhibitorU, 0, sign > 0); inhibitor.name = 'painted-inhibitor'; inhibitor.scale.setScalar(1.2);
      for (const [u, v] of ART_BASE.nexusTowers) {
        const guard = add('tower', -u * sign, -v * sign, sign > 0);
        guard.name = 'painted-nexus-tower';
      }
      paving(-ART_BASE.spawn[0] * sign, 85);
      const shop=SANCTUARY_SHOPS.find(site=>site.team===team)!;
      paving(shop.u,124,shop.v);
    }
    this.update(0, bridgePoint(0));
  }
  /** Use the same UV anchor and float transform as the visible attack crystal. */
  towerMuzzle(entity: Entity) {
    const tower = this.towers.find(tower => tower.team === entity.team);
    const crystal = this.floatingCrystals.find(crystal => crystal.parent === tower?.mesh);
    if (!crystal) return null;
    return this.towerFloatEnabled ? crystal.mesh.getWorldPosition(crystal.anchor.clone().set(0, 0, 0))
      : crystal.parent.localToWorld(crystal.anchor.clone());
  }
  update(time: number, hero: Point, camera?: ThreeCamera, alive: { blue: boolean; red: boolean } = { blue: true, red: true }, combatTowers: readonly Entity[] = []): void {
    this.time.value = time;
    this.floatEnabled.value = Number(this.towerFloatEnabled);
    const reset = time < this.lastTime, dt = reset ? 0 : Math.min(.1, Math.max(0, time - this.lastTime)); this.lastTime = time;
    this.group.traverse(o => { if (o instanceof Mesh) o.visible = this.ready.has((o.material as MeshBasicMaterial).map!); });
    for (const tower of this.towers) {
      tower.mesh.visible &&= alive[tower.team]; tower.rubble.visible = !alive[tower.team];
      const entity = combatTowers.find(entity => entity.team === tower.team);
      const material = tower.mesh.material as MeshBasicMaterial;
      material.userData.energy.value = entity && alive[tower.team] ? Math.max(entity.windup > 0 ? .8 : 0, Math.max(0, 1 - (time - (entity.attackReleasedAt ?? -10)) / .25)) : 0;
    }
    for (const entry of this.occluders) {
      if (reset) entry.opacity = 1;
      if (camera) {
        const p = camera.project(entry.anchor), h = camera.project(hero, 38), scale = camera.size.height / (camera.camera.top - camera.camera.bottom);
        const width = entry.width * entry.mesh.scale.x, height = entry.height * entry.mesh.scale.y;
        const overlap = hero.y < entry.anchor.y + 12 && Math.abs(h.x - p.x) < width * scale && h.y < p.y + 4 * scale && h.y > p.y - height * scale;
        entry.opacity += ((overlap ? .35 : 1) - entry.opacity) * (1 - Math.exp(-12 * dt));
      }
      const fading = entry.opacity < .995, m = entry.mesh.material;
      if (m.transparent !== fading) { m.transparent = fading; m.needsUpdate = true; }
      m.opacity = fading ? entry.opacity : 1; m.depthWrite = !fading; m.alphaTest = fading ? .1 : .48;
      m.alphaToCoverage = !fading && m.userData.edgeCoverage === true;
    }
    for (const crystal of this.floatingCrystals) {
      const offset = towerCrystalOffset(time, crystal.phase);
      crystal.mesh.position.copy(crystal.anchor); crystal.mesh.position.x += offset.x; crystal.mesh.position.y += offset.y;
      crystal.mesh.visible = this.towerFloatEnabled && this.ready.has(crystal.mesh.material.map!);
      const source = crystal.parent.material, target = crystal.mesh.material;
      if (target.transparent !== source.transparent) { target.transparent = source.transparent; target.needsUpdate = true; }
      target.opacity = source.opacity; target.depthWrite = source.depthWrite; target.alphaTest = source.alphaTest;
      target.alphaToCoverage = source.alphaToCoverage;
    }
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; for (const d of this.depths) d.dispose(); disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent(); }
}
