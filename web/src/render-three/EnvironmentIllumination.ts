import { Mesh, Vector3, Vector4, type Group, type Object3D, type IUniform } from 'three';
import { bridgePoint } from '../game/Bridge';
import { artEdgeV } from './PaintedMapLayout';
import { toThree } from './Coordinates';
import { QUALITY_TUNING } from './QualitySettings';
import type { Point } from '../game/types';
import { WORLD_ORIGIN } from './Coordinates';
import { fireFlicker } from './EnvironmentMotion';

/** Painted environmental emitters only. No gameplay lights, GPU targets or draw calls. */
export class EnvironmentIllumination {
  readonly sources: { source: Object3D; point: Vector4; local: Vector3; strength: number }[] = [];
  readonly positions: { value: Vector4[] };
  readonly strengths: { value: number[] };
  constructor(roots: Group[]) {
    for (const root of roots) root.traverse(object => {
      if (!(object instanceof Mesh)) return;
      if (object.name === 'painted-fire-bowl') {
        object.updateWorldMatrix(true, false);
        const p = object.getWorldPosition(new Vector3());
        this.sources.push({ source: object, point: new Vector4(p.x, p.y + 38, p.z, QUALITY_TUNING.fireLightRadius), local: new Vector3(0, 38, 0), strength: 1 });
      }
      if (object.name === 'painted-small-wall-lantern-neutral') for (const p of object.userData.placements ?? []) {
        const world = toThree(bridgePoint(p.u, p.side * (artEdgeV(p.u) - p.inset)), (p.top ?? 84) - 14);
        this.sources.push({ source: object, point: new Vector4(world.x, world.y, world.z, QUALITY_TUNING.lanternLightRadius), local: world, strength: .7 });
      }
    });
    // One fixed array per arena; camera motion never changes the selected emitters.
    this.positions = { value: this.sources.map(source => source.point) };
    this.strengths = { value: this.sources.map(() => 0) };
  }
  private readonly world = new Vector3();
  update(time: number) {
    this.sources.forEach(({ source, strength, point, local }, i) => {
      source.updateWorldMatrix(true, false);
      this.world.copy(local).applyMatrix4(source.matrixWorld);
      point.set(this.world.x, this.world.y, this.world.z, point.w);
      let visible = true;
      for (let parent: Object3D | null = source; parent; parent = parent.parent) visible &&= parent.visible;
      this.strengths.value[i] = visible ? strength * fireFlicker(time, i) : 0;
    });
  }
  /** CPU reference for validation and tools, using the same falloff as GLSL. */
  sample(point: Point, height = 0) {
    let light = 0;
    this.sources.forEach(({ point: p }, i) => {
      const distance = Math.hypot(point.x - WORLD_ORIGIN.x - p.x, height - p.y, point.y - WORLD_ORIGIN.y - p.z);
      light += Math.max(0, 1 - distance / p.w) ** 2 * this.strengths.value[i];
    });
    return Math.min(1, light);
  }
  bind(shader: { uniforms: Record<string, IUniform> }) {
    shader.uniforms.environmentLights = this.positions; shader.uniforms.environmentStrengths = this.strengths;
  }
  /** Shared by painted surfaces and actor cards; no second lighting model. */
  glsl() {
    const count = this.sources.length;
    return count ? `uniform vec4 environmentLights[${count}];
      uniform float environmentStrengths[${count}];
      float environmentLightAt(vec3 world) {
        float light = 0.0;
        for (int i = 0; i < ${count}; i++) {
          float falloff = max(0.0, 1.0 - length(world - environmentLights[i].xyz) / environmentLights[i].w);
          light += falloff * falloff * environmentStrengths[i];
        }
        return min(light, 1.0);
      }` : 'float environmentLightAt(vec3 world) { return 0.0; }';
  }
}
