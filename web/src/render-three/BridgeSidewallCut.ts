import { BufferAttribute, BufferGeometry, Vector3 } from 'three';
import { BRIDGE } from '../game/Bridge';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';

/** Remove only old vertical sidewall triangles inside the new facade span; preserve the deck. */
export function cutBridgeSidewalls(source: BufferGeometry, minU: number, maxU: number): BufferGeometry {
  const output: number[] = [], groups: { start: number; count: number; materialIndex: number }[] = [];
  const attribute = source.getAttribute('position'), indices = source.getIndex();
  const u = (p: Vector3) => unproject(BRIDGE, p.x + BRIDGE.projection.origin[0], p.z + BRIDGE.projection.origin[1])[0];
  const clip = (polygon: Vector3[], edge: number, less: boolean): Vector3[] => {
    const result: Vector3[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i], b = polygon[(i + 1) % polygon.length], da = u(a) - edge, db = u(b) - edge;
      const insideA = less ? da <= 0 : da >= 0, insideB = less ? db <= 0 : db >= 0;
      if (insideA) result.push(a);
      if (insideA !== insideB) result.push(a.clone().lerp(b, da / (da - db)));
    }
    return result;
  };
  const append = (polygon: Vector3[], materialIndex: number) => {
    for (let i = 1; i + 1 < polygon.length; i++) {
      const points = [polygon[0], polygon[i], polygon[i + 1]];
      if (points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0])).lengthSq() < 1e-10) continue;
      const start = output.length / 3;
      for (const point of points) output.push(point.x, point.y, point.z);
      const previous = groups[groups.length - 1];
      if (previous && previous.materialIndex === materialIndex && previous.start + previous.count === start) previous.count += 3;
      else groups.push({ start, count: 3, materialIndex });
    }
  };
  for (let i = 0; i < (indices?.count ?? attribute.count); i += 3) {
    const points = [0, 1, 2].map(offset => new Vector3().fromBufferAttribute(attribute, indices ? indices.getX(i + offset) : i + offset));
    const horizontal = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y)) < 0.01;
    if (horizontal) append(points, 0);
    else { append(clip(points, minU, true), 1); append(clip(points, maxU, false), 1); }
  }
  const result = new BufferGeometry(); result.setAttribute('position', new BufferAttribute(new Float32Array(output), 3));
  for (const group of groups) result.addGroup(group.start, group.count, group.materialIndex);
  result.computeVertexNormals(); return result;
}
