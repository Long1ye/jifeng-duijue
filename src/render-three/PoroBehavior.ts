import { bridgePoint } from '../game/Bridge';
import type { Point } from '../game/types';

export const PORO_PLACEMENTS = [
  { id: 'sanctuary-sleeper', pose: 'sleep', u: -607, v: -119, width: 34, phase: 0, bounds: { minU: -616, maxU: -603, minV: -123, maxV: -114 } },
  { id: 'sanctuary-companion', pose: 'alert', u: -587, v: -111, width: 29, phase: 4.2, bounds: { minU: -591, maxU: -578, minV: -116, maxV: -106 } },
  { id: 'bridge-lookout', pose: 'curious', u: 26, v: -97, width: 28, phase: 9.1, bounds: { minU: 18, maxU: 35, minV: -99, maxV: -93 } },
  { id: 'blue-road-resident', pose: 'alert', u: -405, v: -70, width: 29, phase: 2.6, bounds: { minU: -414, maxU: -397, minV: -73, maxV: -65 } },
  { id: 'red-road-resident', pose: 'curious', u: 405, v: -62, width: 28, phase: 6.8, bounds: { minU: 397, maxU: 414, minV: -65, maxV: -57 } },
] as const;
export type PoroPlacement = typeof PORO_PLACEMENTS[number];
export const PORO_ATTENTION = { enter: 140, leave: 175, speed: 9 } as const;
const route = [[.08, .5], [.92, .65], [.65, .15], [.22, .85], [.5, .45]] as const;

/** Each segment stays in a convex, authored shoulder enclosure. Heroes affect
 * attention only, never the destination, so residents cannot be lured away. */
export class PoroBehavior {
  u: number;
  v: number;
  moving = false;
  attention = false;
  facing: Point = { x: 1, y: 1 };
  gesture: 'none' | 'sniff' | 'shake' | 'hop' = 'none';
  gestureProgress = 0;
  private idleAge = 0;
  private target: { u: number; v: number } | null = null;
  private wait = 0;
  private step = 0;
  private lastTime: number | null = null;
  constructor(readonly home: PoroPlacement) { this.u = home.u; this.v = home.v; this.reset(); }
  private reset(): void {
    this.u = this.home.u; this.v = this.home.v; this.moving = this.attention = false;
    this.target = null; this.step = Math.floor(this.home.phase) % route.length;
    this.wait = 1.5 + this.home.phase % 2.5; this.facing = { x: 1, y: 1 };
    this.idleAge = 0; this.gesture = 'none'; this.gestureProgress = 0;
  }
  update(time: number, heroes: readonly Point[]): void {
    if (this.lastTime === null || time < this.lastTime) this.reset();
    const dt = this.lastTime === null || time < this.lastTime ? 0 : Math.min(.1, time - this.lastTime);
    this.lastTime = time;
    const point = bridgePoint(this.u, this.v);
    let closest: Point | undefined, distance = Infinity;
    for (const hero of heroes) {
      const d = Math.hypot(hero.x - point.x, hero.y - point.y);
      if (d < distance) { closest = hero; distance = d; }
    }
    this.attention = !!closest && distance < (this.attention ? PORO_ATTENTION.leave : PORO_ATTENTION.enter);
    if (this.attention && closest) {
      this.moving = false;
      this.gesture = 'none';
      // Preserve the last facing when a hero stands exactly on the same point.
      if (distance > 2) this.facing = { x: closest.x - point.x, y: closest.y - point.y };
      return;
    }
    if (!dt) return;
    this.moving = false;
    if (!this.target) {
      this.wait -= dt;
      this.idleAge += dt;
      this.gesture = 'none';
      if (this.wait > 0) {
        const age = this.idleAge - .4;
        if (age >= 0 && age < .95) {
          this.gesture = (['sniff', 'shake', 'hop'] as const)[(this.step + Math.floor(this.home.phase)) % 3];
          this.gestureProgress = age / .95;
        }
        return;
      }
      this.gesture = 'none';
      const [a, b] = route[this.step++ % route.length], bounds = this.home.bounds;
      this.target = { u: bounds.minU + (bounds.maxU - bounds.minU) * a, v: bounds.minV + (bounds.maxV - bounds.minV) * b };
    }
    const destination = bridgePoint(this.target.u, this.target.v);
    const dx = destination.x - point.x, dy = destination.y - point.y, distanceToTarget = Math.hypot(dx, dy);
    const ratio = Math.min(1, PORO_ATTENTION.speed * dt / Math.max(.0001, distanceToTarget));
    this.u += (this.target.u - this.u) * ratio; this.v += (this.target.v - this.v) * ratio;
    this.moving = distanceToTarget > .05;
    if (this.moving) this.facing = { x: dx, y: dy };
    if (ratio === 1) { this.target = null; this.wait = 2.5 + this.step % 3 * .8; this.idleAge = 0; }
  }
}

/** Front-facing presentation only: movement towards the far wall must never
 * select a back view. Keep the left/right facing near the vertical screen axis. */
export function poroDirection(screenAngle: number, previous = 0): number {
  const x = Math.cos(screenAngle);
  const left = Math.abs(x) < .12 ? previous % 2 === 1 : x < 0;
  return Number(left);
}
