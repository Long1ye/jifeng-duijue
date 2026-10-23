import type { MeshBasicMaterial } from 'three';
export type MapTeam = 'blue' | 'red' | 'neutral';
export function mapTeamAt(u: number): MapTeam { return u < -70 ? 'blue' : u > 70 ? 'red' : 'neutral'; }
const smooth = (a: number, b: number, v: number) => { const t = Math.max(0, Math.min(1, (v-a)/(b-a))); return t*t*(3-2*t); };
/** Palette test reference in source sRGB. Low-saturation stone/snow and warm
 * flame pixels are deliberately outside the crystal/cloth accent mask. */
export function teamAccentRGB(rgb: readonly number[], team: MapTeam, mode: 'default' | 'ice' = 'default'): number[] {
  if (team === 'blue') return [...rgb];
  const [r,g,b] = rgb, high = Math.max(r,g,b), low = Math.min(r,g,b);
  const mask = mode === 'ice'
    ? smooth(.18,.38,(high-low)/Math.max(high,.001))*smooth(.02,.10,b-r)*smooth(.01,.07,b-g)
    : smooth(.42,.68,(high-low)/Math.max(high,.001))*smooth(.04,.16,b-Math.max(r,g))*smooth(.28,.5,b);
  const grey = r*.3+g*.59+b*.11;
  const target = team === 'red' ? [b, Math.min(r,g)*.6, Math.max(r,g)*.46] : [grey,grey,grey];
  return rgb.map((v,i) => v+(target[i]-v)*mask);
}

/** Compose with existing wind vertex shaders. Recolor accents only, rather
 * than multiplying an entire building pink, and preserve texture alpha. */
export function applyTeamAccent(material: MeshBasicMaterial, team: MapTeam, mode: 'default' | 'ice' = 'default'): void {
  material.userData.team = team;
  if (team === 'blue') return;
  const compile = material.onBeforeCompile, key = material.customProgramCacheKey.bind(material);
  const originalKey = key();
  material.onBeforeCompile = (shader, renderer) => {
    compile.call(material, shader, renderer);
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      vec3 teamSource = pow(max(diffuseColor.rgb,vec3(0.0)),vec3(1.0/2.2));
      float teamMax = max(teamSource.r,max(teamSource.g,teamSource.b));
      float teamMin = min(teamSource.r,min(teamSource.g,teamSource.b));
      float teamMask = ${mode === 'ice' ? `smoothstep(.18,.38,(teamMax-teamMin)/max(teamMax,.001))
        *smoothstep(.02,.10,teamSource.b-teamSource.r)*smoothstep(.01,.07,teamSource.b-teamSource.g)` : `smoothstep(.42,.68,(teamMax-teamMin)/max(teamMax,.001))
        *smoothstep(.04,.16,teamSource.b-max(teamSource.r,teamSource.g))*smoothstep(.28,.5,teamSource.b)`};
      vec3 teamTarget = ${team === 'red' ? 'vec3(teamSource.b,min(teamSource.r,teamSource.g)*.6,max(teamSource.r,teamSource.g)*.46)' : 'vec3(dot(teamSource,vec3(.3,.59,.11)))'};
      diffuseColor.rgb = pow(mix(teamSource,teamTarget,teamMask),vec3(2.2));
    `);
  };
  material.customProgramCacheKey = () => `${originalKey}-team-accent-v1-${team}${mode === 'ice' ? '-ice' : ''}`;
}
