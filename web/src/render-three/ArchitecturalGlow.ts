import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, Vector2 } from 'three';
import type { QualitySettings } from './QualitySettings';
import { QUALITY_TUNING } from './QualitySettings';

/** A small texture-space halo on explicitly selected architecture, never on combat sprites. */
export class ArchitecturalGlow {
  readonly group = new Group();
  private readonly entries: { source: Mesh; glow: Mesh; material: MeshBasicMaterial; texel: { value: Vector2 } }[] = [];
  private disposed = false;
  constructor(private readonly settings: QualitySettings, roots: readonly Group[]) {
    this.group.name = 'architecture-local-glow';
    for (const root of roots) root.traverse(source => {
      // Fire now has its own evolving silhouette; the old painted halo would
      // leave a stationary flame-shaped outline behind the procedural batch.
      if (!(source instanceof Mesh) || !/^painted-(tower|inner-tower|nexus-tower|inhibitor)$/.test(source.name)) return;
      const original = source.material as MeshBasicMaterial, texel = { value: new Vector2(1 / 512, 1 / 512) };
      const material = new MeshBasicMaterial({ map: original.map, transparent: true, depthWrite: false, toneMapped: false, fog: false, blending: AdditiveBlending, side: original.side, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
      material.onBeforeCompile = shader => {
        shader.uniforms.glowTexel = texel;
        shader.fragmentShader = 'uniform vec2 glowTexel;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
          #include <map_fragment>
          #ifdef USE_MAP
          vec4 center = texture2D(map, vMapUv);
          float centralMask = max(center.b - max(center.r, center.g), center.r - center.b) * center.a;
          vec3 halo = vec3(0.0); float energy = 0.0;
          for (int i = 0; i < 16; i++) {
            float angle = float(i) * 0.78539816;
            float radius = i < 8 ? 0.45 : 1.0;
            float weight = i < 8 ? 1.0 : 0.55;
            vec4 sampleColor = texture2D(map, vMapUv + vec2(cos(angle), sin(angle)) * glowTexel * ${QUALITY_TUNING.glowRadiusTexels.toFixed(1)} * radius);
            float mask = smoothstep(0.10, 0.35, max(sampleColor.b - max(sampleColor.r, sampleColor.g), sampleColor.r - sampleColor.b))
              * smoothstep(0.35, 0.8, max(sampleColor.r, sampleColor.b)) * sampleColor.a;
            halo += sampleColor.rgb * mask * weight; energy += mask * weight;
          }
          diffuseColor.rgb = halo / max(energy, 0.001);
          diffuseColor.a = max(0.0, energy / 12.4 - max(0.0, centralMask) * 0.6) * opacity;
          #endif
        `);
      };
      material.customProgramCacheKey = () => 'architecture-halo-v2';
      const glow = new Mesh(source.geometry, material); glow.matrixAutoUpdate = false; glow.name = `local-glow-${source.name}`;
      this.group.add(glow); this.entries.push({ source, glow, material, texel });
    });
  }
  update() {
    this.group.visible = this.settings.glow.value > 0 && !this.settings.reduced;
    for (const { source, glow, material, texel } of this.entries) {
      source.updateWorldMatrix(true, false); glow.matrix.copy(source.matrixWorld); glow.matrixWorldNeedsUpdate = true;
      let visible = true;
      for (let parent: import('three').Object3D | null = source; parent; parent = parent.parent) visible &&= parent.visible;
      glow.visible = visible;
      const original = source.material as MeshBasicMaterial, image = original.map?.image as { width?: number; height?: number } | undefined;
      if (image?.width && image.height) texel.value.set(1 / image.width, 1 / image.height);
      material.opacity = QUALITY_TUNING.glowOpacity * original.opacity;
    }
  }
  dispose() {
    if (this.disposed) return; this.disposed = true;
    // Geometry and maps are borrowed from the source modules, not owned here.
    this.entries.forEach(entry => entry.material.dispose()); this.entries.length = 0; this.group.clear(); this.group.removeFromParent();
  }
}
