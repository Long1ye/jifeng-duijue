import { BufferAttribute, BufferGeometry } from 'three';
import { BRIDGE } from '../game/Bridge';
import parapetArt from '../../assets/map-modules/howling-painted-v6/geometry.json';

/** A dedicated connected wall, cropped only through masonry between posts.
 * Source coordinates were inspected against the native alpha silhouette. */
export const PARAPET_ART = parapetArt;
export const PARAPET_SPAN = (PARAPET_ART.right - PARAPET_ART.left) * PARAPET_ART.scale / BRIDGE.projection.along[0];
/** One shared segmentation for wall meshes and their attached decorations. */
export function parapetRuns(side: number): { start: number; end: number }[] {
  // Tuck each run beneath the solid statue plinth. The former wide cutouts
  // stopped outside the opaque masonry and left a visible opening to the abyss.
  const gaps = side < 0 ? [[-653, -546], [504, 611]] : [];
  const runs: { start: number; end: number }[] = [];
  for (let u = -720; u < 720;) {
    const gap = gaps.find(([a, b]) => u >= a - .001 && u < b);
    if (gap) { u = gap[1]; continue; }
    const next = gaps.find(([a]) => a > u)?.[0] ?? 720;
    const end = Math.min(u + PARAPET_SPAN, next, 720);
    runs.push({ start: u, end }); u = end;
  }
  return runs;
}

export function parapetBays(side: number): { leftPost: number; rightPost: number; center: number; width: number }[] {
  const posts = parapetRuns(side).flatMap(run => {
    const [left, right] = parapetCut(run.end - run.start);
    return PARAPET_ART.posts.filter(([a, b]) => a > left && b < right)
      .map(([a, b]) => run.start + ((a + b) / 2 - left) * PARAPET_ART.scale / BRIDGE.projection.along[0]);
  });
  return posts.slice(1).flatMap((rightPost, i) => {
    const leftPost = posts[i];
    if (rightPost - leftPost > 60) return []; // Sanctuary masonry replaces the ordinary parapet.
    return [{ leftPost, rightPost, center: (leftPost + rightPost) / 2, width: (rightPost - leftPost) * BRIDGE.projection.along[0] }];
  });
}
export function parapetFoot(x: number): number {
  const p = PARAPET_ART.foot;
  for (let i = 1; i < p.length; i++) if (x <= p[i][0]) {
    const a = p[i - 1], b = p[i]; return a[1] + (x - a[0]) / (b[0] - a[0]) * (b[1] - a[1]);
  }
  const a = p[p.length - 2], b = p[p.length - 1];
  return b[1] + (x - b[0]) / (b[0] - a[0]) * (b[1] - a[1]);
}

export function parapetCut(span: number): readonly [number, number] {
  if (!(span > 0 && span <= PARAPET_SPAN + 1e-7)) throw new RangeError('Invalid parapet span');
  const width = span * BRIDGE.projection.along[0] / PARAPET_ART.scale;
  const plain = (x: number) => !PARAPET_ART.posts.some(([a, b]) => x >= a && x <= b);
  const choices: number[] = [];
  for (let x = PARAPET_ART.cutMin; x <= PARAPET_ART.cutMax; x += 5) if (x + width <= PARAPET_ART.cutMax && plain(x) && plain(x + width)) choices.push(x);
  if (!choices.length) throw new Error(`No complete masonry cut for span ${span}`);
  const left = choices.sort((a, b) => Math.abs(a - PARAPET_ART.left) - Math.abs(b - PARAPET_ART.left))[0];
  return [left, left + width];
}
export function parapetGeometry(span: number): BufferGeometry {
  const [left, right] = parapetCut(span), columns = Math.max(4, Math.ceil((right - left) / 18)), rows = 48;
  const vertices: number[] = [], uv: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) {
    const px = left + (right - left) * col / columns, py = PARAPET_ART.size[1] * row / rows;
    const x = (px - left) * PARAPET_ART.scale;
    // Each foot lies on the actual bridge axis, rather than inheriting an
    // approximate slope from the decorative wall attached to the wolf asset.
    vertices.push(x, Math.max(.25, (parapetFoot(px) - py) * PARAPET_ART.scale * Math.SQRT2), x * BRIDGE.projection.along[1] / BRIDGE.projection.along[0]);
    uv.push(px / PARAPET_ART.size[0], 1 - py / PARAPET_ART.size[1]);
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * (columns + 1) + col; indices.push(i, i + columns + 1, i + 1, i + 1, i + columns + 1, i + columns + 2);
  }
  const geometry = new BufferGeometry(); geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry;
}
