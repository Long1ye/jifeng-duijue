import { partAngle, type Point } from '../q-v3-layered-e/rig';
export { partAngle };
export type { Point };

export const RIG = {
  foot: { x: 36, y: 91 }, shoulder: { x: 44, y: 42 },
  upper: { mount: { x: 14, y: 13 }, end: { x: 40, y: 14 } },
  lower: { mount: { x: 4, y: 15 }, end: { x: 32, y: 15 }, width: 49, height: 25 },
  sword: { width: 112, height: 18, axisY: 10 },
  duration: 480, repeatPeriod: 1400, minimumGap: 15,
} as const;
export const UPPER_LENGTH = Math.hypot(26, 1), LOWER_LENGTH = 28;

const smooth = (t: number) => t * t * (3 - 2 * t);
function mix(a: Point, b: Point, t: number): Point { return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; }

function solveArm(target: Point) {
  const dx = target.x - RIG.shoulder.x, dy = target.y - RIG.shoulder.y;
  const reach = Math.hypot(dx, dy);
  const cos = (UPPER_LENGTH ** 2 + reach ** 2 - LOWER_LENGTH ** 2) / (2 * UPPER_LENGTH * reach);
  const angle = Math.atan2(dy, dx) + Math.acos(Math.max(-1, Math.min(1, cos)));
  return { elbow: { x: RIG.shoulder.x + Math.cos(angle) * UPPER_LENGTH, y: RIG.shoulder.y + Math.sin(angle) * UPPER_LENGTH }, wrist: target };
}

export function transformedBounds(start: Point, mount: Point, angle: number, width: number, height: number) {
  const points = [[0, 0], [width, 0], [0, height], [width, height]].map(([x, y]) => ({
    x: start.x + (x - mount.x) * Math.cos(angle) - (y - mount.y) * Math.sin(angle),
    y: start.y + (x - mount.x) * Math.sin(angle) + (y - mount.y) * Math.cos(angle),
  }));
  return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)),
    top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) };
}

export function sampleWindCast(milliseconds: number, repeat = false) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid casting time');
  const t = repeat ? milliseconds % RIG.repeatPeriod : Math.min(milliseconds, RIG.duration);
  const ready = { x: 64, y: 59 }, gathered = { x: 60, y: 44 }, pushed = { x: 79, y: 44 };
  let wrist: Point, opacity: number, launch: number;
  let phase: 'gather' | 'release' | 'impact' | 'recover' | 'ready';
  if (t < 120) {
    const p = smooth(t / 120); wrist = mix(ready, gathered, p); opacity = p; launch = 0; phase = 'gather';
  } else if (t < 190) {
    const p = 1 - (1 - (t - 120) / 70) ** 3;
    wrist = mix(gathered, pushed, p); opacity = 1; launch = p; phase = 'release';
  } else if (t < 240) { wrist = pushed; opacity = 1; launch = 1; phase = 'impact'; }
  else if (t < 480) {
    const p = smooth((t - 240) / 240);
    wrist = mix(pushed, ready, p); opacity = 1 - p; launch = 1 - p; phase = 'recover';
  } else { wrist = ready; opacity = 0; launch = 0; phase = 'ready'; }
  const joints = solveArm(wrist);
  const lowerAngle = partAngle(joints.elbow, wrist, RIG.lower.mount, RIG.lower.end);
  const handBounds = transformedBounds(joints.elbow, RIG.lower.mount, lowerAngle, RIG.lower.width, RIG.lower.height);
  // Entire hand/forearm rectangle stays apart from the entire sword rectangle.
  // This is more conservative than checking just the fingertip and metal hilt.
  const sword = { x: Math.max(92 + launch * 22, handBounds.right + RIG.minimumGap), y: 48 };
  return { ...joints, shoulder: RIG.shoulder, foot: RIG.foot, lowerAngle, handBounds, sword,
    gap: sword.x - handBounds.right, opacity, launch, phase, active: t < RIG.duration,
    castTime: Math.min(t, RIG.duration), swordAngle: 0 };
}
