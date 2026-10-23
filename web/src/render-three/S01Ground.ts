import { BufferAttribute, BufferGeometry, Color, Group, Mesh, MeshLambertMaterial, Shape, ShapeGeometry, type Texture } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { bridgePoint, onPlayableBridge } from '../game/Bridge';
import { toThree } from './Coordinates';

type UV = readonly [number, number];
type Surface = 'slate' | 'repair' | 'border' | 'inlay' | 'substrate' | 'ice' | 'snow' | 'moss';
export const S01_GROUND_BOUNDS = { minU: -280, maxU: 80, minV: -104, maxV: 104 } as const;
export const S01_GROUND_TOP = 0.48;
// Local bridge coordinates, not world-unit radii. Repair strips follow old transverse joints.
export const S01_REPAIRS = [{ u: -126, v: 15, ru: 17, rv: 49 }, { u: -57, v: -38, ru: 11, rv: 29 }] as const;
const palette: Record<Surface, number> = {
  slate: 0x62757d, repair: 0x465a60, border: 0x809095, inlay: 0x6b939d,
  substrate: 0x263b40, ice: 0x648c9b, snow: 0xadbec5, moss: 0x445b50,
};
const noise = (x: number, y: number) => {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n);
};
const smoothNoise = (u: number, v: number) => {
  const x = Math.floor(u), y = Math.floor(v), a = u - x, b = v - y;
  const sx = a * a * (3 - 2 * a), sy = b * b * (3 - 2 * b);
  return (noise(x, y) * (1 - sx) + noise(x + 1, y) * sx) * (1 - sy)
    + (noise(x, y + 1) * (1 - sx) + noise(x + 1, y + 1) * sx) * sy;
};

/** Continuous authored fields; small stepped cells sample them, rather than random terrain tiles. */
export function groundCover(u: number, v: number): { snow: number; moss: number } {
  const driftEdge = 77 + Math.sin(u / 31) * 9 + Math.sin(u / 13) * 4;
  const shelteredEdge = 96 + Math.sin(u / 24 + 1) * 5;
  const rough = (smoothNoise(u / 9, v / 7) - 0.5) * 11;
  return { snow: (v - driftEdge + rough) / 17, moss: (-v - shelteredEdge - rough) / 15 };
}

export function groundZone(u: number, v: number): 'tower' | 'emblem' | 'repair' | 'road' {
  if (((u + 195) / 23) ** 2 + (v / 37) ** 2 < 1) return 'tower';
  if (((u + 6) / 25) ** 2 + (v / 40) ** 2 < 1) return 'emblem';
  if (S01_REPAIRS.some(p => ((u - p.u) / p.ru) ** 2 + ((v - p.v) / p.rv) ** 2 < 1)) return 'repair';
  return 'road';
}

