import type { Point } from '../game/types';

/** Distinguish target clicks from map grabs in CSS pixels, independently of
 * render resolution and zoom. Camera movement uses the opposite screen delta. */
export class MapDrag {
  private state: { id: number; start: Point; last: Point; dragging: boolean; target: number | null } | null = null;
  constructor(readonly threshold = 6) {}
  get active(): boolean { return this.state !== null; }
  get dragging(): boolean { return this.state?.dragging ?? false; }
  begin(id: number, point: Point, target: number | null): void {
    this.state = { id, start: { ...point }, last: { ...point }, dragging: false, target };
  }
  move(id: number, point: Point): Point | null {
    const state = this.state; if (!state || id !== state.id) return null;
    if (!state.dragging && Math.hypot(point.x - state.start.x, point.y - state.start.y) < this.threshold) return null;
    const from = state.dragging ? state.last : state.start;
    state.dragging = true; state.last = { ...point };
    return { x: from.x - point.x, y: from.y - point.y };
  }
  end(id: number, point: Point): { pan: Point | null; click: boolean; target: number | null } | null {
    const state = this.state; if (!state || state.id !== id) return null;
    const pan = this.move(id, point), result = { pan, click: !state.dragging, target: state.target };
    this.state = null; return result;
  }
  cancel(): void { this.state = null; }
}
