/** A smaller native arm, with the blade hilt physically attached to the fist. */
export { partAngle } from '../q-v3-layered-e/rig';
export interface Point { x: number; y: number }
export const RIG = {
  foot: { x: 36, y: 91 }, shoulder: { x: 44, y: 42 },
  upper: { mount: { x: 10, y: 9 }, end: { x: 28, y: 12 }, width: 35, height: 20 },
  lower: { mount: { x: 4, y: 8 }, end: { x: 27, y: 8 }, width: 34, height: 16 },
  sword: { grip: { x: 23, y: 11 }, tip: { x: 111, y: 11 }, bladeStart: 36, width: 114, height: 22 },
  duration: 480, repeatPeriod: 1400,
} as const;
export const UPPER_LENGTH = Math.hypot(RIG.upper.end.x - RIG.upper.mount.x, RIG.upper.end.y - RIG.upper.mount.y);
export const LOWER_LENGTH = RIG.lower.end.x - RIG.lower.mount.x;

export function solveArm(shoulder: Point, target: Point) {
  if (![shoulder.x, shoulder.y, target.x, target.y].every(Number.isFinite)) throw new RangeError('Invalid joint');
  const dx = target.x - shoulder.x, dy = target.y - shoulder.y;
  const requested = Math.hypot(dx, dy);
  const reach = Math.min(UPPER_LENGTH + LOWER_LENGTH - 0.01, Math.max(Math.abs(UPPER_LENGTH - LOWER_LENGTH) + 0.01, requested));
  const angle = requested === 0 ? 0 : Math.atan2(dy, dx);
  const cosine = (UPPER_LENGTH ** 2 + reach ** 2 - LOWER_LENGTH ** 2) / (2 * UPPER_LENGTH * reach);
  const upperAngle = angle + Math.acos(Math.max(-1, Math.min(1, cosine)));
  return {
    elbow: { x: shoulder.x + Math.cos(upperAngle) * UPPER_LENGTH, y: shoulder.y + Math.sin(upperAngle) * UPPER_LENGTH },
    wrist: { x: shoulder.x + Math.cos(angle) * reach, y: shoulder.y + Math.sin(angle) * reach },
  };
}
function smooth(t: number): number { return t * t * (3 - 2 * t); }
function mix(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

export function sampleGripThrust(milliseconds: number, repeat = false) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid Q time');
  const t = repeat ? milliseconds % RIG.repeatPeriod : Math.min(milliseconds, RIG.duration);
  const ready = { x: RIG.shoulder.x + 15, y: RIG.shoulder.y + 15 };
  const pulled = { x: RIG.shoulder.x + 11, y: RIG.shoulder.y + 1 };
  const extended = { x: RIG.shoulder.x + 40, y: RIG.shoulder.y + 1 };
  let target: Point, wind: number, phase: 'prepare' | 'thrust' | 'impact' | 'recover' | 'ready';
  if (t < 120) { target = mix(ready, pulled, smooth(t / 120)); wind = smooth(t / 120); phase = 'prepare'; }
  else if (t < 190) { target = mix(pulled, extended, 1 - (1 - (t - 120) / 70) ** 3); wind = 1; phase = 'thrust'; }
  else if (t < 240) { target = extended; wind = 1; phase = 'impact'; }
  else if (t < 480) { target = mix(extended, ready, smooth((t - 240) / 240)); wind = 1 - smooth((t - 240) / 240); phase = 'recover'; }
  else { target = ready; wind = 0; phase = 'ready'; }
  const joints = solveArm(RIG.shoulder, target);
  return {
    ...joints, shoulder: RIG.shoulder, foot: RIG.foot, phase, wind, castTime: Math.min(t, RIG.duration),
    swordAngle: 0, swordOrigin: { x: joints.wrist.x - RIG.sword.grip.x, y: joints.wrist.y - RIG.sword.grip.y },
    tip: { x: joints.wrist.x + RIG.sword.tip.x - RIG.sword.grip.x, y: joints.wrist.y },
    active: t < RIG.duration,
  };
}

/** Two narrow wind strands wrap in alternating front/back halves around the blade. */
export function windRibbon(milliseconds: number, strand: 0 | 1) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid wind time');
  const points: { x: number; y: number; front: boolean }[] = [];
  for (let x = RIG.sword.bladeStart; x <= RIG.sword.tip.x; x++) {
    const phase = (x - RIG.sword.bladeStart) / 12 - milliseconds / 65 + strand * Math.PI;
    const taper = Math.min(1, (x - RIG.sword.bladeStart + 2) / 10, (RIG.sword.tip.x - x + 2) / 10);
    points.push({ x, y: RIG.sword.grip.y + Math.round(Math.sin(phase) * 5 * taper), front: Math.cos(phase) >= 0 });
  }
  return points;
}
