import type { MeshBasicMaterial } from 'three';
import { SCENE_MOTION } from './EnvironmentMotion';

/** Preserve the painted albedo; brighten only existing cold crystal facets. */
export function crystalAccents(material: MeshBasicMaterial, time: { value: number }, energy = { value: 0 }, region: 'ice' | 'tower' | 'inhibitor' | 'altar' = 'ice') {
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
  const previousKey = key();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.crystalTime = time; shader.uniforms.crystalEnergy = energy;
    shader.uniforms.towerFlagTime = time;
    shader.vertexShader = 'uniform float crystalTime;\nuniform float towerFlagTime;\nvarying vec3 crystalViewNormal;\nvarying vec3 crystalViewPosition;\nvarying vec3 crystalWorldPosition;\n' + shader.vertexShader
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        crystalViewNormal = normalize(normalMatrix * normal);
        crystalViewPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        crystalWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        ${region === 'tower' ? `
          // Zero the whole grid column next to masonry, not just the painted
          // boundary: interpolation across a triangle must never move stone.
          float leftFlag = (1.0 - smoothstep(0.1875, 0.21875, uv.x)) * smoothstep(0.40, 0.42, uv.y);
          float rightFlag = smoothstep(0.8125, 0.84375, uv.x) * smoothstep(0.40, 0.42, uv.y);
          float leftHem = 1.0 - smoothstep(0.42, 0.61, uv.y);
          float rightHem = 1.0 - smoothstep(0.42, 0.61, uv.y);
          float cloth = leftFlag * leftHem * leftHem + rightFlag * rightHem * rightHem;
          float flagPhase = modelMatrix[3].x * 0.013 + modelMatrix[3].z * 0.009;
          transformed.x += cloth * sin(towerFlagTime * 3.6 - uv.y * 17.0 + flagPhase) * 10.0;
          transformed.z += cloth * sin(towerFlagTime * 3.6 - uv.y * 13.0 + flagPhase) * 2.4;
        ` : ''}
      `);
    // Team recoloring is injected after map_fragment. Run animation only after
    // both that palette and the material color, never on the original blue texel.
    shader.fragmentShader = 'uniform float crystalTime;\nuniform float crystalEnergy;\nvarying vec3 crystalViewNormal;\nvarying vec3 crystalViewPosition;\nvarying vec3 crystalWorldPosition;\n' + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float cold = smoothstep(0.015, 0.12, max(diffuseColor.b - diffuseColor.r, diffuseColor.r - max(diffuseColor.g, diffuseColor.b))) * smoothstep(0.12, 0.50, max(diffuseColor.b, diffuseColor.r));
      ${region === 'tower' ? 'cold *= smoothstep(0.55, 0.64, vMapUv.y) * (1.0 - smoothstep(0.15, 0.25, abs(vMapUv.x - 0.5)));' : ''}
      float edge = pow(1.0 - abs(dot(normalize(crystalViewNormal), normalize(-crystalViewPosition))), 3.0);
      float phase = crystalWorldPosition.x * 0.013 + crystalWorldPosition.z * 0.009;
      float travel = sin(crystalWorldPosition.y * 0.065 - crystalTime * 3.2 + phase);
      float filterWidth = max(fwidth(travel) * 1.5, 0.07);
      float sweep = smoothstep(0.25 - filterWidth, 0.80 + filterWidth, travel);
      float pulse = 0.5 + 0.5 * sin(crystalTime * 1.9 + phase);
      vec3 accent = ${material.userData.team === 'red' ? 'vec3(1.0, 0.45, 0.27)' : 'vec3(0.50, 0.72, 1.0)'};
      vec3 crystalLit = diffuseColor.rgb * (${SCENE_MOTION.crystalDarkness} + 0.08 * pulse + 0.15 * sweep)
        + accent * (sweep * ${SCENE_MOTION.crystalTravel} + edge * 0.045 + crystalEnergy * 0.18);
      diffuseColor.rgb = mix(diffuseColor.rgb, crystalLit, cold);
    `);
  };
  material.customProgramCacheKey = () => `${previousKey}-crystal-facets-v6-pinned-stone-${region}-${material.userData.team ?? 'neutral'}`;
}

