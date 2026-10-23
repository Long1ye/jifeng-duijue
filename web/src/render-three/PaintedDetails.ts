import { DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, type Texture } from 'three';
import metadata from '../../assets/map-modules/howling-details-v1/props.json';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import brushUrl from '../../assets/map-modules/howling-brush-v3/brush-bed.png?url';
import { artEdgeV } from './PaintedMapLayout';
import { landmarkRelief } from './PaintedMapLandmarks';
import { toThree } from './Coordinates';
import { disposeSceneResources } from './SceneResources';
import { ART_BRUSHES } from './PaintedMapLayout';
import { ENVIRONMENT_WIND_GLSL, SCENE_MOTION } from './EnvironmentMotion';
import { WORLD_ORIGIN } from './Coordinates';

const urls = import.meta.glob('../../assets/map-modules/howling-details-v1/props/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
type Kind = keyof typeof metadata;
export interface DetailPlacement { kind: Kind; u: number; side: -1 | 1; width: number; inset: number; }
// Native transparent bed derived from concept 08. The sloping root profile
// follows the bridge heading, so roots meet the paving rather than float.
export const BRUSH_BED = {
  size: [1672, 941], anchor: [850, 660], opaqueWidth: 1560,
  baseline: [[80, 835], [150, 864], [250, 876], [450, 862], [650, 803], [850, 748],
    [1050, 675], [1250, 610], [1450, 513], [1570, 459], [1630, 421], [1672, 395]],
} as const;
// Winter decoration lives in ArchitecturalIce and PaintedSmallDetails.
export const DETAIL_PLACEMENTS: DetailPlacement[] = [];

export class PaintedDetails {
  readonly group = new Group();
  readonly errors: string[] = [];
  private readonly ready = new Set<Texture>();
  private disposed = false;
  private readonly windTime = { value: 0 };
  constructor() {
    this.group.name = 'painted-independent-details';
    const loader = new TextureLoader();
    const materials = new Map<Kind, MeshBasicMaterial>();
    const loadMaterial = (url: string) => {
      const map = loader.load(url, texture => { if (!this.disposed) this.ready.add(texture); }, undefined,
        () => { if (!this.disposed) this.errors.push(url); });
      map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4;
      return new MeshBasicMaterial({ map, alphaTest: .35, side: DoubleSide, toneMapped: false, fog: false });
    };
    const materialFor = (kind: Kind): MeshBasicMaterial => {
      let material = materials.get(kind);
      if (!material) {
        const url = urls[`../../assets/map-modules/howling-details-v1/props/${kind}.png`];
        if (!url) throw new Error(`Missing detail prop ${kind}`);
        material = loadMaterial(url);
        materials.set(kind, material);
      }
      return material;
    };
    for (const placement of DETAIL_PLACEMENTS) {
      const { kind, u, side, width, inset } = placement, info = metadata[kind];
      const material = materialFor(kind);
      const [w, h] = info.size, base = h * .89;
      const geometry = landmarkRelief({ size: [w, h], anchor: [w / 2, base], scale: width / w, baseline: [[0, base], [w, base]] });
      const mesh = new Mesh(geometry, material);
      mesh.name = `painted-detail-${kind}`; mesh.userData.detailPlacement = placement;
      mesh.position.copy(toThree(bridgePoint(u, side * (artEdgeV(u) - inset)), 1));
      this.group.add(mesh);
    }
    // One complete high-grass asset per authored bed; no repeated legacy tufts
    // or ferns. Preserve the shared gameplay footprint and all authored anchors.
    const brushMaterial = loadMaterial(brushUrl);
    brushMaterial.onBeforeCompile = shader => {
      shader.uniforms.environmentTime = this.windTime;
      shader.vertexShader = 'uniform float environmentTime;\n' + ENVIRONMENT_WIND_GLSL + shader.vertexShader.replace('#include <begin_vertex>', `
        #include <begin_vertex>
        float rootWeight = smoothstep(12.0, 95.0, position.y);
        vec2 world = (modelMatrix * vec4(position, 1.0)).xz + vec2(${WORLD_ORIGIN.x.toFixed(3)}, ${WORLD_ORIGIN.y.toFixed(3)});
        vec3 wind = bridgeWind(environmentTime, world);
        float breeze = sin(environmentTime * 1.8 + world.x * 0.012);
        transformed.x += rootWeight * (wind.x * ${SCENE_MOTION.grassWind} + breeze * (${SCENE_MOTION.grassFlutter} + wind.z * 10.0));
        transformed.z += rootWeight * (wind.y * .13 + sin(environmentTime * 2.3 + world.x * 0.018 + world.y * 0.013) * (3.0 + wind.z * 4.0));
      `);
    };
    brushMaterial.customProgramCacheKey = () => 'painted-brush-rooted-wind-v4-visible-gust';
    for (const brush of ART_BRUSHES) {
      const projectedWidth = brush.length * Math.abs(BRIDGE.projection.along[0])
        + brush.width * Math.abs(BRIDGE.projection.across[0]);
      const geometry = landmarkRelief({ ...BRUSH_BED, scale: projectedWidth / BRUSH_BED.opaqueWidth });
      const mesh = new Mesh(geometry, brushMaterial); mesh.name = `painted-brush-${brush.id}-v3`;
      mesh.position.copy(toThree(bridgePoint(brush.u, brush.v), 1.1)); mesh.castShadow = true;
      mesh.userData.brushId = brush.id; mesh.userData.brushBounds = brush;
      this.group.add(mesh);
    }
    this.update();
  }
  update(time = 0): void {
    this.windTime.value = time;
    for (const child of this.group.children) {
      const mesh = child as Mesh<import('three').BufferGeometry, MeshBasicMaterial>;
      mesh.visible = this.ready.has(mesh.material.map!);
    }
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}
