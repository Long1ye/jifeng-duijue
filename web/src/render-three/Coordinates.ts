import { OrthographicCamera, Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Point } from '../game/types';
import { BRIDGE, BRIDGE_WORLD, bridgePoint } from '../game/Bridge';
import { unproject } from '../../assets/map-studies/howling-abyss-v1/geometry';

// The simulation already contains the bridge's authoring projection. Map it once,
// isometrically, to X/Z. Camera foreshortening belongs only to presentation.
export const WORLD_ORIGIN = { x: BRIDGE_WORLD.width / 2, y: BRIDGE_WORLD.height / 2 };
export function toThree(point: Point, height = 0): Vector3 {
  return new Vector3(point.x - WORLD_ORIGIN.x, height, point.y - WORLD_ORIGIN.y);
}
export function toSimulation(point: Vector3): Point {
  return { x: point.x + WORLD_ORIGIN.x, y: point.z + WORLD_ORIGIN.y };
}
export interface ViewSize { width: number; height: number }
export interface ViewRect extends ViewSize { left: number; top: number }
export const CAMERA_CANDIDATE = { elevation: 60, referenceHeight: 270, distance: 5000 } as const;
export const GAMEPLAY_VIEW = { width: 1920, height: 1080, zoom: .6 } as const;

export class ThreeCamera {
  readonly camera = new OrthographicCamera(-400, 400, 225, -225, 1, 12000);
  readonly focus: Point = { ...WORLD_ORIGIN };
  size: ViewSize = { width: 1280, height: 720 };
  zoom = 0.6;
  elevation = Number(CAMERA_CANDIDATE.elevation);
  private readonly raycaster = new Raycaster();
  private readonly ground = new Plane(new Vector3(0, 1, 0), 0);
  private mapBounds = false;

  /** Gameplay framing excludes the unfinished bridge ends; art inspection can roam freely. */
  setMapBounds(enabled: boolean): void { this.mapBounds = enabled; this.update(); }

