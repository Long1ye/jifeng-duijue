import { BufferAttribute, BufferGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import manifest from '../../assets/map-modules/howling-small-details-v1/manifest.json';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { ART_BRUSHES, ART_BRAZIERS, ART_GUARDIANS, artEdgeV } from './PaintedMapLayout';
import { landmarkRelief } from './PaintedMapLandmarks';
import { toThree } from './Coordinates';
import { disposeSceneResources } from './SceneResources';
import { contactShadowTexture } from './S01Look';
import { parapetBays } from './PaintedParapet';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyTeamAccent, mapTeamAt } from './TeamPalette';
import { ENVIRONMENT_WIND_GLSL, SCENE_MOTION, fireFlicker } from './EnvironmentMotion';
import { WORLD_ORIGIN } from './Coordinates';
import { lanternMotion } from './MaterialAccents';

const urls = import.meta.glob('../../assets/map-modules/howling-small-details-v1/props/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export interface SmallDetail { kind: string; u: number; side: -1 | 1; width: number; inset: number; top?: number; }
// Reserve complete wall panels outside tall grass, rather than filtering each
// attachment independently and leaving half a composition behind.
export function clearOfBrush(u: number, side: number, margin = 20): boolean {
  return !ART_BRUSHES.some(b => Math.sign(b.v) === side && Math.abs(u - b.u) < b.length / 2 + margin);
}
const wallBays = parapetBays(-1);
const openBays = wallBays.filter(b => b.width >= 85 && clearOfBrush(b.leftPost, -1) && clearOfBrush(b.rightPost, -1));
export const CONCEPT_WALL_GROUPS = [...new Set([-665, -460, -285, 0, 240, 440, 665].map(target =>
  openBays.reduce((best, b) => Math.abs(b.center - target) < Math.abs(best.center - target) ? b : best)))].map(banner => ({ banner }));
export const ORIGINAL_WALL_BANNERS = CONCEPT_WALL_GROUPS.map(({ banner }) => banner)
  .filter(b => !ART_GUARDIANS.some(g => g.v < 0 && Math.abs(g.u - b.center) < 16));
// Add the same number of flags in unused masonry bays, keeping the original
// attachments and lanterns. Never put a second flag on an existing panel.
const extraBannerBays: typeof wallBays = [];
for (const original of ORIGINAL_WALL_BANNERS) {
  const available = wallBays.filter(b => b.width >= 65 && clearOfBrush(b.center, -1)
    && !ART_GUARDIANS.some(g => g.v < 0 && Math.abs(g.u - b.center) < 24)
    && [...ORIGINAL_WALL_BANNERS, ...extraBannerBays].every(other => Math.abs(other.center - b.center) > 25));
  const next = available.sort((a, b) => Math.abs(a.center - original.center) - Math.abs(b.center - original.center))[0];
  if (!next) throw new Error('No free wall bay for doubled banner layout');
  extraBannerBays.push(next);
}
const candidates: SmallDetail[] = [
  ...[...ORIGINAL_WALL_BANNERS, ...extraBannerBays].map(banner => (
    { kind: 'wall-banner', u: banner.center, side: -1 as const, width: Math.min(30, banner.width * .28), inset: 3, top: 83 }
  )),
  ...CONCEPT_WALL_GROUPS.flatMap(({ banner }) => [
    { kind: 'wall-lantern', u: banner.leftPost, side: -1 as const, width: 21, inset: 5, top: 84 },
  ]),
  ...[-490, -365, 25, 345, 490].map(u => ({ kind: 'icicle-fringe', u, side: -1 as const, width: 20, inset: 3.8, top: 76 })),
];

// Authored shoulder offsets stay intact; do not push near-wall props into the road.
export const SMALL_DETAIL_PLACEMENTS = candidates.filter((p, i) => !candidates.slice(0, i).some(other =>
  other.kind === p.kind && other.u === p.u && other.side === p.side)).filter(p => {
  if (p.kind.startsWith('ice-crystal')) return false;
  if (p.top !== undefined) return !ART_GUARDIANS.some(g => Math.sign(g.v) === p.side && Math.abs(g.u - p.u) < 16);
  const v = p.side * (artEdgeV(p.u) - p.inset);
  return !ART_BRUSHES.some(b => Math.abs(p.u - b.u) < b.length / 2 + 10 && Math.abs(v - b.v) < b.width / 2 + 12)
    && !ART_BRAZIERS.some(b => Math.sign(b.v) === p.side && Math.abs(p.u - b.u) < 15 && Math.abs(v - b.v) < 35);
});

/** Project onto the vertical plane of the existing wall, preserving the source camera image. */
export function wallDetailGeometry(w: number, h: number, width: number, segments = 1): BufferGeometry {
  if (!Number.isInteger(segments) || segments < 1) throw new RangeError('Invalid detail segments');
  if (segments > 1) {
    const g = new PlaneGeometry(width, h * width / w, segments, segments * 2);
    const p = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = x * BRIDGE.projection.along[1] / BRIDGE.projection.along[0];
      p.setXYZ(i, x, z - (1 - uv.getY(i)) * h * width / w * Math.SQRT2, z);
    }
    g.computeVertexNormals(); return g;
  }
  const p: number[] = [], scale = width / w;
  for (const [px, py] of [[0, 0], [w, 0], [0, h], [w, h]]) {
    const x = (px - w / 2) * scale, z = x * BRIDGE.projection.along[1] / BRIDGE.projection.along[0];
    p.push(x, z - py * scale * Math.SQRT2, z);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(p), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]), 2));
  g.setIndex([0, 2, 1, 1, 2, 3]); g.computeVertexNormals(); return g;
}

