import { Color, DoubleSide, Group, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshBasicMaterial, SRGBColorSpace, TextureLoader, Vector3, Vector4, type Object3D } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import hangingUrl from '../../assets/map-modules/howling-architectural-ice-v1/props/hanging-shards.png?url';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { toThree } from './Coordinates';
import { artEdgeV } from './PaintedMapLayout';
import { wallDetailGeometry } from './PaintedSmallDetails';
import type { QualitySettings } from './QualitySettings';
import type { EnvironmentIllumination } from './EnvironmentIllumination';
import { disposeSceneResources } from './SceneResources';

/** Static art parameters, in bridge-local units except for light radii. */
export const WINTER_DRESSING = {
  iceOpacity: .72, crystalRadius: 235, crystalStrength: .5,
  // Attached below the near deck lip, outside the playable lane.
  pendants: [
    { u: -452, width: 53 }, { u: -328, width: 66 }, { u: -64, width: 48 },
    { u: 272, width: 61 }, { u: 464, width: 55 },
  ],
  icePools: [
    [-427, -1, 29, 12], [-305, -1, 40, 17], [-245, 1, 35, 14], [-25, 1, 28, 13],
    [215, -1, 38, 14], [339, 1, 35, 16], [479, -1, 32, 13], [600, 1, 30, 12],
  ],
} as const;

export function winterGround(name: string): boolean {
  return ['painted-bridge-floor', 'painted-road-extension', 'painted-circular-paving', 'painted-wall-footing'].includes(name);
}

const noiseGLSL = `
  float winterHash(vec2 p) {
    vec3 h = fract(vec3(p.xyx) * .1031);
    h += dot(h, h.yzx + 33.33);
    return fract((h.x + h.y) * h.z);
  }
  float winterNoise(vec2 p) {
    vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(winterHash(cell), winterHash(cell + vec2(1, 0)), f.x),
      mix(winterHash(cell + vec2(0, 1)), winterHash(cell + vec2(1)), f.x), f.y);
  }
`;

/** Owns only the new pendants. Ground treatment borrows existing materials and
 * emitter uniforms, so shadows, alpha edges, picking and source textures survive. */
export class WinterDressing {
  readonly group = new Group();
  readonly errors: string[] = [];
  readonly crystalSources: Object3D[] = [];
  readonly crystals = { value: [] as Vector4[] };
  readonly crystalColors = { value: [] as Vector3[] };
  private readonly strength = { value: 1 };
  private readonly fine = { value: 1 };
  private readonly world = new Vector3();
  private readonly colors: Vector3[] = [];
  private ready = false;
  private disposed = false;

  constructor(private readonly quality: QualitySettings, roots: Group[], private readonly illumination: EnvironmentIllumination) {
    this.group.name = 'winter-dressing';
    for (const root of roots) root.traverse(source => {
      if (!(source instanceof Mesh) || !/^painted-(tower|inner-tower|nexus-tower|inhibitor|nexus)$/.test(source.name)) return;
      this.crystalSources.push(source);
      this.crystals.value.push(new Vector4(0, 0, 0, WINTER_DRESSING.crystalRadius));
      const color = new Color(source.userData.team === 'red' ? 0xff604c : 0x5db7ff);
      this.colors.push(new Vector3(color.r, color.g, color.b));
      this.crystalColors.value.push(new Vector3());
    });
    const treated = new Set<MeshBasicMaterial>();
    for (const root of roots) root.traverse(source => {
      if (!(source instanceof Mesh) || !(source.material instanceof MeshBasicMaterial) || !winterGround(source.name) || treated.has(source.material)) return;
      treated.add(source.material); this.treat(source.material);
    });

    const map = new TextureLoader().load(hangingUrl, () => { if (!this.disposed) this.ready = true; }, undefined,
      () => { if (!this.disposed) this.errors.push(hangingUrl); });
    map.colorSpace = SRGBColorSpace; map.magFilter = LinearFilter; map.minFilter = LinearMipmapLinearFilter; map.anisotropy = 4;
    const material = new MeshBasicMaterial({ map, color: 0xadc4df, alphaTest: .4, side: DoubleSide, toneMapped: false, fog: false });
    const geometries = WINTER_DRESSING.pendants.map(({ u, width }) => {
      const geometry = wallDetailGeometry(285, 250, width);
      const point = toThree(bridgePoint(u, artEdgeV(u) + 8), -10);
      return geometry.translate(point.x, point.y, point.z);
    });
    const geometry = mergeGeometries(geometries, false)!;
    geometries.forEach(g => g.dispose());
    const pendants = new Mesh(geometry, material); pendants.name = 'winter-long-exterior-icicles';
    pendants.userData.placements = WINTER_DRESSING.pendants;
    this.group.add(pendants); this.update();
  }