  constructor() { this.update(); }
  resize(width: number, height: number): void {
    if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) throw new RangeError('Invalid viewport');
    this.size = { width, height }; this.update();
  }
  lookAt(point: Point): void { this.focus.x = point.x; this.focus.y = point.y; this.update(); }
  /** Leave the central area still; optional follow only catches up outside it. */
  follow(point: Point, dt: number): void {
    const screen = this.project(point);
    const excess = (offset: number, radius: number) => Math.sign(offset) * Math.max(0, Math.abs(offset) - radius);
    const dx = excess(screen.x - this.size.width / 2, this.size.width * .16);
    const dy = excess(screen.y - this.size.height / 2, this.size.height * .14);
    if (!dx && !dy) return;
    const blend = 1 - Math.exp(-6 * Math.min(.1, Math.max(0, dt)));
    this.panScreen(dx * blend, dy * blend);
  }
  /** Ground displacement for CSS-pixel camera motion. Unlike ground picking,
   * a fast grab may cross beyond the viewport and must not be rejected. */
  panScreen(dx: number, dy: number): void {
    const units = (this.camera.top - this.camera.bottom) / this.size.height;
    this.lookAt({ x: this.focus.x + dx * units, y: this.focus.y + dy * units / Math.sin(this.elevation * Math.PI / 180) });
  }
  setZoom(value: number): void {
    if (!(value > 0 && Number.isFinite(value))) throw new RangeError('Invalid zoom');
    this.zoom = value; this.update();
  }
  setElevation(degrees: number): void {
    if (![45, 60, 75].includes(degrees)) throw new RangeError('Unsupported camera candidate');
    this.elevation = degrees; this.update();
  }
  project(point: Point, height = 0): Point {
    const projected = toThree(point, height).project(this.camera);
    return { x: (projected.x + 1) * this.size.width / 2, y: (1 - projected.y) * this.size.height / 2 };
  }
  pick(client: Point, rect: ViewRect): Point | null {
    if (!(rect.width > 0 && rect.height > 0)) return null;
    const u = (client.x - rect.left) / rect.width, v = (client.y - rect.top) / rect.height;
    if (u < 0 || u > 1 || v < 0 || v > 1) return null;
    this.raycaster.setFromCamera(new Vector2(u * 2 - 1, 1 - v * 2), this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.ground, new Vector3());
    return hit ? toSimulation(hit) : null;
  }
  /** Screen heading for future eight-direction sprite selection; never changes simulation facing. */
  screenHeading(point: Point, facing: number): number {
    const a = this.project(point), b = this.project({ x: point.x + Math.cos(facing), y: point.y + Math.sin(facing) });
    return Math.atan2(b.y - a.y, b.x - a.x);
  }
  private update(): void {
    const angle = this.elevation * Math.PI / 180;
    if (this.mapBounds) {
      // A rectangular world clamp misses the diagonal bridge ends. Inverse-project
      // the entire ground footprint, including the extra depth at low elevations.
      const p = BRIDGE.projection, determinant = p.along[0] * p.across[1] - p.along[1] * p.across[0];
      const ux = p.across[1] / determinant, uy = -p.across[0] / determinant;
      const extentAtZoomOne = CAMERA_CANDIDATE.referenceHeight / 2 *
        (Math.abs(ux) * this.size.width / this.size.height + Math.abs(uy) / Math.sin(angle));
      // Preserve the normal gameplay scale and keep spawn heroes visible even on
      // ultrawide displays. Overview zooms belong to the inspection scenarios.
      this.zoom = Math.max(this.zoom, GAMEPLAY_VIEW.zoom, extentAtZoomOne / 140);
      const extent = extentAtZoomOne / this.zoom;
      const [rawU, rawV] = unproject(BRIDGE, this.focus.x, this.focus.y);
      const u = Math.max(-BRIDGE.bridge.halfLength + 8 + extent, Math.min(BRIDGE.bridge.halfLength - 8 - extent, rawU));
      // Slide along the end boundary by the shortest screen-space displacement.
      // Moving only along u can push the spawn hero off a portrait viewport.
      const sinSquared = Math.sin(angle) ** 2;
      const slide = (p.along[0] * p.across[0] + p.along[1] * p.across[1] * sinSquared) /
        (p.across[0] ** 2 + p.across[1] ** 2 * sinSquared);
      let v = Math.max(-80, Math.min(80, rawV - (u - rawU) * slide));
      if (Math.abs(rawU) <= 720 && Math.abs(rawV) <= 80) {
        // Reserve space around a requested hero position, including the HUD below.
        const halfHeight = CAMERA_CANDIDATE.referenceHeight / this.zoom / 2;
        const limits = [
          [p.along[0], p.across[0], halfHeight * this.size.width / this.size.height * .9],
          [p.along[1], p.across[1], halfHeight / Math.sin(angle) * .7],
        ];
        let minV = -80, maxV = 80;
        for (const [along, across, radius] of limits) {
          minV = Math.max(minV, rawV + (-radius - (u - rawU) * along) / across);
          maxV = Math.min(maxV, rawV + (radius - (u - rawU) * along) / across);
        }
        if (minV <= maxV) v = Math.max(minV, Math.min(maxV, v));
      }
      const point = bridgePoint(u, v);
      this.focus.x = point.x; this.focus.y = point.y;
    }
    const halfHeight = CAMERA_CANDIDATE.referenceHeight / this.zoom / 2;
    const halfWidth = halfHeight * this.size.width / this.size.height;
    Object.assign(this.camera, { left: -halfWidth, right: halfWidth, top: halfHeight, bottom: -halfHeight });
    const target = toThree(this.focus);
    this.camera.position.copy(target).add(new Vector3(0, Math.sin(angle), Math.cos(angle)).multiplyScalar(CAMERA_CANDIDATE.distance));
    this.camera.lookAt(target); this.camera.updateProjectionMatrix(); this.camera.updateMatrixWorld(true);
  }
}
