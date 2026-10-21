import { Color, DataTexture, MeshLambertMaterial, NearestFilter, RGBAFormat, type Texture } from 'three';
import { bridgePoint } from '../game/Bridge';
import type { Point, Team } from '../game/types';
import type { ThreeCamera } from './Coordinates';
import { ART_BASE, ART_BRAZIERS, ART_GUARDIANS, ART_OUTER_U, artBrazierMount } from './PaintedMapLayout';

export const S01_TORCHES = [[-240, -110], [-160, 110], [-80, -110], [40, 110]].map(([u, v]) => ({ ...bridgePoint(u, v), phase: u }));
export const S01_LIGHTING = { hemisphere: 0.72, sun: 1.55, fill: 0.32, fire: 76, fireRadius: 190 } as const;
const palettes = {
  floor: { tint: 0xb2bfca, saturation: 0.24, gain: 1.55 },
  wall: { tint: 0x9cafbb, saturation: 0.38, gain: 1.25 },
  moss: { tint: 0x81958b, saturation: 0.32, gain: 1.05 },
} as const;

/** Grade source albedo before lighting; this never changes the source PNG pixels. */
export function stoneMaterial(map: Texture, role: keyof typeof palettes): MeshLambertMaterial {
  const material = new MeshLambertMaterial({ map });
  material.name = `s01-v2-${role}`; material.userData.palette = role;
  const palette = palettes[role];
  material.onBeforeCompile = shader => {
    if (!shader.fragmentShader.includes('#include <map_fragment>')) throw new Error('Unsupported S01 material shader');
    shader.uniforms.s01Tint = { value: new Color(palette.tint) };
    shader.uniforms.s01Saturation = { value: palette.saturation };
    shader.uniforms.s01Gain = { value: palette.gain };
    shader.fragmentShader = 'uniform vec3 s01Tint;\nuniform float s01Saturation;\nuniform float s01Gain;\n' + shader.fragmentShader.replace('#include <map_fragment>', `
      #include <map_fragment>
      float s01Luma = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
      diffuseColor.rgb = mix(vec3(s01Luma) * s01Tint * s01Gain, diffuseColor.rgb, s01Saturation);
    `);
  };
  material.customProgramCacheKey = () => `s01-palette-v2-${role}`;
  return material;
}

export function firePulse(time: number, phase: number): number {
  return 1 + Math.sin(time * 7 + phase) * 0.055 + Math.sin(time * 11 + phase) * 0.025;
}
const paintedFires = ART_BRAZIERS.map(({ u, v }) => { const mount = artBrazierMount(u, v); return { ...bridgePoint(mount.u, mount.v), phase: u }; });
const paintedBlockers = [
  ...ART_GUARDIANS.map(({ u, v }) => ({ ...bridgePoint(u, v), height: 155, radius: 22 })),
  ...[-1, 1].flatMap(sign => [ART_OUTER_U, Math.abs(ART_BASE.innerTower[0])].map(u => ({ ...bridgePoint(sign * u), height: 135, radius: 23 }))),
];
/** Soft actor-only approximation of the painted map's fixed sun shadows. */
export function paintedShadowFactor(point: Point): number {
  let shade = 0;
  for (const blocker of paintedBlockers) {
    const dx = blocker.height * 400 / 850, dy = -blocker.height * 350 / 850;
    const t = Math.max(0, Math.min(1, ((point.x - blocker.x) * dx + (point.y - blocker.y) * dy) / (dx * dx + dy * dy)));
    const distance = Math.hypot(point.x - blocker.x - dx * t, point.y - blocker.y - dy * t);
    shade = Math.max(shade, Math.max(0, 1 - distance / (blocker.radius + 9)) ** 2 * Math.sin(t * Math.PI));
  }
  return 1 - shade * .10;
}
export function actorEnvironmentTint(point: Point, time: number, team: Team, target = new Color(), painted = false): Color {
  target.setHex(team === 'blue' ? 0xd7e1e5 : 0xe4d5d0);
  let warmth = 0;
  for (const fire of painted ? paintedFires : S01_TORCHES) {
    const distance = Math.hypot(point.x - fire.x, point.y - fire.y);
    warmth += Math.max(0, 1 - distance / S01_LIGHTING.fireRadius) ** 2 * firePulse(time, fire.phase);
  }
  target.lerp(new Color(0xffdfbd), Math.min(0.24, warmth * 0.24));
  return painted ? target.multiplyScalar(paintedShadowFactor(point)) : target;
}

/** Small pixel-stepped alpha falloff, not a blurred full-screen shadow. */
export function contactShadowTexture(): DataTexture {
  const size = 32, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const radius = Math.hypot((x + 0.5 - size / 2) / (size / 2), (y + 0.5 - size / 2) / (size / 2));
    const strength = Math.max(0, 1 - radius) ** 1.4;
    data.set([255, 255, 255, Math.round(strength * 6) / 6 * 255], (y * size + x) * 4);
  }
  const texture = new DataTexture(data, size, size, RGBAFormat);
  texture.magFilter = texture.minFilter = NearestFilter; texture.generateMipmaps = false; texture.needsUpdate = true;
  return texture;
}

/** Fade only when the player's screen torso overlaps the tower and feet are behind it. */
export function towerPlayerOpacity(actor: Point, anchor: Point, height: number, camera: ThreeCamera): number {
  if (actor.y >= anchor.y) return 1;
  const foot = camera.project(actor), base = camera.project(anchor), top = camera.project(anchor, 170);
  const scale = camera.size.height / (camera.camera.top - camera.camera.bottom);
  const torso = foot.y - height * scale * 0.55;
  return Math.abs(foot.x - base.x) < 40 * scale && torso >= top.y - 6 * scale && torso <= base.y + 8 * scale ? 0.48 : 1;
}
