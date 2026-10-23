import type { Entity, GameEvent, Point } from '../game/types';
import type { EventBatch, MatchState } from './protocol';

export const INTERPOLATION_SECONDS = .08;
interface Snapshot { state: MatchState; receivedAt: number }
export interface BufferedFrame { state: MatchState; events: GameEvent[] }

function interpolate<T extends Point & { id: number }>(previous: T[], next: T[], alpha: number): T[] {
  if (alpha <= 0 || previous === next) return previous;
  const targets = new Map(next.map(entity => [entity.id, entity]));
  return previous.map(entity => {
    const target = targets.get(entity.id);
    // Flash/R and discontinuous corrections must not travel through walls.
    if (!target || Math.hypot(target.x - entity.x, target.y - entity.y) > 32) return entity;
    return { ...entity, x: entity.x + (target.x - entity.x) * alpha, y: entity.y + (target.y - entity.y) * alpha };
  });
}

/** A continuous render clock, independent of packet arrival boundaries.
 * A bounded adaptive history absorbs delivery jitter; no remote extrapolation. */
export class SnapshotBuffer {
  private snapshots: Snapshot[] = [];
  private pending: { at: number; events: readonly GameEvent[] }[] = [];
  private clockOffset = 0;
  private renderTime = 0;
  private lastSampleAt = 0;
  private lastOutputTime = 0;
  private interval = 50;
  private delay = INTERPOLATION_SECONDS;
  private lateness: number[] = [];
  private lastEventId = 0;
  get snapshotAgeMs(): number { return this.snapshots.length ? Math.max(0, performance.now() - this.snapshots.at(-1)!.receivedAt) : 0; }
  get intervalMs(): number { return this.interval; }
  get interpolationMs(): number { return this.delay * 1000; }
  reset(): void {
    this.snapshots = []; this.pending = []; this.lastSampleAt = 0; this.lastOutputTime = 0; this.interval = 50;
    this.delay = INTERPOLATION_SECONDS; this.lateness = []; this.lastEventId = 0;
  }

  push(state: MatchState, events: readonly GameEvent[], now: number, batches?: readonly EventBatch[]): void {
    const latest = this.snapshots.at(-1);
    const resetClock = !latest || state.phase !== latest.state.phase || state.time < latest.state.time;
    if (resetClock) {
      if (latest && state.time < latest.state.time) { this.pending = []; this.lastEventId = 0; }
      this.snapshots = [];
      this.lateness = []; this.delay = INTERPOLATION_SECONDS;
      this.clockOffset = state.time - now / 1000;
      this.renderTime = state.time - (state.phase === 'playing' ? INTERPOLATION_SECONDS : 0);
      this.lastSampleAt = now; this.lastOutputTime = state.time;
    } else if (state.time > latest.state.time) {
      const elapsed = now - latest.receivedAt;
      this.interval += (Math.min(200, elapsed) - this.interval) * .1;
      // Fastest delivery estimates the server clock; late packets cannot rewind it.
      this.clockOffset = Math.max(this.clockOffset, state.time - now / 1000);
      this.lateness.push(Math.max(0, (this.clockOffset - state.time + now / 1000) * 1000));
      if (this.lateness.length > 100) this.lateness.shift();
      const sorted = [...this.lateness].sort((a, b) => a - b);
      const jitter = sorted[Math.floor((sorted.length - 1) * .95)] ?? 0;
      const desired = Math.max(.06, Math.min(.2, .075 + jitter / 1000));
      // Absorb jitter quickly; shrink cautiously to avoid alternating stalls and catch-up.
      this.delay += (desired - this.delay) * (desired > this.delay ? .35 : .02);
    }
    if (this.snapshots.at(-1)?.state.time === state.time) this.snapshots.pop();
    this.snapshots.push({ state, receivedAt: now });
    if (batches) {
      for (const batch of batches) if (batch.id > this.lastEventId) {
        this.lastEventId = batch.id;
        if (batch.events.length) this.pending.push({ at: batch.time, events: batch.events });
      }
    } else if (events.length) this.pending.push({ at: state.time, events });
    if (this.snapshots.length > 64) this.snapshots.splice(0, this.snapshots.length - 64);
    if (this.pending.length > 64) this.pending.splice(0, this.pending.length - 64);
  }

  sample(now: number): BufferedFrame | null {
    const latest = this.snapshots.at(-1);
    if (!latest) return null;
    if (latest.state.phase !== 'playing') {
      const events = this.pending.flatMap(batch => [...batch.events]); this.pending = [];
      return { state: latest.state, events };
    }
    const dt = Math.max(0, (now - this.lastSampleAt) / 1000); this.lastSampleAt = now;
    const target = now / 1000 + this.clockOffset - this.delay;
    // Correct clock drift gradually. Never restart interpolation for a new packet.
    if (dt > .25 || latest.state.time - this.renderTime > .5) {
      this.renderTime = target;
      this.pending = this.pending.filter(batch => batch.at >= target - .1);
    }
    else this.renderTime += dt * Math.max(.95, Math.min(1.05, 1 + (target - this.renderTime - dt) * 2));
    // A starved buffer must stop its internal clock too. Otherwise recovery jumps
    // straight to the hidden clock's future position when several packets arrive together.
    this.renderTime = Math.min(latest.state.time, this.renderTime);
    const time = Math.max(this.lastOutputTime, this.snapshots[0].state.time, Math.min(latest.state.time, this.renderTime));
    this.lastOutputTime = time;
    while (this.snapshots.length > 1 && this.snapshots[1].state.time <= time) this.snapshots.shift();
    const lower = this.snapshots[0].state, upper = this.snapshots[1]?.state ?? lower;
    const alpha = upper.time > lower.time ? Math.max(0, Math.min(1, (time - lower.time) / (upper.time - lower.time))) : 0;
    const events: GameEvent[] = [];
    while (this.pending.length && this.pending[0].at <= time + 1e-9) events.push(...this.pending.shift()!.events);
    return { state: { ...lower, time,
      entities: interpolate<Entity>(lower.entities, upper.entities, alpha),
      projectiles: interpolate(lower.projectiles, upper.projectiles, alpha),
    }, events };
  }
}
