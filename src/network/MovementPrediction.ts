import { HOWLING_MAP, WORLD } from '../game/config';
import { clearBridgeFootprints } from '../game/BridgeInteraction';
import { clampPoint, distance } from '../game/geometry';
import { updateHomeguard } from '../game/Homeguard';
import { walkUnit } from '../game/Walk';
import type { Entity, Point, Team } from '../game/types';
import type { PrototypeCommand } from '../presentation/PrototypeHost';
import type { MatchState } from './protocol';

const MAX_AHEAD_MS = 250;
interface Input { seq: number; at: number; command: PrototypeCommand }

function locked(hero: Entity, time: number): boolean {
  return hero.hp <= 0 || (hero.airborneUntil ?? 0) > time || (hero.flinchUntil ?? 0) > time
    || !!(hero.eCast || hero.rCast || hero.qCast || hero.q3Cast || hero.wCast || hero.eqCast);
}

/** Predict local navigation, not a second Match simulation. Authoritative snapshots stay immutable. */
export class MovementPrediction {
  private base: { hero: Entity; time: number; receivedAt: number; upstreamMs: number } | null = null;
  private inputs: Input[] = [];
  private shown: Point | null = null;
  private correction = { x: 0, y: 0 };
  private reconcile = false;
  private lastSample = 0;
  private suspended = false;
  private overflowUntil = 0;
  get pendingCount(): number { return this.inputs.length; }

  reset(): void {
    this.base = null; this.inputs = []; this.shown = null; this.correction = { x: 0, y: 0 };
    this.reconcile = false; this.lastSample = 0; this.suspended = false; this.overflowUntil = 0;
  }

  receive(state: MatchState, team: Team, ack: number, now: number, rttMs: number): void {
    const hero = state.entities.find(e => e.kind === 'hero' && e.team === team);
    if (!hero || state.phase !== 'playing') { this.reset(); return; }
    const previous = this.base;
    const hard = !previous || distance(previous.hero, hero) > 32 || locked(hero, state.time)
      || !!previous && locked(previous.hero, previous.time);
    this.base = { hero: structuredClone(hero), time: state.time, receivedAt: now,
      upstreamMs: Math.max(0, Math.min(150, Number.isFinite(rttMs) ? rttMs / 2 : 0)) };
    this.inputs = this.inputs.filter(input => input.seq > ack);
    this.suspended = ack < this.overflowUntil;
    if (!this.suspended) this.overflowUntil = 0;
    this.reconcile = !hard;
    if (hard) { this.shown = null; this.correction = { x: 0, y: 0 }; }
  }

  command(seq: number, command: PrototypeCommand, now: number): void {
    if (!this.base) return;
    if (this.suspended || this.inputs.length >= 128) {
      this.inputs = []; this.suspended = true; this.overflowUntil = seq; return;
    }
    this.inputs.push({ seq, command: structuredClone(command), at: now });
  }

  sample(now: number): Entity | null {
    const base = this.base;
    if (!base) return null;
    const hero = structuredClone(base.hero);
    if (this.suspended || locked(hero, base.time)) return null;
    const age = Math.max(0, now - base.receivedAt);
    const start = base.receivedAt - base.upstreamMs;
    const end = Math.min(now, base.receivedAt + MAX_AHEAD_MS);
    let cursor = start, blocked = false;
    const advance = (until: number) => {
      while (cursor < until - .001) {
        const dt = Math.min(WORLD.step, (until - cursor) / 1000);
        const time = base.time + (cursor - start) / 1000 + dt;
        if (!blocked && hero.destination && hero.targetId === null) {
          updateHomeguard(hero, time); walkUnit(hero, hero.destination, dt, time);
        }
        cursor += dt * 1000;
      }
    };
    for (const input of this.inputs) {
      if (input.at > end) break;
      advance(Math.max(start, input.at));
      if (input.command.kind === 'move' || input.command.kind === 'stop') {
        if (blocked) continue;
        hero.targetId = null; hero.attackTargetId = null; hero.windup = 0;
        hero.attackStartedAt = null; hero.attackReleasedAt = null; hero.fluteAt = null; hero.emote = null;
        const point = input.command.kind === 'move' ? clampPoint(input.command.point) : null;
        hero.destination = point && (HOWLING_MAP ? clampPoint(clearBridgeFootprints(point, hero.radius, hero.id)) : point);
      } else blocked = true; // Unknown skill/attack outcome: wait for authority.
    }
    advance(end);
    if (blocked || hero.targetId !== null) { this.shown = null; this.correction = { x: 0, y: 0 }; return null; }
    const dt = Math.max(0, Math.min(.1, (now - this.lastSample) / 1000)); this.lastSample = now;
    if (this.reconcile && this.shown) {
      this.correction = { x: this.shown.x - hero.x, y: this.shown.y - hero.y };
      if (Math.hypot(this.correction.x, this.correction.y) > 8) this.correction = { x: 0, y: 0 };
    }
    this.reconcile = false;
    const decay = Math.exp(-dt / .06);
    this.correction.x *= decay; this.correction.y *= decay;
    // No speculative motion continues indefinitely through a disconnected link.
    if (age > MAX_AHEAD_MS) this.correction = { x: 0, y: 0 };
    const placed = clampPoint({ x: hero.x + this.correction.x, y: hero.y + this.correction.y }, hero.radius);
    Object.assign(hero, HOWLING_MAP ? clampPoint(clearBridgeFootprints(placed, hero.radius, hero.id)) : placed);
    this.shown = { x: hero.x, y: hero.y };
    return hero;
  }
}
