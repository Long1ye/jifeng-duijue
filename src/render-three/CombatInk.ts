import { BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Point } from '../game/types';
import { toThree, type ThreeCamera } from './Coordinates';

/** One reusable triangle batch for contact cuts, wind accents and ground hints. */
export class CombatInk {
  private readonly positions = new Float32Array(65536 * 3);
  private readonly colors = new Float32Array(65536 * 4);
  private readonly geometry = new BufferGeometry();
  readonly mesh: Mesh<BufferGeometry, MeshBasicMaterial>;
  private used = 0;
  private readonly color = new Color();
  private right = new Vector3();
  private up = new Vector3();
  private normal = new Vector3();
  constructor(foreground = false) {
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, 4).setUsage(DynamicDrawUsage));
    this.mesh = new Mesh(this.geometry, new MeshBasicMaterial({ vertexColors: true, transparent: true, side: DoubleSide, depthTest: !foreground, depthWrite: false, toneMapped: false, fog: false }));
    this.mesh.renderOrder = foreground ? 21 : 0;
    this.mesh.frustumCulled = false; this.mesh.name = 'combat-contact-batch';
  }
  begin(camera: ThreeCamera) {
    this.used = 0; this.right.set(1, 0, 0).applyQuaternion(camera.camera.quaternion);
    this.up.set(0, 1, 0).applyQuaternion(camera.camera.quaternion); this.normal.set(0, 0, 1).applyQuaternion(camera.camera.quaternion);
  }
  screen(point: Point, height: number, x = 0, y = 0) { return toThree(point, height).addScaledVector(this.right, x).addScaledVector(this.up, -y); }
  line(a: Vector3, b: Vector3, color: number, alpha: number, width = 1) {
    if (alpha <= 0 || this.used + 6 > this.positions.length / 3) return;
    const side = new Vector3().subVectors(b, a).cross(this.normal).normalize().multiplyScalar(width / 2);
    this.color.setHex(color);
    for (const v of [a.clone().sub(side), b.clone().sub(side), a.clone().add(side), a.clone().add(side), b.clone().sub(side), b.clone().add(side)]) {
      this.positions.set([v.x, v.y, v.z], this.used * 3);
      this.colors.set([this.color.r, this.color.g, this.color.b, alpha], this.used++ * 4);
    }
  }
  cut(point: Point, height: number, a: Point, b: Point, color: number, alpha: number, width = 1) {
    this.line(this.screen(point, height, a.x, a.y), this.screen(point, height, b.x, b.y), color, alpha, width);
  }
  bodyArc(point: Point, height: number, rx: number, ry: number, start: number, end: number, color: number, alpha: number, width: number) {
    const count = Math.max(1, Math.ceil((end - start) * 12));
    for (let i = 0; i < count; i++) {
      const a = start + (end - start) * i / count, b = start + (end - start) * (i + 1) / count;
      const depth = Math.sin((a + b) / 2) < 0 ? -1.5 : 1.5;
      this.line(this.screen(point, height, Math.cos(a) * rx, Math.sin(a) * ry).addScaledVector(this.normal, depth), this.screen(point, height, Math.cos(b) * rx, Math.sin(b) * ry).addScaledVector(this.normal, depth), color, alpha, width);
    }
  }
  ring(point: Point, radius: number, color: number, alpha: number, start = 0, end = Math.PI * 2, height = 1, width = 1) {
    const count = Math.max(1, Math.ceil((end - start) * 10));
    for (let i = 0; i < count; i++) {
      const a = start + (end - start) * i / count, b = start + (end - start) * (i + 1) / count;
      this.line(toThree({ x: point.x + Math.cos(a) * radius, y: point.y + Math.sin(a) * radius }, height), toThree({ x: point.x + Math.cos(b) * radius, y: point.y + Math.sin(b) * radius }, height), color, alpha, width);
    }
  }
  end() {
    this.geometry.setDrawRange(0, this.used);
    if (this.used) for (const name of ['position', 'color']) {
      const attribute = this.geometry.getAttribute(name) as BufferAttribute;
      attribute.clearUpdateRanges(); attribute.addUpdateRange(0, this.used * attribute.itemSize); attribute.needsUpdate = true;
    }
  }
  reset() { this.geometry.setDrawRange(0, 0); }
  dispose() { this.geometry.dispose(); this.mesh.material.dispose(); this.mesh.removeFromParent(); }
}
