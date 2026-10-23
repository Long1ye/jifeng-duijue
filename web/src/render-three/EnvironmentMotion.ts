/** Matches render/EnvironmentWind.ts in world X/Z, shared by moving layers. */
export const SCENE_MOTION = {
  grassWind: .17, grassFlutter: 7.5,
  bannerWind: .065, bannerFlutter: 5.5,
  crystalDarkness: 1.03, crystalTravel: .24,
  flameWidth: 26, flameHeight: 35, flameRise: 3.2,
  glintSize: 4.5,
} as const;

/** Absolute simulation time: paused frames and restarts never accumulate drift. */
export function fireFlicker(time: number, phase = 0): number {
  return 1 + Math.sin(time * 5.7 + phase) * .11 + Math.sin(time * 11.3 + phase * 1.7) * .055;
}

export const ENVIRONMENT_WIND_GLSL = `
vec3 bridgeWind(float time, vec2 world) {
  float phase = time * 0.38 - world.x * 0.00065 - world.y * 0.0003;
  float gust = pow((1.0 + sin(phase)) * 0.5, 6.0);
  return vec3(-18.0 - 88.0 * gust + sin(time * 0.71) * 4.0, 5.0 + 19.0 * gust, gust);
}
`;