/** Remove only warm painted flame pixels above the coals for the live flame batch. */
export function flameMotion(material: MeshBasicMaterial, time: { value: number }) {
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.flameTime = time;
    shader.fragmentShader = 'uniform float flameTime;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float flameWarm = smoothstep(0.12, 0.35, diffuseColor.r - diffuseColor.b) * smoothstep(0.25, 0.65, diffuseColor.r);
      float paintedFlame = smoothstep(0.54, 0.57, vMapUv.y) * (1.0 - smoothstep(0.15, 0.21, abs(vMapUv.x - 0.5)));
      diffuseColor.a *= 1.0 - flameWarm * paintedFlame;
    `);
  };
  material.customProgramCacheKey = () => `${key}-live-flame-receiver-v2`;
}

/** Lantern glass flickers while the grey housing and snowy wall stay stable. */
export function lanternMotion(material: MeshBasicMaterial, time: { value: number }) {
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.lanternTime = time;
    shader.vertexShader = 'varying float lanternPhase;\n' + shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nlanternPhase = (modelMatrix * vec4(position, 1.0)).x * 0.023;');
    shader.fragmentShader = 'uniform float lanternTime;\nvarying float lanternPhase;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float glass = smoothstep(0.09, 0.28, diffuseColor.r - diffuseColor.b) * smoothstep(0.25, 0.65, diffuseColor.r);
      float flicker = sin(lanternTime * 5.7 + lanternPhase) * 0.18 + sin(lanternTime * 11.3 + lanternPhase * 1.7) * 0.08;
      diffuseColor.rgb *= 1.0 + glass * flicker;
    `);
  };
  material.customProgramCacheKey = () => `${key}-living-lantern-v1`;
}

/** Three small fires baked into each sanctuary wall: animate only warm fire texels. */
export function sanctuaryFireMotion(material: MeshBasicMaterial, time: { value: number }) {
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.wallFireTime = time;
    shader.fragmentShader = 'uniform float wallFireTime;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec2 wallPixel = vec2(vMapUv.x * 1672.0, (1.0 - vMapUv.y) * 941.0);
      float fireWindow = 0.0, fireSeed = 0.0, fireHeight = 0.0;
      for (int i = 0; i < 3; i++) {
        vec2 root = i == 0 ? vec2(600.0, 683.0) : i == 1 ? vec2(857.0, 601.0) : vec2(994.0, 557.0);
        vec2 d = wallPixel - root;
        float window = (1.0 - smoothstep(40.0, 58.0, abs(d.x))) * smoothstep(-118.0, -103.0, d.y) * (1.0 - smoothstep(0.0, 9.0, d.y));
        fireWindow += window; fireSeed += float(i) * window * 2.1;
        fireHeight += window * clamp(-d.y / 90.0, 0.0, 1.0);
      }
      if (fireWindow > 0.0) {
        float t = wallFireTime;
        vec2 shift = vec2(sin(t * 6.1 + wallPixel.y * 0.09 + fireSeed) * 4.5 * fireHeight,
          sin(t * 8.3 + wallPixel.x * 0.06 + fireSeed) * 4.0 * fireHeight);
        vec4 displaced = texture2D(map, vMapUv + shift / vec2(1672.0, 941.0));
        float originalWarm = smoothstep(0.12, 0.36, diffuseColor.r - diffuseColor.b) * smoothstep(0.3, 0.65, diffuseColor.r);
        float movedWarm = smoothstep(0.12, 0.36, displaced.r - displaced.b) * smoothstep(0.3, 0.65, displaced.r);
        float warm = max(originalWarm, movedWarm) * min(1.0, fireWindow);
        diffuseColor.rgb = mix(diffuseColor.rgb, displaced.rgb, warm);
        float tongues = sin(wallPixel.y * 0.22 + t * 12.0 + fireSeed) * 0.15;
        diffuseColor.rgb *= 1.0 + warm * (sin(t * 7.2 + fireSeed) * 0.20 + tongues);
      }
    `);
  };
  material.customProgramCacheKey = () => `${key}-sanctuary-fire-v1`;
}