export class PaintedSmallDetails {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private disposed = false;
  private readonly windTime = { value: 0 };
  constructor() {
    this.group.name = 'painted-small-winter-details';
    const loader = new TextureLoader(), materials = new Map<string, MeshBasicMaterial>(), textures = new Map<string, Texture>();
    for (const placement of SMALL_DETAIL_PLACEMENTS) {
      const { kind, u, side, width, inset, top } = placement;
      const team = kind === 'wall-banner' ? mapTeamAt(u) : 'neutral', key = `${kind}:${team}`;
      const asset = manifest.assets.find(a => a.id === kind)!;
      let material = materials.get(key);
      if (!material) {
        const url = urls[`../../assets/map-modules/howling-small-details-v1/${asset.file}`];
        let map = textures.get(kind);
        if (!map) {
          map = loader.load(url, texture => { if (!this.disposed) this.ready.add(texture); }, undefined,
            () => { if (!this.disposed) this.errors.push(url); });
          map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4; textures.set(kind, map);
        }
        material = new MeshBasicMaterial({ map, alphaTest: .4, side: DoubleSide, fog: false, toneMapped: false,
          color: kind.startsWith('ice-crystal') ? 0xb3c0ce : 0xd4dce5 });
        materials.set(key, material);
        if (kind === 'wall-lantern') lanternMotion(material, this.windTime);
        if (kind === 'wall-banner') {
          material.onBeforeCompile = shader => {
            shader.uniforms.environmentTime = this.windTime;
            shader.vertexShader = 'uniform float environmentTime;\n' + ENVIRONMENT_WIND_GLSL + shader.vertexShader.replace('#include <begin_vertex>', `
              #include <begin_vertex>
              float hem = 1.0 - uv.y;
              vec2 world = (modelMatrix * vec4(position, 1.0)).xz + vec2(${WORLD_ORIGIN.x.toFixed(3)}, ${WORLD_ORIGIN.y.toFixed(3)});
              vec3 wind = bridgeWind(environmentTime, world);
              float wave = sin(environmentTime * 3.4 - hem * 7.0 + world.x * 0.012);
              transformed.x += hem * hem * (wind.x * ${SCENE_MOTION.bannerWind} + wave * (${SCENE_MOTION.bannerFlutter} + wind.z * 5.5));
              transformed.z += hem * hem * sin(environmentTime * 3.4 - hem * 8.0 + world.x * 0.012) * 3.0;
            `);
          };
          material.customProgramCacheKey = () => 'painted-banner-pinned-wind-v3-strong';
          applyTeamAccent(material, team);
        }
      }
      const [w, h] = asset.size, base = h * .9;
      const flat = kind === 'drainage-grate' || kind === 'snow-drift';
      const geometry = flat ? new PlaneGeometry(width, h * width / w * Math.SQRT2).rotateX(-Math.PI / 2) : top === undefined
        ? landmarkRelief({ size: [w, h], anchor: [w / 2, base], scale: width / w, baseline: [[0, base], [w, base]] })
        : wallDetailGeometry(w, h, width, kind === 'wall-banner' ? 8 : 1);
      const mesh = new Mesh(geometry, material); mesh.name = `painted-small-${key}`; mesh.userData.placement = placement;
      mesh.userData.team = team;
      mesh.position.copy(toThree(bridgePoint(u, side * (artEdgeV(u) - inset)), top ?? (kind === 'drainage-grate' ? 1.3 : 1)));
      this.group.add(mesh);
    }
    // Static decorations share materials regardless of placement count.
    // Batch in world space after placement; no transparent sorting or extra shadows.
    for (const [key, material] of materials) {
      const meshes = this.group.children.filter(o => o.name === `painted-small-${key}`) as Mesh<BufferGeometry, MeshBasicMaterial>[];
      const geometries = meshes.map(mesh => { mesh.updateMatrix(); return mesh.geometry.clone().applyMatrix4(mesh.matrix); });
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) throw new Error(`Cannot merge small details ${key}`);
      const batch = new Mesh(geometry, material); batch.name = `painted-small-${key.replace(':','-')}`;
      batch.userData.team = meshes[0].userData.team;
      batch.userData.placements = meshes.map(mesh => mesh.userData.placement); this.group.add(batch);
      for (const mesh of meshes) { mesh.geometry.dispose(); this.group.remove(mesh); }
      geometries.forEach(g => g.dispose());
    }
    const softMap = contactShadowTexture(); softMap.magFilter = softMap.minFilter = LinearFilter;
    const addSoftBatch = (name: string, geometries: BufferGeometry[], color: number, opacity: number, requiredMap: Texture) => {
      const geometry = mergeGeometries(geometries, false);
      if (!geometry) throw new Error(`Cannot merge ${name}`);
      const material = new MeshBasicMaterial({ map: softMap, color, opacity, transparent: true, depthWrite: false, toneMapped: false, fog: false, side: DoubleSide });
      const mesh = new Mesh(geometry, material); mesh.name = name; mesh.userData.requiredMap = requiredMap;
      this.group.add(mesh); geometries.forEach(g => g.dispose());
    };
    const lanterns = SMALL_DETAIL_PLACEMENTS.filter(p => p.kind === 'wall-lantern');
    addSoftBatch('detail-wall-warmth', lanterns.map(p => {
      const geometry = wallDetailGeometry(100, 75, 66);
      const point = toThree(bridgePoint(p.u, -(artEdgeV(p.u) - 8)), 74);
      return geometry.translate(point.x, point.y, point.z);
    }), 0xffbb72, .25, materials.get('wall-lantern:neutral')!.map!);
    const grounded = SMALL_DETAIL_PLACEMENTS.filter(p => p.top === undefined && !['snow-drift', 'drainage-grate'].includes(p.kind));
    if (grounded.length) addSoftBatch('detail-contact-shadows', grounded.map(p => {
      const geometry = new PlaneGeometry(p.width * 1.25, p.width * .54).rotateX(-Math.PI / 2);
      const point = toThree(bridgePoint(p.u, p.side * (artEdgeV(p.u) - p.inset)), .8);
      return geometry.translate(point.x, point.y, point.z);
    }), 0x152337, .16, materials.get(`${grounded[0].kind}:neutral`)!.map!);
    this.update();
  }
  update(time = 0): void {
    this.windTime.value = time;
    for (const child of this.group.children) {
      const mesh = child as Mesh<BufferGeometry, MeshBasicMaterial>; mesh.visible = this.ready.has((mesh.userData.requiredMap as Texture | undefined) ?? mesh.material.map!);
      if (mesh.name === 'detail-wall-warmth') mesh.material.opacity = .25 * fireFlicker(time, .8);
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}


