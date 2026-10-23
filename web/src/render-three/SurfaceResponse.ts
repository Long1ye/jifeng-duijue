import { MeshBasicMaterial, Vector2 } from 'three';
import { QUALITY_TUNING, type QualitySettings } from './QualitySettings';
import type { EnvironmentIllumination } from './EnvironmentIllumination';
import { CANYON_GRADE_GLSL } from './CanyonGrade';

export type SurfaceRole = 'stone' | 'architecture' | 'ice' | 'metal' | 'distant';
/** Small material responses over painted albedo, rather than relighting baked art as PBR. */
export function surfaceResponse(material: MeshBasicMaterial, role: SurfaceRole, settings: QualitySettings, lighting?: EnvironmentIllumination) {
  const lights = role !== 'distant' ? lighting?.sources.length ?? 0 : 0;
  const previous = material.onBeforeCompile, key = material.customProgramCacheKey();
  material.onBeforeCompile = (shader, renderer) => {
    previous.call(material, shader, renderer);
    shader.uniforms.qualityMaterial = settings.materials; shader.uniforms.qualityGrade = settings.grading;
    shader.uniforms.surfaceRefinement = settings.surfaceRefinement;
    const image = material.map?.image as { width?: number; height?: number } | undefined;
    shader.uniforms.qualityTexel = { value: new Vector2(1 / (image?.width ?? 1024), 1 / (image?.height ?? 1024)) };
    if (lights && lighting) lighting.bind(shader);
    shader.vertexShader = 'varying vec3 qualityWorld;\nvarying vec3 qualityView;\nvarying vec3 qualityNormal;\n' + shader.vertexShader.replace('#include <project_vertex>', `
      #include <project_vertex>
      vec4 qualityPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        qualityPosition = instanceMatrix * qualityPosition;
      #endif
      qualityWorld = (modelMatrix * qualityPosition).xyz;
      qualityView = mvPosition.xyz; qualityNormal = normalize(normalMatrix * normal);
    `);
    shader.fragmentShader = `${role === 'distant' ? CANYON_GRADE_GLSL : ''}\n${lights && lighting ? lighting.glsl() : ''}\nuniform vec2 qualityTexel;\nuniform float surfaceRefinement;\nuniform float qualityMaterial;\nuniform float qualityGrade;\nvarying vec3 qualityWorld;\nvarying vec3 qualityView;\nvarying vec3 qualityNormal;\n` + shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec3 source = diffuseColor.rgb;
      float high = max(source.r, max(source.g, source.b));
      float low = min(source.r, min(source.g, source.b));
      float neutral = 1.0 - smoothstep(0.12, 0.35, high - low);
      float luminance = dot(source, vec3(0.2126, 0.7152, 0.0722));
      vec3 graded = vec3(luminance) * vec3(${QUALITY_TUNING.neutralTint.map(value => value.toFixed(4)).join(', ')});
      diffuseColor.rgb = mix(source, graded, neutral * qualityGrade * ${QUALITY_TUNING.colorGrade.toFixed(4)});
      ${role === 'stone' ? `
        // Texture-aligned high-pass relief, not a reconstruction of real height.
        // Preserve large painted shadows and ignore transparent neighboring RGB.
        float height = sin(qualityWorld.x * 0.19 + sin(qualityWorld.z * 0.11)) * sin(qualityWorld.z * 0.16) * 0.5;
        #ifdef USE_MAP
        if (qualityMaterial > 0.0 && surfaceRefinement > 0.0) {
          vec2 stepUv = qualityTexel * 2.0;
          vec4 detailLeft = texture2D(map, vMapUv - vec2(stepUv.x, 0.0));
          vec4 detailRight = texture2D(map, vMapUv + vec2(stepUv.x, 0.0));
          vec4 detailDown = texture2D(map, vMapUv - vec2(0.0, stepUv.y));
          vec4 detailUp = texture2D(map, vMapUv + vec2(0.0, stepUv.y));
          float detailWeight = detailLeft.a + detailRight.a + detailDown.a + detailUp.a;
          vec3 localMean = (detailLeft.rgb * detailLeft.a + detailRight.rgb * detailRight.a + detailDown.rgb * detailDown.a + detailUp.rgb * detailUp.a) / max(0.001, detailWeight);
          float localLuma = dot(localMean * diffuse, vec3(0.2126, 0.7152, 0.0722));
          float detailLod = 1.0 - smoothstep(1.5, 4.0, length(fwidth(vMapUv) / qualityTexel));
          height = clamp(luminance - localLuma, -0.12, 0.12) * ${QUALITY_TUNING.stoneHeight.toFixed(4)} * detailLod * step(0.1, detailWeight);
        }
        #endif
        vec3 n = normalize(qualityNormal);
        vec3 q0 = dFdx(qualityView), q1 = dFdy(qualityView);
        vec3 p0 = cross(q1, n), p1 = cross(n, q0);
        float determinant = dot(q0, p0);
        vec3 bump = normalize(abs(determinant) * n - sign(determinant) * (dFdx(height) * p0 + dFdy(height) * p1));
        vec3 lightDirection = normalize((viewMatrix * vec4(-0.4, 0.85, 0.35, 0.0)).xyz);
        float relief = clamp(dot(bump, lightDirection) - dot(n, lightDirection), -1.0, 1.0);
        float stoneMask = neutral * (1.0 - smoothstep(0.55, 0.9, high));
        diffuseColor.rgb *= 1.0 + relief * qualityMaterial * stoneMask * mix(0.14, ${QUALITY_TUNING.materialRelief.toFixed(4)}, surfaceRefinement);
        // Tonal separation at the scale of the actual painted slabs. Preserve
        // the source cracks and snow instead of adding unrelated noise lines.
        float stoneTone = clamp((luminance - ${QUALITY_TUNING.stoneMidpoint}) / ${QUALITY_TUNING.stoneMidpoint}, -1.0, 1.0);
        float frost = neutral * smoothstep(0.30, 0.65, luminance);
        diffuseColor.rgb *= 1.0 + stoneTone * ${QUALITY_TUNING.stoneContrast} * neutral * qualityMaterial * (1.0 - frost * 0.75 * surfaceRefinement);
        // Broad frost sheen is confined to neutral bright painted snow.
        vec3 stoneViewDirection = normalize(-qualityView);
        float frostLight = pow(max(0.0, dot(bump, normalize(lightDirection + stoneViewDirection))), 4.0);
        float frostHeadroom = smoothstep(0.0, 0.20, 1.0 - max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)));
        diffuseColor.rgb += vec3(0.62, 0.80, 1.0) * frost * frostLight * qualityMaterial * ${QUALITY_TUNING.frostSheen} * frostHeadroom * surfaceRefinement;
      ` : role === 'architecture' ? `
        // Leave the baked form intact; deepen its existing shadow planes.
        float form = smoothstep(0.04, 0.40, luminance);
        diffuseColor.rgb *= mix(0.83, 1.06, form) * qualityMaterial + (1.0 - qualityMaterial);
      ` : role === 'metal' ? `
        vec3 n = normalize(qualityNormal), v = normalize(-qualityView);
        vec3 lightDirection = normalize((viewMatrix * vec4(-0.4, 0.85, 0.35, 0.0)).xyz);
        float highlight = pow(max(0.0, dot(n, normalize(lightDirection + v))), ${QUALITY_TUNING.metalPower.toFixed(1)});
        diffuseColor.rgb += vec3(0.75, 0.85, 1.0) * highlight * neutral * qualityMaterial * ${QUALITY_TUNING.metalHighlight.toFixed(4)};
      ` : role === 'ice' ? `
        // Saturated red and blue facets both respond; neutral snow stays out.
        float crystal = smoothstep(0.05, 0.25, max(source.b, source.r) - source.g) * smoothstep(0.2, 0.65, max(source.b, source.r));
        vec3 n = normalize(qualityNormal), v = normalize(-qualityView);
        float rim = pow(1.0 - abs(dot(n, v)), 3.0);
        vec3 lightDirection = normalize((viewMatrix * vec4(-0.4, 0.85, 0.35, 0.0)).xyz);
        float facet = pow(max(0.0, abs(dot(n, normalize(lightDirection + v)))), 16.0);
        vec3 qualityIceAccent = source.r > source.b ? vec3(1.0, 0.40, 0.23) : vec3(0.45, 0.74, 1.0);
        diffuseColor.rgb += qualityIceAccent * crystal * qualityMaterial * (rim * ${QUALITY_TUNING.iceRim} + facet * ${QUALITY_TUNING.iceSpecular});
      ` : `
        // Distant detail loses contrast, without washing the combat deck.
        diffuseColor.rgb = canyonBackdropEdge(canyonBackdropGrade(source, qualityGrade), vMapUv.y, qualityGrade);
      `}
      ${lights ? `
        // Broad, continuous surface illumination; texture details remain visible.
        float warmth = qualityMaterial > 0.0 ? environmentLightAt(qualityWorld) * qualityMaterial * ${QUALITY_TUNING.warmLightStrength} : 0.0;
        diffuseColor.rgb += (diffuseColor.rgb + vec3(0.10, 0.035, 0.005)) * vec3(1.0, 0.42, 0.08) * warmth;
      ` : ''}
    `);
  };
  material.customProgramCacheKey = () => `${key}-surface-${role}-v4-${lights}`;
}

/** Attach once to eligible environmental materials, including shared/batched ones. */
export function environmentSurfaceRole(name: string): SurfaceRole | null {
  if (name === 'painted-distant-abyss') return 'distant';
  if (/^painted-(guardian-pillar|bridge-arch|load-bearing-pier|tower|inner-tower|nexus-tower|inhibitor|nexus|backwall)$/.test(name)) return 'architecture';
  if (name.startsWith('ice-')) return 'ice';
  if (/wall-lantern|drainage-grate/.test(name)) return 'metal';
  if (/painted-(bridge-floor|road-extension|step-riser|entrance-step|wall-footing-edge|continuous-parapets|deck-edge)$/.test(name)) return 'stone';
  return null;
}
