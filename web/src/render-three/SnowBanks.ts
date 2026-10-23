import { BufferAttribute, BufferGeometry, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, Vector3 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import snowUrl from '../../assets/map-modules/howling-snowbanks-v2/snow-rubble-bank.png?url';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { ART_BRAZIERS, ART_BRUSHES, ART_GUARDIANS, artEdgeV } from './PaintedMapLayout';
import { toThree } from './Coordinates';
import type { QualitySettings } from './QualitySettings';
import type { EnvironmentIllumination } from './EnvironmentIllumination';
import { disposeSceneResources } from './SceneResources';
import { SnowVarieties } from './SnowVarieties';

export const SNOW_BANK_ART = { size: [1536, 1024], anchor: [768, 590], maxHeight: 11 } as const;
export interface SnowBankPlacement { u: number; side: -1 | 1; width: number; inset: number; }
// Small independent banks, with bare wall sections and established grass/fire
// locations left clear. The centre lane is deliberately not decorated.
const candidates: SnowBankPlacement[] = [-1, 1].flatMap(side => [
  [-665, 180], [-587, 164], [-452, 200], [-390, 190], [-337, 110], [-283, 146], [-238, 162],
  [-45, 170], [215, 164], [366, 180], [455, 190], [588, 164], [670, 180],
].map(([u, width]) => ({ u: side === 1 ? u + 12 : u, side: side as -1 | 1, width,
  inset: side < 0 ? 15 : 35 })));
export const SNOW_BANK_PLACEMENTS = candidates.filter(p => {
  const halfLength = p.width / Math.abs(BRIDGE.projection.along[0]) / 2;
  return !ART_BRUSHES.some(b => Math.sign(b.v) === p.side && Math.abs(p.u - b.u) < b.length / 2 + halfLength + 3)
    && !ART_BRAZIERS.some(b => Math.sign(b.v) === p.side && Math.abs(p.u - b.u) < halfLength + 9)
    && !ART_GUARDIANS.some(g => Math.sign(g.v) === p.side && Math.abs(p.u - g.u) < halfLength + 17);
});

/** Fixed-view shallow relief: preserve every source pixel's camera projection
 * while spreading the footprint on the ground and limiting snow/stone height.
 * In contrast, a fully upright sprite would turn this bank into a tall wall. */
export function snowBankGeometry(width: number): BufferGeometry {
  const [w, h] = SNOW_BANK_ART.size, [cx, cy] = SNOW_BANK_ART.anchor, scale = width / w;
  const positions: number[] = [], uv: number[] = [], indices: number[] = [];
  const columns = 48, rows = 28;
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = col / columns * w, py = row / rows * h;
    // Approximate the sloping front contact line, rather than interpreting the
    // whole image height as snow thickness. Source alpha supplies its clumpy edge.
    const front = 975 - px * .345;
    const y = 1.2 + Math.min(SNOW_BANK_ART.maxHeight, Math.max(0, front - py) * scale * .20);
    positions.push((px - cx) * scale, y, y - (cy - py) * scale * Math.SQRT2);
    uv.push(px / w, 1 - py / h);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col;
    indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2));
  g.setIndex(indices); g.computeVertexNormals(); g.computeBoundingSphere(); return g;
}

export class SnowBanks {
  readonly group = new Group();
  private readonly loadErrors: string[] = [];
  readonly varieties: SnowVarieties;
  private varietyEnabled = true;
  get errors(): string[] { return [...this.loadErrors, ...this.varieties.errors]; }
  private ready = false;
  private disposed = false;
  constructor(private readonly quality: QualitySettings, illumination: EnvironmentIllumination) {
    this.group.name = 'snow-rubble-banks';
    this.varieties = new SnowVarieties(quality, illumination, SNOW_BANK_PLACEMENTS);
    const map = new TextureLoader().load(snowUrl, () => { if (!this.disposed) this.ready = true; }, undefined,
      () => { if (!this.disposed) this.loadErrors.push(snowUrl); });
    map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4;
    const material = new MeshBasicMaterial({ map, color: 0xe4edff, alphaTest: .38, side: DoubleSide, fog: false, toneMapped: false });
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
      material.customProgramCacheKey = () => `snow-bank-environment-${illumination.sources.length}`;
    }
    const pieces = SNOW_BANK_PLACEMENTS.map(p => {
      const g = snowBankGeometry(p.width), point = toThree(bridgePoint(p.u, p.side * (artEdgeV(p.u) - p.inset)), .8);
      return g.translate(point.x, point.y, point.z);
    });
    const shadowPieces = pieces.map(g => {
      const shadow = g.clone(), position = shadow.getAttribute('position');
      shadow.computeBoundingBox(); const center = shadow.boundingBox!.getCenter(new Vector3());
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), y = position.getY(i), z = position.getZ(i);
        const groundZ = z - y;
        position.setXYZ(i, center.x + (x - center.x) * 1.025 + 1.2, .91, groundZ + 2.2);
      }
      shadow.computeBoundingSphere(); return shadow;
    });
    const shadowGeometry = mergeGeometries(shadowPieces, false)!; shadowPieces.forEach(g => g.dispose());
    const contact = new Mesh(shadowGeometry, new MeshBasicMaterial({ map, color: 0x17263e, opacity: .24, transparent: true, depthWrite: false, forceSinglePass: true, side: DoubleSide, fog: false, toneMapped: false }));
    contact.name = 'snow-bank-contact'; this.group.add(contact);
    const geometry = mergeGeometries(pieces, false)!; pieces.forEach(g => g.dispose());
    const mesh = new Mesh(geometry, material); mesh.name = 'snow-rubble-shoulder-batch';
    mesh.userData.placements = SNOW_BANK_PLACEMENTS; this.group.add(mesh, this.varieties.group); this.update();
  }
  setVariety(enabled: boolean): void { this.varietyEnabled = enabled; this.update(); }
  update(): void {
    this.varieties.update(this.varietyEnabled);
    for (const child of this.group.children) if (child !== this.varieties.group) child.visible = this.ready && !this.varietyEnabled;
    this.group.visible = this.quality.winter.value > 0 && (this.varieties.group.visible || (this.ready && !this.varietyEnabled));
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.varieties.dispose(); disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}
