import { BufferAttribute, BufferGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import atlasUrl from '../../assets/map-modules/howling-snow-varieties-v1/atlas.png?url';
import manifest from '../../assets/map-modules/howling-snow-varieties-v1/manifest.json';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { ART_BRAZIERS, ART_BRUSHES, artEdgeV } from './PaintedMapLayout';
import { parapetBays } from './PaintedParapet';
import { toThree } from './Coordinates';
import type { EnvironmentIllumination } from './EnvironmentIllumination';
import type { QualitySettings } from './QualitySettings';
import type { SnowBankPlacement } from './SnowBanks';
import { disposeSceneResources } from './SceneResources';
import { fitSnowClearance, type SnowViewBounds } from './SnowClearance';

export const SNOW_KINDS = ['thick', 'rubble', 'wind', 'thin', 'post', 'melt', 'roots', 'crust'] as const;
export type SnowKind = typeof SNOW_KINDS[number];
export interface SnowPlacement { kind: SnowKind; u: number; v: number; width: number; }
const art = Object.fromEntries(manifest.assets.map(a => [a.id, a])) as Record<SnowKind, typeof manifest.assets[number]>;

export function snowVarietyPlacements(banks: readonly SnowBankPlacement[], clearance = true): SnowPlacement[] {
  const placements: SnowPlacement[] = banks.map((p, i) => ({ kind: (['thick', 'rubble', 'wind'] as const)[i % 3],
    u: p.u, v: p.side * (artEdgeV(p.u) - p.inset), width: p.width * (i % 3 === 1 ? .78 : .94) }));
  // Thin islands bridge some of the bare gaps without filling the combat lane.
  banks.filter((_, i) => i % 2 === 0).forEach(p => placements.push({ kind: 'thin', u: p.u + 17,
    v: p.side * (artEdgeV(p.u) - Math.max(42, p.inset + 18)), width: 92 }));
  for (const side of [-1, 1] as const) {
    const bays = parapetBays(side);
    const posts = [...new Set([-465, -355, -205, 195, 345, 465].map(target =>
      bays.reduce((best, bay) => Math.abs(bay.leftPost - target) < Math.abs(best.leftPost - target) ? bay : best).leftPost))];
    for (const u of posts) {
      if (ART_BRUSHES.some(b => Math.sign(b.v) === side && Math.abs(b.u - u) < b.length / 2 + 8)) continue;
      if (ART_BRAZIERS.some(b => Math.sign(b.v) === side && Math.abs(b.u - u) < 14)) continue;
      placements.push({ kind: 'post', u, v: side * (artEdgeV(u) - (side < 0 ? 12 : 24)), width: 72 });
    }
  }
  for (const b of ART_BRAZIERS) placements.push({ kind: 'melt', u: b.u, v: b.v, width: 98 });
  for (const b of ART_BRUSHES) placements.push({ kind: 'roots', u: b.u, v: b.v + (b.v < 0 ? 4 : -4),
    width: b.length * Math.abs(BRIDGE.projection.along[0]) * .85 });
  for (const [u, side] of [[-427, -1], [-245, 1], [339, 1], [479, -1]]) {
    placements.push({ kind: 'crust', u, v: side * (artEdgeV(u) - 42), width: 112 });
  }
  return clearance ? fitSnowClearance(placements, snowPlacementBounds) : placements;
}

export function snowPlacementBounds(p: SnowPlacement): SnowViewBounds {
  const spec = art[p.kind], [w, h] = spec.size, [cx, cy] = spec.anchor, scale = p.width / w, origin = bridgePoint(p.u, p.v);
  const box = { left: Infinity, right: -Infinity, bottom: Infinity, top: -Infinity };
  // At 45 degrees relief height cancels out of Y-Z. Projection is affine, so
  // four source corners bound the entire sprite without building trial meshes.
  for (const px of [0, w]) for (const py of [0, h]) {
    const localX = (px - cx) * scale, sourceUp = (cy - py) * scale + localX * (.335 - spec.axisSlope);
    const localUp = localX * .335 + (sourceUp - localX * .335) * snowSurfaceDepth(p.kind);
    const x = origin.x + localX, up = localUp + (.8 - origin.y) / Math.SQRT2;
    box.left = Math.min(box.left, x - 3); box.right = Math.max(box.right, x + 3);
    box.bottom = Math.min(box.bottom, up - 3); box.top = Math.max(box.top, up + 3);
  }
  return box;
}

const snowSurfaceDepth = (kind: SnowKind) => kind === 'roots' ? .62 : kind === 'thin' ? .72 : kind === 'melt' ? .8 : 1;

/** Recover shallow world depth while keeping the atlas view aligned to the
 * bridge heading. UVs select complete silhouettes, never slice through a bank. */
export function snowVarietyGeometry(kind: SnowKind, width: number): BufferGeometry {
  const spec = art[kind], [w, h] = spec.size, [cx, cy] = spec.anchor, scale = width / w;
  const columns = 32, rows = 24, positions: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = col / columns * w, py = row / rows * h, x = (px - cx) * scale;
    const sourceUp = (cy - py) * scale + x * (.335 - spec.axisSlope);
    const depth = snowSurfaceDepth(kind);
    const up = x * .335 + (sourceUp - x * .335) * depth;
    const front = cy + h * .42 - (px - cx) * spec.axisSlope;
    const y = 1.2 + Math.min(spec.maxHeight, Math.max(0, front - py) * scale * .20);
    positions.push(x, y, y - up * Math.SQRT2);
    uv.push((spec.crop[0] + px) / manifest.size[0], 1 - (spec.crop[1] + py) / manifest.size[1]);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col;
    indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const g = new BufferGeometry(); g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

export class SnowVarieties {
  readonly group = new Group();
  readonly errors: string[] = [];
  readonly placements: SnowPlacement[];
  private ready = false;
  private disposed = false;
  constructor(private readonly quality: QualitySettings, illumination: EnvironmentIllumination, banks: readonly SnowBankPlacement[]) {
    this.group.name = 'snow-eight-varieties'; this.placements = snowVarietyPlacements(banks);
    const map = new TextureLoader().load(atlasUrl, () => { if (!this.disposed) this.ready = true; }, undefined,
      () => { if (!this.disposed) this.errors.push(atlasUrl); });
    map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4;
    const material = new MeshBasicMaterial({ map, color: 0xe4edff, alphaTest: .42, side: DoubleSide, fog: false, toneMapped: false });
    if (illumination.sources.length) {
      material.onBeforeCompile = shader => {
        illumination.bind(shader); shader.uniforms.snowLight = quality.materials;
        shader.vertexShader = 'varying vec3 snowWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', `
          #include <project_vertex>
          snowWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
        `);
        shader.fragmentShader = 'varying vec3 snowWorld;\nuniform float snowLight;\n' + illumination.glsl() + shader.fragmentShader.replace('#include <color_fragment>', `
          #include <color_fragment>
          float warmth = environmentLightAt(snowWorld) * snowLight;
          diffuseColor.rgb += (vec3(1.0) - diffuseColor.rgb) * vec3(.32, .12, .015) * warmth;
        `);
      };
      material.customProgramCacheKey = () => `snow-variety-environment-${illumination.sources.length}`;
    }
    const pieces = this.placements.map(p => {
      const g = snowVarietyGeometry(p.kind, p.width), point = toThree(bridgePoint(p.u, p.v), .8);
      return g.translate(point.x, point.y, point.z);
    });
    const shadows = pieces.map(g => {
      const shadow = g.clone(), p = shadow.getAttribute('position'); shadow.computeBoundingBox();
      const center = shadow.boundingBox!.getCenter(new Vector3());
      for (let i = 0; i < p.count; i++) p.setXYZ(i, center.x + (p.getX(i) - center.x) * 1.025 + 1.2, .91, p.getZ(i) - p.getY(i) + 2.2);
      shadow.computeBoundingSphere(); return shadow;
    });
    const geometry = mergeGeometries(pieces, false)!, shadowGeometry = mergeGeometries(shadows, false)!;
    pieces.forEach(g => g.dispose()); shadows.forEach(g => g.dispose());
    const contact = new Mesh(shadowGeometry, new MeshBasicMaterial({ map, color: 0x17263e, opacity: .21, transparent: true,
      depthWrite: false, forceSinglePass: true, side: DoubleSide, fog: false, toneMapped: false }));
    contact.name = 'snow-variety-contact';
    const mesh = new Mesh(geometry, material); mesh.name = 'snow-variety-shoulder-batch'; mesh.userData.placements = this.placements;
    this.group.add(contact, mesh); this.update(true);
  }
  update(enabled: boolean): void { this.group.visible = this.ready && enabled && this.quality.winter.value > 0; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}
