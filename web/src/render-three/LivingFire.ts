import { DoubleSide, InstancedMesh, Object3D, PlaneGeometry, ShaderMaterial, type Object3D as Source } from 'three';
import { SCENE_MOTION } from './EnvironmentMotion';

/** One transparent batch of upward advecting flames; original bowls retain depth. */
export class LivingFire {
  readonly time = { value: 0 };
  readonly mesh: InstancedMesh<PlaneGeometry, ShaderMaterial>;
  private readonly pose = new Object3D();
  private disposed = false;
  constructor(private readonly sources: Source[]) {
    const geometry = new PlaneGeometry(1, 1);
    const material = new ShaderMaterial({
      uniforms: { fireTime: this.time }, transparent: true, depthWrite: false,
      side: DoubleSide, toneMapped: false,
      vertexShader: `
        varying vec2 flameUv; varying float flameSeed;
        void main() {
          flameUv = uv;
          flameSeed = instanceMatrix[3].x * 0.071 + instanceMatrix[3].z * 0.039;
          gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform float fireTime; varying vec2 flameUv; varying float flameSeed;
        float fireHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float fireNoise(vec2 p) {
          vec2 cell = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(fireHash(cell), fireHash(cell + vec2(1.0, 0.0)), f.x),
            mix(fireHash(cell + vec2(0.0, 1.0)), fireHash(cell + vec2(1.0)), f.x), f.y);
        }
        float fireFbm(vec2 p) {
          return fireNoise(p) * 0.57 + fireNoise(p * 2.03 + 4.7) * 0.29 + fireNoise(p * 4.07 - 9.2) * 0.14;
        }
        void main() {
          vec2 uv = flameUv;
          float t = fireTime + flameSeed;
          float bend = (fireFbm(vec2(uv.y * 3.7 - t * 0.8, flameSeed)) - 0.5) * uv.y * 0.38;
          float x = uv.x - 0.5 + bend;
          float turbulence = fireFbm(vec2(uv.x * 6.0 + flameSeed, uv.y * 7.0 - t * ${SCENE_MOTION.flameRise}));
          float density = -10.0;
          // Independently fed tongues join at the coals, fork and die at different heights.
          for (int i = 0; i < 5; i++) {
            float lane = float(i) - 2.0;
            float height = (0.68 + 0.20 * sin(t * (1.1 + float(i) * 0.23) + lane * 2.1)) * (1.0 - abs(lane) * 0.12);
            float localY = uv.y / height;
            float center = lane * 0.105 + sin(localY * 5.0 - t * 2.0 + lane * 2.3) * localY * 0.07;
            float width = max(0.0, 0.16 * (1.0 - localY));
            float tongue = (width - abs(x - center)) * 10.0 + (turbulence - 0.5) * 0.85;
            tongue -= max(0.0, localY - 1.0) * 10.0;
            density = max(density, tongue);
          }
          float aa = max(fwidth(density) * 1.3, 0.045);
          float alpha = smoothstep(-aa, aa, density);
          alpha *= smoothstep(0.0, 0.075, uv.y) * (1.0 - smoothstep(0.86, 1.0, uv.y));
          // Advected gaps tear off the upper tongues instead of swaying a still image.
          alpha *= mix(1.0, smoothstep(0.20, 0.53, turbulence), smoothstep(0.45, 0.95, uv.y));
          float core = smoothstep(0.10, 1.25, density) * (1.0 - uv.y * 0.75);
          vec3 color = mix(vec3(1.0, 0.14, 0.008), vec3(1.0, 0.68, 0.055), core);
          color = mix(color, vec3(1.0, 0.96, 0.64), pow(core, 3.0));
          gl_FragColor = vec4(color, alpha * 0.94);
          #include <colorspace_fragment>
        }`,
    });
    this.mesh = new InstancedMesh(geometry, material, sources.length);
    this.mesh.name = 'living-brazier-flames';
    this.mesh.frustumCulled = false;
    this.update(0);
  }
  update(time: number): void {
    if (this.disposed) return;
    this.time.value = time;
    this.mesh.visible = true;
    this.sources.forEach((source, i) => {
      // Match the painted flame root (source pixel y≈530); the front rim stays in front.
      this.pose.position.copy(source.position);
      // The painted prop is a vertical relief, not a camera-facing card. Match
      // its depth plane; tilting a card backwards buried it in the charcoal.
      this.pose.position.y += 44.5 + SCENE_MOTION.flameHeight * Math.SQRT2 / 2;
      this.pose.position.z += .6;
      this.pose.rotation.set(0, 0, 0);
      this.pose.scale.set(source.visible ? SCENE_MOTION.flameWidth : 0, SCENE_MOTION.flameHeight * Math.SQRT2, 1);
      this.pose.updateMatrix(); this.mesh.setMatrixAt(i, this.pose.matrix);
    });
    this.mesh.instanceMatrix.needsUpdate = true;
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.mesh.geometry.dispose(); this.mesh.material.dispose(); this.mesh.dispose(); this.mesh.removeFromParent(); }
}