  private treat(material: MeshBasicMaterial) {
    const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
    const [ax, az] = BRIDGE.projection.along, [bx, bz] = BRIDGE.projection.across;
    const determinant = ax * bz - az * bx;
    const count = this.crystalSources.length, fires = this.illumination.sources.length;
    material.onBeforeCompile = (shader, renderer) => {
      previous.call(material, shader, renderer);
      shader.uniforms.winterStrength = this.strength; shader.uniforms.winterFine = this.fine;
      shader.uniforms.winterCrystals = this.crystals; shader.uniforms.winterCrystalColors = this.crystalColors;
      shader.uniforms.winterFires = this.illumination.positions; shader.uniforms.winterFireStrengths = this.illumination.strengths;
      shader.vertexShader = 'varying vec3 winterWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', `
        #include <project_vertex>
        winterWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
      `);
      shader.fragmentShader = `uniform float winterStrength; uniform float winterFine;
        varying vec3 winterWorld;
        ${count ? `uniform vec4 winterCrystals[${count}]; uniform vec3 winterCrystalColors[${count}];` : ''}
        ${fires ? `uniform vec4 winterFires[${fires}]; uniform float winterFireStrengths[${fires}];` : ''}
        ${noiseGLSL}
      ` + shader.fragmentShader.replace('#include <color_fragment>', `
        #include <color_fragment>
        if (winterStrength > 0.0) {
          vec2 winterLocal = vec2(${bz / determinant} * winterWorld.x - ${bx / determinant} * winterWorld.z,
            ${-az / determinant} * winterWorld.x + ${ax / determinant} * winterWorld.z);
          float winterU = winterLocal.x, winterV = winterLocal.y;
          float winterEdge = 122.0 + clamp((abs(winterU) - 470.0) / 250.0, 0.0, 1.0) * 48.0;
          float melt = 0.0;
          ${fires ? `for (int i = 0; i < ${fires}; i++) {
            float heat = max(0.0, 1.0 - length(winterWorld.xz - winterFires[i].xz) / (winterFires[i].w * .43));
            melt += heat * heat * winterFireStrengths[i];
          }` : ''}
          float icePool = 0.0;
          ${WINTER_DRESSING.icePools.map(([u, side, length, width]) => `{
            vec2 d = (winterLocal - vec2(${u}.0, ${side}.0 * (winterEdge - 30.0))) / vec2(${length}.0, ${width}.0);
            float pool = 1.0 - smoothstep(.66, 1.0, length(d) + (winterNoise(winterWorld.xz * .045) - .5) * .38);
            icePool = max(icePool, pool);
          }`).join('\n')}
          float iceMask = icePool * (1.0 - smoothstep(.08, .6, melt)) * winterStrength;
          vec3 iceColor = diffuseColor.rgb * vec3(.53, .84, 1.08) + vec3(.017, .049, .095);
          float sheen = winterNoise(winterWorld.xz * .018 + vec2(4, 11));
          iceColor += vec3(.035, .065, .095) * smoothstep(.3, .85, sheen);
          // Stable world-space fracture cells; pixel derivatives soften lines
          // when zoomed out instead of sparkling or crawling with the camera.
          vec2 crackP = winterWorld.xz / 31.0, cell = floor(crackP), f = fract(crackP);
          float nearest = 10.0, second = 10.0;
          if (winterFine > 0.0) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
            vec2 offset = vec2(float(x), float(y));
            vec2 site = offset + vec2(winterHash(cell + offset), winterHash(cell + offset + 17.0)) * .7 + .15;
            float distance = length(site - f);
            if (distance < nearest) { second = nearest; nearest = distance; } else second = min(second, distance);
          }
          float fracture = second - nearest;
          float pixel = max(.012, fwidth(fracture));
          float crackLine = (1.0 - smoothstep(.018, .018 + pixel * 1.3, fracture)) * winterFine;
          iceColor = mix(iceColor, vec3(.24, .39, .55), crackLine * .8);
          diffuseColor.rgb = mix(diffuseColor.rgb, iceColor, iceMask * ${WINTER_DRESSING.iceOpacity});

          ${count ? `vec3 crystalLight = vec3(0.0);
          for (int i = 0; i < ${count}; i++) {
            float radius = winterCrystals[i].w;
            float distance = length(winterWorld.xz - winterCrystals[i].xz);
            float light = pow(max(0.0, 1.0 - distance / radius), 2.0);
            crystalLight += winterCrystalColors[i] * light;
          }
          diffuseColor.rgb += (diffuseColor.rgb * .55 + vec3(.13)) * crystalLight * winterStrength;` : ''}
        }
      `);
    };
    material.customProgramCacheKey = () => `${key}-winter-dressing-v2-no-painted-snow-${count}-${fires}`;
  }

  update(): void {
    this.strength.value = this.quality.winter.value;
    this.fine.value = this.quality.reduced ? 0 : 1;
    this.group.visible = this.ready && this.strength.value > 0;
    this.crystalSources.forEach((source, i) => {
      source.updateWorldMatrix(true, false); source.getWorldPosition(this.world);
      this.crystals.value[i].set(this.world.x, this.world.y, this.world.z, WINTER_DRESSING.crystalRadius);
      let visible = true;
      for (let parent: Object3D | null = source; parent; parent = parent.parent) visible &&= parent.visible;
      const opacity = (source as Mesh<import('three').BufferGeometry, MeshBasicMaterial>).material.opacity;
      this.crystalColors.value[i].copy(this.colors[i]).multiplyScalar(visible ? WINTER_DRESSING.crystalStrength * opacity : 0);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; disposeSceneResources(this.group); this.group.clear(); this.group.removeFromParent();
  }
}
