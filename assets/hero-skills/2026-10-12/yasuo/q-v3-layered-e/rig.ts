/** One east-facing proof. Native art is retained; only runtime joints move. */
export interface Point { x: number; y: number }
export const RIG = {
  foot: { x: 36, y: 91 }, shoulder: { x: 44, y: 42 },
  upper: { mount: { x: 14, y: 13 }, end: { x: 40, y: 14 } },
  lower: { mount: { x: 4, y: 10 }, end: { x: 35, y: 10 } },
  sword: { grip: { x: 18, y: 9 }, tip: { x: 103, y: 9 } },
  duration: 400, repeatPeriod: 1200,
} as const;
export const UPPER_LENGTH = Math.hypot(RIG.upper.end.x - RIG.upper.mount.x, RIG.upper.end.y - RIG.upper.mount.y);
export const LOWER_LENGTH = Math.hypot(RIG.lower.end.x - RIG.lower.mount.x, RIG.lower.end.y - RIG.lower.mount.y);

export function solveArm(shoulder: Point, target: Point): { elbow: Point; wrist: Point } {
  if (![shoulder.x, shoulder.y, target.x, target.y].every(Number.isFinite)) throw new RangeError('Invalid joint');
  const dx = target.x - shoulder.x, dy = target.y - shoulder.y;
  const requested = Math.hypot(dx, dy);
  const reach = Math.min(UPPER_LENGTH + LOWER_LENGTH - 0.01, Math.max(Math.abs(UPPER_LENGTH - LOWER_LENGTH) + 0.01, requested));
  const angle = requested === 0 ? 0 : Math.atan2(dy, dx);
  const cos = (UPPER_LENGTH ** 2 + reach ** 2 - LOWER_LENGTH ** 2) / (2 * UPPER_LENGTH * reach);
  // The east-facing elbow bends down; it never switches branches mid-cast.
  const upperAngle = angle + Math.acos(Math.max(-1, Math.min(1, cos)));
  return {
    elbow: { x: shoulder.x + Math.cos(upperAngle) * UPPER_LENGTH, y: shoulder.y + Math.sin(upperAngle) * UPPER_LENGTH },
    wrist: { x: shoulder.x + Math.cos(angle) * reach, y: shoulder.y + Math.sin(angle) * reach },
  };
}

function smooth(t: number): number { return t * t * (3 - 2 * t); }
function mix(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

export function sampleThrust(milliseconds: number, repeat = false) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid Q time');
  const t = repeat ? milliseconds % RIG.repeatPeriod : Math.min(milliseconds, RIG.duration);
  const ready = { x: RIG.shoulder.x + 20, y: RIG.shoulder.y + 17 };
  const pulled = { x: RIG.shoulder.x + 16, y: RIG.shoulder.y };
  const extended = { x: RIG.shoulder.x + 55, y: RIG.shoulder.y };
  let wrist: Point, phase: 'prepare' | 'thrust' | 'impact' | 'recover' | 'ready';
  if (t < 90) { wrist = mix(ready, pulled, smooth(t / 90)); phase = 'prepare'; }
  else if (t < 150) { wrist = mix(pulled, extended, 1 - (1 - (t - 90) / 60) ** 3); phase = 'thrust'; }
  else if (t < 190) { wrist = extended; phase = 'impact'; }
  else if (t < 400) { wrist = mix(extended, ready, smooth((t - 190) / 210)); phase = 'recover'; }
  else { wrist = ready; phase = 'ready'; }
  const joints = solveArm(RIG.shoulder, wrist);
  return {
    ...joints, shoulder: RIG.shoulder, foot: RIG.foot, phase, castTime: Math.min(t, RIG.duration),
    swordAngle: 0, active: t < RIG.duration,
    tip: { x: joints.wrist.x + RIG.sword.tip.x - RIG.sword.grip.x, y: joints.wrist.y },
  };
}

export function partAngle(start: Point, end: Point, nativeStart: Point, nativeEnd: Point): number {
  return Math.atan2(end.y - start.y, end.x - start.x) - Math.atan2(nativeEnd.y - nativeStart.y, nativeEnd.x - nativeStart.x);
}
