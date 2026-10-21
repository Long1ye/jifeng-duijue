import { QUALITY_TUNING } from './QualitySettings';
import { Color } from 'three';

/** Must match in the real backdrop and the low pier's projected backdrop sample. */
export const CANYON_GRADE_GLSL = `
  vec3 canyonBackdropGrade(vec3 source, float enabled) {
    float high = max(source.r, max(source.g, source.b));
    float low = min(source.r, min(source.g, source.b));
    float neutral = 1.0 - smoothstep(0.12, 0.35, high - low);
    float luminance = dot(source, vec3(0.2126, 0.7152, 0.0722));
    vec3 tint = vec3(${QUALITY_TUNING.neutralTint.join(',')});
    vec3 graded = mix(source, vec3(luminance) * tint, neutral * enabled * ${QUALITY_TUNING.colorGrade});
    return mix(graded, vec3(0.25, 0.33, 0.45), enabled * ${QUALITY_TUNING.distantContrast});
  }
  vec3 canyonBackdropEdge(vec3 source, float uvY, float enabled) {
    float edge = smoothstep(0.35, 0.5, abs(uvY - 0.5));
    return mix(source, vec3(${new Color(0x8293ad).toArray().join(',')}), edge * enabled);
  }
`;
