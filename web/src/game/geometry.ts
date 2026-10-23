import { WORLD, HOWLING_MAP } from './config';
import {clampBridge} from './Bridge';
import type { Point } from './types';

export function distance(a: Point, b: Point): number { return Math.hypot(a.x - b.x, a.y - b.y); }
export function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, value)); }
export function clampPoint(p: Point, margin = 8): Point {
  if(HOWLING_MAP)return clampBridge(p,margin);
  return { x: clamp(p.x, margin, WORLD.width - margin), y: clamp(p.y, margin, WORLD.height - margin) };
}
export function direction(a: Point, b: Point): Point {
  const length = distance(a, b);
  return length > 0 ? { x: (b.x - a.x) / length, y: (b.y - a.y) / length } : { x: 1, y: 0 };
}
export function moveTowards(p: Point, target: Point, amount: number): void {
  const length = distance(p, target);
  if (length <= amount) { p.x = target.x; p.y = target.y; return; }
  const dir = direction(p, target);
  p.x += dir.x * amount;
  p.y += dir.y * amount;
}
export function segmentDistance(p: Point, start: Point, end: Point): number {
  const dx = end.x - start.x, dy = end.y - start.y;
  const denominator = dx * dx + dy * dy;
  const t = denominator === 0 ? 0 : clamp(((p.x - start.x) * dx + (p.y - start.y) * dy) / denominator, 0, 1);
  return distance(p, { x: start.x + dx * t, y: start.y + dy * t });
}
