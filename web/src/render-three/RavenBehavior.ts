import type { Point } from '../game/types';
import { bridgePoint } from '../game/Bridge';

export interface RavenPerch { u: number; v: number; height: number }

/** A small, deterministic flight between authored wall perches. No gameplay entity. */
export class RavenBehavior {
  u: number; v: number; height: number;
  state: 'perched' | 'takeoff' | 'flying' | 'landing' = 'perched';
  frame = 0;
  facing = 1;
  private lastTime: number | null = null;
  private elapsed = 0;
  private current = 0;
  private wait: number;
  private cooldown = 0;
  constructor(readonly perches: readonly [RavenPerch, RavenPerch], readonly phase: number) {
    this.u = perches[0].u; this.v = perches[0].v; this.height = perches[0].height; this.wait = 7 + phase;
  }
  update(time: number, visibleHeroes: readonly Point[]): void {
    if (this.lastTime === null || time < this.lastTime) {
      this.current = 0; this.state = 'perched'; this.elapsed = 0; this.wait = 7 + this.phase; this.cooldown = 0;
      Object.assign(this, this.perches[0]); this.frame = 0; this.facing = 1;
    }
    const dt = this.lastTime === null || time < this.lastTime ? 0 : Math.max(0, Math.min(.1, time - this.lastTime));
    this.lastTime = time;
    if (!dt) return;
    this.elapsed += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    if (this.state === 'perched') {
      this.wait -= dt;
      const point = bridgePoint(this.u, this.v);
      const startled = this.cooldown === 0 && visibleHeroes.some(h => Math.hypot(h.x - point.x, h.y - point.y) < 120);
      const idle = (this.elapsed + this.phase) % 7;
      this.frame = idle < 1.2 ? 1 : idle > 4 && idle < 5.2 ? 2 : 0;
      if (startled || this.wait <= 0) { this.state = 'takeoff'; this.elapsed = 0; this.frame = 3; }
      return;
    }
    const from = this.perches[this.current], to = this.perches[1 - this.current];
    const a = bridgePoint(from.u, from.v), b = bridgePoint(to.u, to.v); this.facing = b.x >= a.x ? 1 : -1;
    if (this.state === 'takeoff') {
      this.frame = 3; this.height = from.height + 6 * Math.min(1, this.elapsed / .22);
      if (this.elapsed >= .22) { this.state = 'flying'; this.elapsed = 0; }
    } else if (this.state === 'flying') {
      const t = Math.min(1, this.elapsed / 3.8), smooth = t * t * (3 - 2 * t);
      this.u = from.u + (to.u - from.u) * smooth; this.v = from.v + (to.v - from.v) * smooth;
      this.height = from.height + (to.height - from.height) * t + Math.sin(Math.PI * t) * 45 + 6;
      this.frame = [4, 5, 6, 5][Math.floor(this.elapsed * 11) % 4];
      if (t === 1) { this.state = 'landing'; this.elapsed = 0; this.frame = 7; }
    } else {
      this.frame = 7; this.height = to.height + 6 * (1 - Math.min(1, this.elapsed / .3));
      if (this.elapsed >= .3) {
        this.current = 1 - this.current; Object.assign(this, to); this.state = 'perched'; this.elapsed = 0;
        this.wait = 10 + this.phase; this.cooldown = 4; this.frame = 0;
      }
    }
  }
}
