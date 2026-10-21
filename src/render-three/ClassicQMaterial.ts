import type { MeshBasicMaterial } from 'three';

/** Suppress bright cyan baked VFX in Q1/Q2 (mode 1) and Q3 release (mode 2). */
export function installClassicQBody(material: MeshBasicMaterial) {
 const enabled = { value: 0 }, grid = { value: { x: 8, y: 5 } };
 const previous = material.onBeforeCompile, key = material.customProgramCacheKey;
 material.userData.classicQBody = enabled;
 material.userData.classicQGrid = grid;
 material.onBeforeCompile = (shader, renderer) => {
  previous.call(material, shader, renderer);
  shader.uniforms.classicQBody = enabled; shader.uniforms.classicQGrid = grid;
  shader.fragmentShader = 'uniform float classicQBody;\nuniform vec2 classicQGrid;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
   #include <map_fragment>
   #ifdef USE_MAP
   if (classicQBody > 0.5) {
    vec3 texel = sampledDiffuseColor.rgb;
    float cyan = min(texel.g, texel.b);
    if (classicQBody > 1.5 && cyan > 0.28 && texel.r < cyan * 0.85) discard;
    if (classicQBody < 1.5 && cyan > 0.42 && texel.r < cyan * 0.65) {
     vec2 pixel = vec2(fract(vMapUv.x * classicQGrid.x) * 64.0, (1.0 - fract(vMapUv.y * classicQGrid.y)) * 113.0);
     if (distance(pixel, vec2(48.0, 78.0)) > 3.5) discard;
     diffuseColor.rgb = vec3(0.36, 0.40, 0.37) * diffuse;
    }
   }
   #endif
  `);
 };
 material.customProgramCacheKey = () => key.call(material) + '-classic-q-body-v1';
 return { enabled, grid };
}