/** All layers are decorative: no new collision, pick target, gameplay height or live update. */
export function createS01Ground(textures?: { rubble: Texture; repair: Texture; ice: Texture }): Group {
  const group = new Group(); group.name = 'S01 layered ground · 02';
  const batches = new Map<Surface, BufferGeometry[]>();
  const add = (points: UV[], surface: Surface, height: number, variation = 1) => {
    if (points.length < 3 || points.some(([u, v]) => u < -280 || u > 80 || Math.abs(v) > 104 || !onPlayableBridge(bridgePoint(u, v)))) return;
    const shape = new Shape();
    points.forEach(([u, v], i) => { const p = toThree(bridgePoint(u, v)); if (i) shape.lineTo(p.x, -p.z); else shape.moveTo(p.x, -p.z); });
    shape.closePath();
    const geometry = new ShapeGeometry(shape).rotateX(-Math.PI / 2).translate(0, height, 0);
    const position = geometry.getAttribute('position'), uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) { uv[i * 2] = position.getX(i) / 64; uv[i * 2 + 1] = position.getZ(i) / 64; }
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
    const color = new Color(palette[surface]).multiplyScalar(variation);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) colors.set([color.r, color.g, color.b], i);
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    const batch = batches.get(surface) ?? []; batch.push(geometry); batches.set(surface, batch);
  };
  const rect = (u: number, v: number, w: number, h: number, surface: Surface, y: number, shade = 1) => {
    const l = Math.max(-280, u), r = Math.min(80, u + w), t = Math.max(-104, v), b = Math.min(104, v + h);
    if (r > l && b > t) add([[l, t], [r, t], [r, b], [l, b]], surface, y, shade);
  };
  // A dark joint bed replaces the old repeated 64-unit floor inside the sample.
  rect(-280, -104, 360, 208, 'substrate', 0.08);
  for (let row = 0; row < 11; row++) for (let col = -1; col < 25; col++) {
    const u = -280 + col * 16 + (row % 2) * 8, v = -104 + row * 20;
    const l = Math.max(-280, u + 0.25), r = Math.min(80, u + 15.65);
    const t = v + 0.4, b = Math.min(104, v + 19.6), seed = noise(col, row);
    if (r - l < 2 || b - t < 2) continue;
    const cut = 0.6 + seed * 1.5;
    // Eight-sided, individually sized flags: visible joints, chipped corners and offset courses.
    add([[l + cut, t], [r - cut, t], [r, t + cut], [r, b - cut], [r - cut, b], [l + cut, b], [l, b - cut], [l, t + cut]], 'slate', 0.14, 0.88 + seed * 0.2);
    if (seed > 0.77) {
      const mid = l + (r - l) * 0.55;
      add([[mid, t], [mid + 0.5, t], [mid - 1, t + 7], [mid + 1.5, b], [mid + 1.1, b], [mid - 1.5, t + 7]], 'substrate', 0.17);
    }
    // Tiny worn edges interrupt uniform flag silhouettes without filling the combat lane with props.
    if (seed < 0.3) add([[l + cut, t], [r - cut, t], [r - cut - 1, t + 0.45], [l + cut + 1, t + 0.45]], 'border', 0.18, 0.91);
    // Sparse mineral flecks and small pits belong to each flag, so there is no repeating image motif.
    for (let chip = 0; chip < 5; chip++) {
      const x = l + 1.8 + noise(col * 7 + chip, row) * Math.max(0, r - l - 4);
      const z = t + 1.8 + noise(col, row * 7 + chip) * Math.max(0, b - t - 4);
      rect(x, z, 0.25 + noise(chip, row) * 0.5, 0.5 + noise(col, chip) * 1.3,
        chip % 3 ? 'slate' : 'substrate', 0.19, chip % 3 ? 1.17 : 1.25);
    }
  }
  // Repairs use smaller, darker cobbles with a ragged boundary rather than a rectangular decal.
  for (const repair of S01_REPAIRS) for (let row = -9; row <= 9; row++) for (let col = -8; col <= 8; col++) {
    const u = repair.u + col * 3.5 + (row % 2) * 1.75, v = repair.v + row * 6;
    const d = ((u - repair.u) / repair.ru) ** 2 + ((v - repair.v) / repair.rv) ** 2;
    if (d > 0.92 + noise(col, row) * 0.18) continue;
    rect(u - 0.2, v - 0.3, 3.6, 6, 'substrate', 0.21);
    rect(u, v, 3, 5.2, 'repair', 0.24, 0.85 + noise(col + 11, row) * 0.28);
  }
  const ring = (cu: number, ru: number, rv: number, inner: number, outer: number, surface: Surface, y: number, broken = false) => {
    for (let i = 0; i < 32; i++) {
      if (broken && (i === 3 || i === 4 || i === 17 || i === 25)) continue;
      const a = i * Math.PI / 16 + 0.009, b = (i + 1) * Math.PI / 16 - 0.009;
      add([[cu + Math.cos(a) * ru * inner, Math.sin(a) * rv * inner], [cu + Math.cos(a) * ru * outer, Math.sin(a) * rv * outer],
        [cu + Math.cos(b) * ru * outer, Math.sin(b) * rv * outer], [cu + Math.cos(b) * ru * inner, Math.sin(b) * rv * inner]], surface, y, 0.9 + noise(i, cu) * 0.16);
    }
  };
  // The tower has its own broad radial apron, continuing well beyond its small physical foot.
  ring(-195, 23, 37, 0, 1, 'repair', 0.28);
  ring(-195, 23, 37, 0.89, 1, 'border', 0.31, true);
  ring(-195, 23, 37, 0.69, 0.72, 'inlay', 0.33, true);
  // Angular glacial seal: Howling Abyss subject, with the reference games guiding treatment only.
  ring(-6, 25, 40, 0, 1, 'repair', 0.28);
  ring(-6, 25, 40, 0.9, 1, 'border', 0.31, true);
  ring(-6, 25, 40, 0.71, 0.74, 'inlay', 0.32, true);
  add([[-6, -25], [-2, -6], [8, 0], [-2, 6], [-6, 25], [-10, 6], [-20, 0], [-10, -6]], 'inlay', 0.34, 0.84);
  for (const sign of [-1, 1]) {
    add([[-6, sign * 6], [-17, sign * 17], [-18, sign * 15], [-8, sign * 4]], 'inlay', 0.35, 0.84);
    add([[-6, sign * 6], [5, sign * 17], [6, sign * 15], [-4, sign * 4]], 'inlay', 0.35, 0.84);
  }
  // Shallow missing paving exposes substrate at two authored shoulder sites; no fake traversable pits.
  for (const [u, v] of [[-162, 68], [-38, -70]]) {
    add([[u - 9, v - 4], [u - 5, v - 13], [u + 6, v - 9], [u + 10, v + 2], [u + 3, v + 12], [u - 7, v + 8]], 'border', 0.36, 0.68);
    add([[u - 8, v - 3], [u - 4, v - 11], [u + 5, v - 8], [u + 8, v + 2], [u + 2, v + 10], [u - 6, v + 7]], 'substrate', 0.38);
    for (let i = 0; i < 7; i++) rect(u - 6 + noise(i, u) * 12, v - 8 + noise(i, v) * 15, 1.8, 2.7, 'repair', 0.4, 1.15);
  }
  // Continuous masks give ice margins, snow cores and scattered melting fringes. Opposite side is damp moss.
  for (let u = -280; u < 80; u += 1) for (let v = -104; v < 104; v += 2) {
    const cover = groundCover(u + 0.5, v + 1), n = noise(u, v);
    if (cover.snow > -0.3) {
      if (cover.snow > 0.28 + n * 0.24) rect(u, v, 1, 2, 'snow', 0.48, 0.94 + n * 0.09);
      else if (cover.snow > -0.08 || n < (cover.snow + 0.3) * 3) rect(u, v, 1, 2, 'ice', 0.44, 0.92 + n * 0.14);
    }
    if (cover.moss > -0.12 && (cover.moss > 0.22 || n < (cover.moss + 0.12) * 2.8)) {
      rect(u, v, 1, 2, 'moss', 0.46, 0.86 + n * 0.23);
    }
  }
  // Opaque, separated heights: no alpha blending/sorting or near-coplanar full-screen layers.
  for (const [surface, geometries] of batches) {
    const merged = mergeGeometries(geometries, false);
    if (!merged) throw new Error(`Cannot merge S01 ground ${surface}`);
    // Both generated stone candidates contain joints: restrict them to repairs/exposed joint bed.
    // Never stamp another small-brick grid inside the large native flagstones.
    const map = surface === 'ice' ? textures?.ice : surface === 'repair' ? textures?.repair
      : surface === 'substrate' ? textures?.rubble : undefined;
    const material = new MeshLambertMaterial({ vertexColors: true, map: map ?? null }); material.name = `s01-ground-${surface}`;
    // Use low-contrast mineral/frost detail independently of the authored surface palette and joints.
    if (map) {
      material.onBeforeCompile = shader => {
        if (!shader.fragmentShader.includes('#include <map_fragment>')) throw new Error('Unsupported S01 ground shader');
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
          vec3 groundBase = diffuseColor.rgb;
          #include <map_fragment>
          vec3 groundDetail = diffuseColor.rgb / max(groundBase, vec3(0.0001));
          float groundGrain = dot(groundDetail, vec3(0.2126, 0.7152, 0.0722));
          diffuseColor.rgb = groundBase * clamp(0.75 + groundGrain * 0.8, 0.78, 1.22);
        `);
      };
      material.customProgramCacheKey = () => 's01-ground-grain-v1';
    }
    const mesh = new Mesh(merged, material); mesh.name = `ground-${surface}`; mesh.receiveShadow = true;
    group.add(mesh); for (const geometry of geometries) geometry.dispose();
  }
  return group;
}
