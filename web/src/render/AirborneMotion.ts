import type { Entity } from '../game/types';
import { UNIT_METRICS } from '../game/UnitMetrics';

const clamp = (v: number) => Math.max(0, Math.min(1, v));
export const LANDING_SECONDS = .18;
const smooth = (value: number) => { const t = clamp(value); return t * t * (3 - 2 * t); };
function flight(start: number, until: number, now: number) {
 const age = now - start, duration = until - start;
 const rise = Math.min(.16, duration * .3), fall = Math.min(.58, duration * .62);
 const up = clamp(age / Math.max(.001, rise)), down = clamp((now - (until - fall)) / Math.max(.001, fall));
 const launch = Math.sin(up * Math.PI) * (age < rise ? 1 : 0), arch = Math.sin(clamp(age / Math.max(.001, duration)) * Math.PI);
 const apex = age < rise ? 1 - (1 - up) ** 3 : 1 + .035 * Math.sin(clamp((age - rise) / Math.max(.001, duration - rise - fall)) * Math.PI);
 return { factor: apex * (1 - down * down), launch, arch, down };
}

/** Pure presentation: ground coordinates, control expiry and damage are never changed. */
export function airborneMotion(entity: Entity, now: number) {
 const until = entity.airborneUntil ?? 0, start = entity.airborneStartedAt;
 const base = { lift: 0, offset: 0, lean: 0, scaleX: 1, scaleY: 1, landing: false, active: false, airborne: false };
 if (entity.hp <= 0 || entity.kind === 'tower' || until <= 0) return base;
 const height = UNIT_METRICS[entity.kind].height * .4;
 // Legacy practice setups specify only an expiry and start already suspended.
 if (start === undefined) return { ...base, lift: Math.min(1, Math.max(0, until - now) / .18) * height, airborne: now < until };
 if (now < start || now >= until + LANDING_SECONDS) return base;
 if (now >= until) {
  const t = (now - until) / LANDING_SECONDS, squash = Math.sin(t * Math.PI) * Math.exp(-1.5 * t);
  return { ...base, active: true, landing: true, scaleX: 1 + .09 * squash, scaleY: 1 - .14 * squash };
 }
 const { factor, launch, arch, down } = flight(start, until, now), distance = entity.kind === 'hero' ? 4.5 : 2.3;
 let lift = height * factor, offset = distance * arch, lean = (.15 * launch + .065 * arch) * (1 - down);
 const hold = entity.airborneHold;
 if (hold && now >= hold.at) {
  const previous = flight(start, hold.fromUntil, hold.at), blend = smooth((now - hold.at) / .12);
  lift = height * (previous.factor + (1 - previous.factor) * blend) * (1 - down * down);
  offset = distance * previous.arch * (1 - blend);
  lean = (.15 * previous.launch + .065 * previous.arch) * (1 - previous.down) * (1 - blend);
 }
 return { lift, offset,
  lean, scaleX: 1 - .04 * launch, scaleY: 1 + .075 * launch,
  landing: false, active: true, airborne: true };
}
