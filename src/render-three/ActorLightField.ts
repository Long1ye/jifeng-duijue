import { Group, Mesh, Vector3 } from 'three';
import type { Point } from '../game/types';
import { WORLD_ORIGIN } from './Coordinates';

/** Soft actor shading derived from current architecture, including destroyed-tower visibility. */
export class ActorLightField {
  private readonly blockers: { mesh: Mesh; height: number; radius: number; position: Vector3 }[] = [];
  constructor(roots: readonly Group[]) {
    for (const root of roots) root.traverse(mesh => {
      if (!(mesh instanceof Mesh) || !/^painted-(tower|inner-tower|nexus-tower|guardian-pillar)$/.test(mesh.name)) return;
      mesh.geometry.computeBoundingBox(); const box = mesh.geometry.boundingBox!;
      this.blockers.push({ mesh, height: Math.max(1, box.max.y * mesh.scale.y), radius: Math.max(12, Math.min(45, (box.max.x - box.min.x) * mesh.scale.x * .16)), position: new Vector3() });
    });
  }
  update() { for (const blocker of this.blockers) { blocker.mesh.updateWorldMatrix(true, false); blocker.position.setFromMatrixPosition(blocker.mesh.matrixWorld); } }
  shade(point: Point) {
    let shadow = 0;
    for (const blocker of this.blockers) {
      let visible = true;
      for (let node: import('three').Object3D | null = blocker.mesh; node; node = node.parent) visible &&= node.visible;
      if (!visible) continue;
      const dx = blocker.height * 400 / 850, dz = -blocker.height * 350 / 850;
      const x = point.x - WORLD_ORIGIN.x - blocker.position.x, z = point.y - WORLD_ORIGIN.y - blocker.position.z;
      const t = Math.max(0, Math.min(1, (x * dx + z * dz) / (dx * dx + dz * dz)));
      const distance = Math.hypot(x - t * dx, z - t * dz);
      shadow = Math.max(shadow, Math.max(0, 1 - distance / (blocker.radius + 10)) ** 2 * Math.sin(t * Math.PI));
    }
    return 1 - shadow * .10;
  }
}
