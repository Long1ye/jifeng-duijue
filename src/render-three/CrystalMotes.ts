import { BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector3, type Mesh, type Object3D } from 'three';
import type { ThreeCamera } from './Coordinates';
import { SCENE_MOTION } from './EnvironmentMotion';

export interface CrystalEmitter { source: Object3D; anchor: Vector3; spread: number; red: boolean; orbit?: boolean }

/** Locate an authored crystal point without changing its source geometry/UV. */
export function crystalAnchor(mesh: Pick<Mesh, 'geometry'>, u = .5, v = .78): Vector3 {
  const uv = mesh.geometry.getAttribute('uv'), position = mesh.geometry.getAttribute('position');
  let nearest = 0, distance = Infinity;
  for (let i = 0; i < uv.count; i++) {
    const d = (uv.getX(i) - u) ** 2 + (uv.getY(i) - v) ** 2;
    if (d < distance) { nearest = i; distance = d; }
  }
  return new Vector3().fromBufferAttribute(position, nearest);
}

/** Sparse orbiting glints: fixed-capacity single batch, no texture or timer. */
export class CrystalMotes {
  readonly points: Points<BufferGeometry, ShaderMaterial>;
  private readonly time = { value: 0 };
  private readonly pixelScale = { value: 2 };
  private readonly world = new Vector3();
  private disposed = false;
  private readonly slots: { emitter: number; seed: number; orbit: boolean }[];
  constructor(private readonly emitters: CrystalEmitter[]) {
    this.slots = emitters.flatMap((emitter, index) => [
      ...Array.from({ length: 3 }, (_, n) => ({ emitter: index, seed: index * 2.399963 + n * 2.1, orbit: false })),
      ...(emitter.orbit ? [{ emitter: index, seed: index * 2.399963, orbit: true }] : []),
    ]);
    const count = this.slots.length, geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(count * 3), 3));
    geometry.setAttribute('mote', new BufferAttribute(new Float32Array(this.slots.flatMap(slot => {
      const emitter = emitters[slot.emitter]; return [slot.seed, emitter.spread, Number(emitter.red), Number(slot.orbit)];
    })), 4));
    geometry.setAttribute('enabled', new BufferAttribute(new Float32Array(count), 1));
    const material = new ShaderMaterial({ uniforms: { moteTime: this.time, pixelScale: this.pixelScale },
      transparent: true, depthWrite: false, toneMapped: false,
      vertexShader: `attribute vec4 mote; attribute float enabled;
        uniform float moteTime; uniform float pixelScale; varying vec3 moteColor; varying float moteAlpha; varying float orbitKind; varying float orbitAngle;
        void main() {
          float cycle = fract(moteTime * 0.24 + mote.x * 0.15915);
          float angle = moteTime * 1.6 + mote.x;
          vec3 p = position + vec3(cos(angle) * mote.y, cycle * mote.y * 2.6, sin(angle) * mote.y * 0.55);
          orbitKind = mote.w; orbitAngle = moteTime * 1.8 + mote.x;
          moteColor = mix(vec3(0.52, 0.84, 1.0), vec3(1.0, 0.48, 0.31), mote.z);
          moteAlpha = enabled * sin(cycle * 3.14159) * (0.65 + 0.35 * sin(moteTime * 3.1 + mote.x));
          gl_PointSize = clamp(pixelScale * ${SCENE_MOTION.glintSize}, 4.0, 14.0);
          if (mote.w > 0.5) { p = position; gl_PointSize = clamp(pixelScale * mote.y * 3.6, 24.0, 160.0); moteAlpha = enabled * 0.72; }
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }`,
      fragmentShader: `varying vec3 moteColor; varying float moteAlpha; varying float orbitKind; varying float orbitAngle;
        void main() {
          vec2 d = abs(gl_PointCoord - 0.5);
          float star = exp(-d.x * 65.0 - d.y * 8.0) + exp(-d.x * 8.0 - d.y * 65.0);
          float halo = exp(-dot(d, d) * 60.0) * 0.25;
          gl_FragColor = vec4(mix(moteColor, vec3(1.0), min(1.0, star)), min(1.0, star + halo) * moteAlpha);
          if (orbitKind > 0.5) {
            vec2 q = (gl_PointCoord - 0.5) * vec2(1.0, 2.8);
            float radius = length(q), width = max(fwidth(radius), 0.008);
            float ring = 1.0 - smoothstep(0.013, 0.013 + width * 1.5, abs(radius - 0.36));
            float travel = 0.5 + 0.5 * cos(atan(q.y, q.x) - orbitAngle);
            float arc = pow(travel, 4.0);
            gl_FragColor = vec4(mix(moteColor, vec3(1.0), arc * 0.55), ring * arc * moteAlpha);
          }
          #include <colorspace_fragment>
        }`,
    });
    this.points = new Points(geometry, material); this.points.name = 'crystal-orbiting-glints'; this.points.frustumCulled = false;
  }
  update(time: number, camera: ThreeCamera, renderHeight: number): void {
    if (this.disposed) return;
    this.time.value = time;
    this.pixelScale.value = renderHeight / (camera.camera.top - camera.camera.bottom);
    const positions = this.points.geometry.getAttribute('position'), enabled = this.points.geometry.getAttribute('enabled');
    this.slots.forEach((slot, index) => {
      const emitter = this.emitters[slot.emitter];
      emitter.source.updateWorldMatrix(true, false);
      this.world.copy(emitter.anchor).applyMatrix4(emitter.source.matrixWorld);
      // In front of the relief surface at 45°, so the crystal cannot bury its own glints.
      this.world.y += 5; this.world.z += 5;
      let visible = true;
      for (let parent: Object3D | null = emitter.source; parent; parent = parent.parent) visible &&= parent.visible;
      positions.setXYZ(index, this.world.x, this.world.y, this.world.z); enabled.setX(index, Number(visible));
    });
    positions.needsUpdate = enabled.needsUpdate = true;
  }
  dispose(): void { if (this.disposed) return; this.disposed = true; this.points.geometry.dispose(); this.points.material.dispose(); this.points.removeFromParent(); }
}
