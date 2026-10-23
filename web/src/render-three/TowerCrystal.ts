import type { MeshBasicMaterial, MeshDepthMaterial } from 'three';

export const TOWER_FLOAT = { lift: 14, amplitude: 5, period: 4.8, sway: .9 } as const;
// Retreat along the fixed 45° view ray. Equal Y/Z offsets preserve projection
// while separating the floating layer from the foreground stone depth plane.
export const TOWER_CRYSTAL_DEPTH_INSET = 8;
export function towerCrystalOffset(time: number, phase: number): { x: number; y: number } {
  const angle = time * Math.PI * 2 / TOWER_FLOAT.period + phase;
  return { x: Math.sin(angle * .7) * TOWER_FLOAT.sway, y: TOWER_FLOAT.lift + Math.sin(angle) * TOWER_FLOAT.amplitude };
}

// Authored against the existing 344×513 team tower images. Include white facets,
// exclude the foreground stone point; never infer crystal from blue/red hue.
const SILHOUETTE = [[171, 3], [202, 52], [217, 100], [217, 185], [205, 210], [185, 219], [154, 218], [134, 207], [128, 176], [131, 91], [143, 50]] as const;
const polygon = SILHOUETTE.map((a, i) => {
  const b = SILHOUETTE[(i + 1) % SILHOUETTE.length];
  return `inside *= step(0.0, ${b[0] - a[0]}.0 * (p.y - ${a[1]}.0) - ${b[1] - a[1]}.0 * (p.x - ${a[0]}.0));`;
}).join('\n');
const MASK = `
float towerCrystalMask(vec2 uv) {
  vec2 p = vec2(uv.x * 344.0, (1.0 - uv.y) * 513.0);
  float inside = 1.0;
  ${polygon}
  return inside;
}
float towerCrystalStone(vec2 uv) {
  vec2 p = vec2(uv.x * 344.0, (1.0 - uv.y) * 513.0);
  return step(177.0, p.y) * step(172.0 - (p.y - 177.0) * 0.55, p.x)
    * step(p.x, 172.0 + (p.y - 177.0) * 0.55);
}
`;

/** Same cutout in color and shadow passes: one crystal, no baked duplicate. */
export function towerCrystalLayer(material: MeshBasicMaterial | MeshDepthMaterial, enabled: { value: number }, crystalOnly = false): void {
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.towerFloatEnabled = enabled;
    shader.fragmentShader = `uniform float towerFloatEnabled;\n${MASK}\n` + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float crystalCutout = towerCrystalMask(vMapUv);
      float foregroundStone = towerCrystalStone(vMapUv);
      ${crystalOnly ? `
        // Continue existing crystal facets behind the foreground stone rather
        // than carrying a stone chip or a triangular hole into the floating layer.
        if (foregroundStone > 0.5 && crystalCutout > 0.5) {
          float sourceY = 354.0 - (1.0 - vMapUv.y) * 513.0;
          diffuseColor = texture2D(map, vec2(vMapUv.x, 1.0 - sourceY / 513.0));
        }
      ` : 'crystalCutout *= 1.0 - foregroundStone;'}
      diffuseColor.a *= ${crystalOnly ? 'crystalCutout * towerFloatEnabled' : '1.0 - crystalCutout * towerFloatEnabled'};
    `);
  };
  material.customProgramCacheKey = () => `${key}-tower-separated-crystal-v1-${crystalOnly ? 'crystal' : 'body'}`;
}
