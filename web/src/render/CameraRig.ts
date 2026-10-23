import { VIEWPORT, WORLD, HOWLING_MAP } from '../game/config';
import { clamp } from '../game/geometry';
import type { Point } from '../game/types';

/** Camera math is independent of simulation, rendering and the DOM. */
export class CameraRig {
  readonly viewport:{width:number;height:number}={...VIEWPORT};
  setViewport(width:number,height:number):void {
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw new RangeError('Invalid camera viewport');
    this.viewport.width=width;this.viewport.height=height;this.lookAt(this.focus);
  }
  private focus: Point = { x: WORLD.width / 2, y: WORLD.height / 2 };
  following = true;
  zoom: 0.6 | 1 | 1.5 = HOWLING_MAP ? 0.6 : 1;

  get center(): Point {
    return {
      x: clamp(this.focus.x, this.viewport.width / this.zoom / 2, WORLD.width - this.viewport.width / this.zoom / 2),
      y: clamp(this.focus.y, this.viewport.height / this.zoom / 2, WORLD.height - this.viewport.height / this.zoom / 2),
    };
  }

  get bounds(): { x: number; y: number; width: number; height: number } {
    const width = this.viewport.width / this.zoom, height = this.viewport.height / this.zoom;
    return { x: this.center.x - width / 2, y: this.center.y - height / 2, width, height };
  }

  reset(hero: Point): void {
    this.following = true;
    this.zoom = HOWLING_MAP ? 0.6 : 1;
    this.lookAt(hero);
  }

  lookAt(point: Point): void {
    const halfWidth = this.viewport.width / this.zoom / 2, halfHeight = this.viewport.height / this.zoom / 2;
    // Preserve subpixels; actor pixels are snapped relative to this same camera scroll.
    this.focus = {
      x: clamp(point.x, halfWidth, WORLD.width - halfWidth),
      y: clamp(point.y, halfHeight, WORLD.height - halfHeight),
    };
  }

  toggleFollow(hero: Point): void {
    this.following = !this.following;
    if (this.following) this.lookAt(hero);
  }

  pan(dx: number, dy: number): void {
    this.following = false;
    this.lookAt({ x: this.focus.x + dx, y: this.focus.y + dy });
  }

  setZoom(zoom: 0.6 | 1 | 1.5): void {
    this.zoom = zoom;
    this.lookAt(this.focus);
  }

  zoomStep(closer: boolean): void {
    const levels = [0.6, 1, 1.5] as const;
    const index = levels.indexOf(this.zoom);
    this.setZoom(levels[Math.max(0, Math.min(levels.length - 1, index + (closer ? 1 : -1)))]);
  }

  screenToWorld(point: Point): Point {
    const bounds = this.bounds;
    return { x: bounds.x + point.x / this.zoom, y: bounds.y + point.y / this.zoom };
  }

  worldToScreen(point: Point): Point {
    const bounds = this.bounds;
    return { x: (point.x - bounds.x) * this.zoom, y: (point.y - bounds.y) * this.zoom };
  }
}
