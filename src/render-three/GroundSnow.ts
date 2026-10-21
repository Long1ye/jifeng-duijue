import { InstancedBufferAttribute, InstancedMesh, Group, Matrix4, PlaneGeometry, ShaderMaterial } from 'three';
import { BRIDGE, bridgePoint } from '../game/Bridge';
import { toThree, WORLD_ORIGIN } from './Coordinates';
import { ENVIRONMENT_WIND_GLSL } from './EnvironmentMotion';
import type { QualitySettings } from './QualitySettings';

export const GROUND_SNOW = { count: 12, period: 11, duration: 6, maxOpacity: .54 } as const;

/** Low wind-carried powder, deliberately fragmented and quiet over the centre.
 * One fixed instanced draw, no textures, emitters, timers or gameplay objects. */
export class GroundSnow {
  readonly group = new Group();
  readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly time = { value: 0 };
  private disposed = false;
  constructor(private readonly quality: QualitySettings) {
    this.group.name = 'ground-wind-snow';
    const geometry = new PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    geometry.setAttribute('gustSeed', new InstancedBufferAttribute(new Float32Array(Array.from({ length: GROUND_SNOW.count }, (_, i) => i)), 1));
    const [ax, az] = BRIDGE.projection.along, [bx, bz] = BRIDGE.projection.across;
    const material = new ShaderMaterial({
      uniforms: { environmentTime: this.time }, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute float gustSeed; uniform float environmentTime;
        varying vec2 powderUv; varying float powderAlpha; varying float powderPhase;
        ${ENVIRONMENT_WIND_GLSL}
        void main() {
          powderUv = uv;
          float phase = fract(environmentTime / ${GROUND_SNOW.period}.0 + gustSeed * .173);
          float cycleWindow = ${GROUND_SNOW.duration / GROUND_SNOW.period};
          float travel = clamp(phase / cycleWindow, 0.0, 1.0);
          float u = 112.0 - travel * 224.0 + position.x * 120.0;
          float v = -12.0 + mod(gustSeed * 31.0, 110.0) - travel * 58.0 + position.z * 26.0;
          vec3 p = vec3(${ax} * u + ${bx} * v, 2.4 + mod(gustSeed, 3.0) * 1.2, ${az} * u + ${bz} * v);
          vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
          vec3 wind = bridgeWind(environmentTime, world.xz + vec2(${WORLD_ORIGIN.x}, ${WORLD_ORIGIN.y}));
          world.x += sin(environmentTime * 2.1 + gustSeed) * 7.0 * sin(travel * 3.14159);
          float envelope = smoothstep(0.0, .15, travel) * (1.0 - smoothstep(.72, 1.0, travel));
          float lane = mix(.65, 1.0, smoothstep(25.0, 75.0, abs(v)));
          powderAlpha = envelope * lane * (.80 + wind.z * .20) * ${GROUND_SNOW.maxOpacity};
          powderPhase = environmentTime * 1.8 + gustSeed * 3.7;
          gl_Position = projectionMatrix * viewMatrix * world;
        }`,
      fragmentShader: `varying vec2 powderUv; varying float powderAlpha; varying float powderPhase;
        void main() {
          vec2 p = powderUv - .5;
          float curl = sin(p.x * 11.0 + powderPhase) * .055 + sin(p.x * 24.0 - powderPhase * .7) * .025;
          float strands = exp(-pow((p.y + curl) * 8.0, 2.0))
            + exp(-pow((p.y - .17 + curl * .6) * 15.0, 2.0)) * .36;
          float ends = smoothstep(0.0, .18, powderUv.x) * (1.0 - smoothstep(.65, 1.0, powderUv.x));
          float breaks = .48 + .52 * smoothstep(-.6, .8, sin(p.x * 33.0 + p.y * 13.0 - powderPhase * 2.0));
          float alpha = min(.70, min(1.0, strands) * breaks * .60 * ends * powderAlpha);
          gl_FragColor = vec4(.90, .95, 1.0, alpha);
        }`,
    });
    this.mesh = new InstancedMesh(geometry, material, GROUND_SNOW.count); this.mesh.name = 'ground-snow-ribbons'; this.mesh.frustumCulled = false;
    const matrix = new Matrix4();
    for (let i = 0; i < GROUND_SNOW.count; i++) {
      const p = toThree(bridgePoint(-610 + i * 112, 0)); matrix.makeTranslation(p.x, 0, p.z); this.mesh.setMatrixAt(i, matrix);
    }
    this.group.add(this.mesh); this.update(0);
  }
  update(time: number): void {
    this.time.value = Number.isFinite(time) ? Math.max(0, time) : 0;
    this.group.visible = this.quality.weather.value > 0 && !this.quality.reduced;
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.mesh.dispose(); this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.group.clear(); this.group.removeFromParent();
  }
}
