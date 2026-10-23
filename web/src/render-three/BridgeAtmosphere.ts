import { BufferAttribute, BufferGeometry, Color, Group, Mesh, PlaneGeometry, Points, ShaderMaterial, Vector2 } from 'three';
import { bridgePoint } from '../game/Bridge';
import { ART_BRAZIERS, artBrazierMount } from './PaintedMapLayout';
import { toThree } from './Coordinates';
import { WORLD_ORIGIN } from './Coordinates';
import { ENVIRONMENT_WIND_GLSL } from './EnvironmentMotion';
import type { ThreeCamera } from './Coordinates';
import { QUALITY_TUNING, QualitySettings } from './QualitySettings';

export const FALLING_SNOW = { count: 420, size: 2.6, opacity: .48, centerWeight: .65 } as const;

/** Sparse embers above existing bowls and low canyon mist, outside the deck.
 * Simulation time drives both, so pause and restart remain deterministic. */
export class BridgeAtmosphere {
  readonly group = new Group();
  private readonly time = { value: 0 };
  private readonly snowCenter = { value: new Vector2() };
  private readonly snowExtent = { value: new Vector2(1200, 950) };
  private disposed = false;
  constructor(quality = new QualitySettings()) {
    this.group.name = 'bridge-environment-motion';
    const positions: number[] = [], phases: number[] = [];
    ART_BRAZIERS.forEach(({ u, v }, bowl) => {
      const mount = artBrazierMount(u, v);
      const p = toThree(bridgePoint(mount.u, mount.v), mount.height + 27.3);
      for (let i = 0; i < 5; i++) {
        positions.push(p.x, p.y, p.z); phases.push((i / 5 + bowl * .173) % 1);
      }
    });
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('phase', new BufferAttribute(new Float32Array(phases), 1));
    const emberMaterial = new ShaderMaterial({
      uniforms: { environmentTime: this.time, weatherQuality: quality.weather }, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute float phase; uniform float environmentTime; uniform float weatherQuality; varying float life;
        ${ENVIRONMENT_WIND_GLSL}
        void main() {
          life = fract(environmentTime * 0.27 + phase);
          vec3 wind = bridgeWind(environmentTime, position.xz + vec2(${WORLD_ORIGIN.x.toFixed(3)}, ${WORLD_ORIGIN.y.toFixed(3)}));
          vec3 p = position + vec3(life * wind.x * 0.35 + sin(life * 8.0 + phase * 20.0) * 3.0, life * 42.0, life * wind.y * 0.35);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          gl_PointSize = (2.4 - life * 1.0) * (1.0 + weatherQuality * 0.3);
        }`,
      fragmentShader: `varying float life;
        void main() {
          float shape = 1.0 - smoothstep(0.18, 0.5, length(gl_PointCoord - 0.5));
          gl_FragColor = vec4(1.0, 0.46 + life * 0.15, 0.14, shape * sin(life * 3.14159) * 0.65);
        }`,
    });
    const embers = new Points(geometry, emberMaterial); embers.frustumCulled = false;
    embers.name = 'bridge-brazier-embers'; this.group.add(embers);
    const flakes: number[] = [], seeds: number[] = [], weatherSeeds: number[] = [];
    for (let i = 0; i < FALLING_SNOW.count; i++) {
      const u = -760 + (i * .61803398875 % 1) * 1520;
      const v = (i % 2 ? -1 : 1) * (80 + (i * .41421356237 % 1) * 160);
      const p = toThree(bridgePoint(u, v), 40 + i % 13 * 23);
      flakes.push(p.x, p.y, p.z); seeds.push(i * .754877666 % 1);
      weatherSeeds.push(i * .61803398875 % 1, i * .569840291 % 1, i % 3);
    }
    const snowGeometry = new BufferGeometry();
    snowGeometry.setAttribute('position', new BufferAttribute(new Float32Array(flakes), 3));
    snowGeometry.setAttribute('phase', new BufferAttribute(new Float32Array(seeds), 1));
    snowGeometry.setAttribute('snowSeed', new BufferAttribute(new Float32Array(weatherSeeds), 3));
    const snowMaterial = new ShaderMaterial({ uniforms: { environmentTime: this.time, weatherQuality: quality.weather, snowCenter: this.snowCenter, snowExtent: this.snowExtent }, transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute float phase; attribute vec3 snowSeed; uniform float environmentTime;
        uniform float weatherQuality; uniform vec2 snowCenter; uniform vec2 snowExtent;
        varying float snowAlpha; varying float snowLayer; varying float snowEnhanced;
        ${ENVIRONMENT_WIND_GLSL}
        void main() {
          vec3 wind = bridgeWind(environmentTime, position.xz + vec2(${WORLD_ORIGIN.x.toFixed(3)}, ${WORLD_ORIGIN.y.toFixed(3)}));
          float life = fract(environmentTime * 0.055 + phase);
          vec3 p = position + vec3((life - 0.5) * wind.x * 2.0, 160.0 - life * 370.0, (life - 0.5) * wind.y * 2.0);
          float legacyAlpha = sin(life * 3.14159) * 0.38;
          // Wrapped world positions remain stationary under camera movement
          // until they cross an invisible, faded boundary of the coverage box.
          float snowLife = fract(environmentTime * 0.095 + phase);
          vec2 drift = vec2(-24.0, 7.0) * environmentTime
            + vec2(-18.0, 4.0) * sin(environmentTime * 0.38 + phase * 6.283185);
          vec2 base = (snowSeed.xy - 0.5) * snowExtent + drift;
          vec2 relative = mod(base - snowCenter + snowExtent * 0.5, snowExtent) - snowExtent * 0.5;
          vec2 weatherWorld = relative + snowCenter;
          float edge = 1.0 - smoothstep(0.78, 0.98, max(abs(relative.x / snowExtent.x), abs(relative.y / snowExtent.y)) * 2.0);
          float quietCenter = mix(${FALLING_SNOW.centerWeight}, 1.0, smoothstep(65.0, 230.0, length(relative)));
          snowLayer = snowSeed.z;
          vec3 weatherPosition = vec3(weatherWorld.x, (220.0 + snowLayer * 70.0) * (1.0 - snowLife), weatherWorld.y);
          float weatherAlpha = sin(snowLife * 3.14159) * (${FALLING_SNOW.opacity} + snowLayer * 0.10) * edge * quietCenter;
          snowAlpha = mix(legacyAlpha, weatherAlpha, weatherQuality); snowEnhanced = weatherQuality;
          p = mix(p, weatherPosition, weatherQuality);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); gl_PointSize = 1.2 + phase * 0.9;
          gl_PointSize = mix(gl_PointSize, ${FALLING_SNOW.size} + snowLayer * 1.2 + phase * 0.8, weatherQuality);
        }`,
      fragmentShader: `varying float snowAlpha; varying float snowLayer; varying float snowEnhanced;
        void main() {
          vec2 point = gl_PointCoord - 0.5;
          point.x += point.y * 0.22; point.y *= 0.82;
          float shape = 1.0 - smoothstep(0.16, 0.50, length(point));
          gl_FragColor = vec4(mix(vec3(0.79, 0.87, 0.95), vec3(0.90, 0.95, 1.0), snowEnhanced), snowAlpha * mix(1.0, shape, snowEnhanced));
        }`,
    });
    const snow = new Points(snowGeometry, snowMaterial); snow.frustumCulled = false; snow.name = 'bridge-sparse-snow'; this.group.add(snow);
    const mistMaterial = new ShaderMaterial({
      uniforms: { environmentTime: this.time, mistColor: { value: new Color(0xa6bad1) }, canyonGrade: quality.grading },
      transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `varying vec2 mistUv;
        void main() { mistUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform float environmentTime; uniform float canyonGrade; uniform vec3 mistColor; varying vec2 mistUv;
        void main() {
          vec2 p = mistUv;
          float ridge = 0.5 + 0.16 * sin(p.x * 17.0 - environmentTime * 0.12)
            + 0.07 * sin(p.x * 39.0 + environmentTime * 0.08);
          float alpha = exp(-pow((p.y - ridge) * 8.0, 2.0))
            * smoothstep(0.0, 0.2, p.x) * (1.0 - smoothstep(0.8, 1.0, p.x));
          gl_FragColor = vec4(mistColor, alpha * 0.11 * (1.0 + canyonGrade * ${QUALITY_TUNING.canyonMistEnhancement}));
        }`,
    });
    for (const [i, z] of [-370, 190, 680].entries()) {
      const mist = new Mesh(new PlaneGeometry(5600, 460), mistMaterial);
      mist.rotation.x = -Math.PI / 4; mist.position.set(i * 260 - 240, -360 - i * 230, z);
      mist.name = 'bridge-canyon-mist'; this.group.add(mist);
    }
  }
  update(time: number, camera?: ThreeCamera): void {
    this.time.value = Number.isFinite(time) ? Math.max(0, time) : 0;
    if (camera) {
      const focus = toThree(camera.focus);
      this.snowCenter.value.set(focus.x, focus.z);
      this.snowExtent.value.set(Math.max(1200, (camera.camera.right - camera.camera.left) * 1.4), Math.max(950, (camera.camera.top - camera.camera.bottom) * Math.SQRT2 * 1.4));
      this.group.children.filter(object => object.name === 'bridge-canyon-mist').forEach((mist, i) => {
        const parallax = .04 + i * .03;
        mist.position.x = i * 260 - 240 + focus.x * parallax;
        mist.position.z = [-370, 190, 680][i] + focus.z * parallax;
      });
    }
  }
  setQuality(reduced: boolean): void { const snow = this.group.getObjectByName('bridge-sparse-snow'); if (snow) snow.visible = !reduced; }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const materials = new Set<ShaderMaterial>();
    this.group.traverse(o => {
      if (o instanceof Mesh || o instanceof Points) {
        o.geometry.dispose(); materials.add(o.material as ShaderMaterial);
      }
    });
    materials.forEach(m => m.dispose()); this.group.clear(); this.group.removeFromParent();
  }
}
