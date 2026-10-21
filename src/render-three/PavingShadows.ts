import { BufferGeometry, Group, Mesh, ShadowMaterial } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { QUALITY_TUNING, type QualitySettings } from './QualitySettings';

/** The transparent painted paving covers the original ground shadow receiver.
 * One merged receiver above every circular court makes sun shadows visible. */
export class PavingShadows {
  readonly group = new Group();
  private readonly sources: Mesh[] = [];
  readonly receiver: Mesh<BufferGeometry, ShadowMaterial>;
  private disposed = false;
  constructor(private readonly quality: QualitySettings, roots: readonly Group[]) {
    for (const root of roots) root.traverse(source => {
      if (source instanceof Mesh && source.name === 'painted-circular-paving') this.sources.push(source);
    });
    const geometries = this.sources.map(source => {
      source.updateWorldMatrix(true, false);
      const geometry = source.geometry.clone().applyMatrix4(source.matrixWorld), p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++) p.setY(i, QUALITY_TUNING.pavingShadowHeight);
      return geometry;
    });
    const geometry = geometries.length ? mergeGeometries(geometries, false)! : new BufferGeometry();
    geometries.forEach(g => g.dispose());
    const material = new ShadowMaterial({ color: 0x11182c, opacity: .32, depthWrite: false, toneMapped: false, fog: false });
    material.onBeforeCompile = shader => {
      shader.vertexShader = 'varying vec2 pavingShadowUv;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\npavingShadowUv = uv;');
      shader.fragmentShader = 'varying vec2 pavingShadowUv;\n' + shader.fragmentShader.replace('#include <tonemapping_fragment>', 'gl_FragColor.a *= 1.0 - smoothstep(0.43, 0.5, length(pavingShadowUv - vec2(0.5)));\n#include <tonemapping_fragment>');
    };
    material.customProgramCacheKey = () => 'painted-paving-shadow-v1';
    this.receiver = new Mesh(geometry, material); this.receiver.name = 'painted-paving-shadow-receiver';
    this.receiver.receiveShadow = true; this.receiver.renderOrder = 2;
    this.group.name = 'paving-shadow-receivers'; this.group.add(this.receiver);
  }
  update() { this.group.visible = this.quality.enhanced && !this.quality.reduced && this.sources.some(source => source.visible); }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    this.receiver.geometry.dispose(); this.receiver.material.dispose(); this.group.clear(); this.group.removeFromParent();
  }
}
