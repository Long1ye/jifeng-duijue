import { RIG as BASE, UPPER_LENGTH, LOWER_LENGTH, windRibbon, partAngle } from '../q-v5-small-grip-wind-e/rig';
export { partAngle, windRibbon, UPPER_LENGTH, LOWER_LENGTH };
export type Point = { x: number; y: number };
export const DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export type Direction = typeof DIRECTIONS[number];
export const LABELS: Record<Direction, string> = { e: '正右', se: '右下', s: '正下', sw: '左下', w: '正左', nw: '左上', n: '正上 · 缺失', ne: '右上' };
export interface BodyRig {
  width: number; height: number; foot: Point; shoulder: Point;
  scale: number; behindBody: boolean; bend: 1 | -1;
}
// Art is kept at native resolution. Scale retargets all bodies to the same 90px
// visible height as approved V5, instead of changing the hero size on turning.
export const BODIES: Record<Direction, BodyRig | null> = {
  e: { width: 69, height: 94, foot: { x: 36, y: 91 }, shoulder: { x: 44, y: 42 }, scale: 1, behindBody: false, bend: 1 },
  se: { width: 70, height: 108, foot: { x: 35, y: 105 }, shoulder: { x: 24, y: 52 }, scale: 90 / 104, behindBody: false, bend: 1 },
  s: { width: 53, height: 105, foot: { x: 27, y: 102 }, shoulder: { x: 12, y: 49 }, scale: 90 / 101, behindBody: false, bend: 1 },
  sw: { width: 68, height: 107, foot: { x: 34, y: 104 }, shoulder: { x: 20, y: 51 }, scale: 90 / 103, behindBody: false, bend: -1 },
  w: { width: 57, height: 107, foot: { x: 28, y: 104 }, shoulder: { x: 32, y: 51 }, scale: 90 / 103, behindBody: true, bend: -1 },
  nw: { width: 67, height: 106, foot: { x: 34, y: 103 }, shoulder: { x: 24, y: 52 }, scale: 90 / 102, behindBody: true, bend: -1 },
  n: null,
  ne: { width: 66, height: 107, foot: { x: 33, y: 104 }, shoulder: { x: 18, y: 53 }, scale: 90 / 103, behindBody: true, bend: 1 },
};
export const RIG = { ...BASE, foot: { x: 0, y: 0 }, bodyVisibleHeight: 90 } as const;
export class MissingDirectionError extends Error {
  constructor() { super('正上 Q 素材缺失，未补交生成；不会用其他方向代替。'); }
}
export function normalizeAngle(angle: number): number {
  if (!Number.isFinite(angle)) throw new RangeError('Invalid Q heading');
  return (angle % 360 + 360) % 360;
}
export function directionForAngle(angle: number): Direction { return DIRECTIONS[Math.floor((normalizeAngle(angle) + 22.5) / 45) % 8]; }
export function headingForDirection(direction: Direction): number { return DIRECTIONS.indexOf(direction) * 45; }
export function solveDirectionalArm(shoulder: Point, target: Point, bend: 1 | -1) {
  if (![shoulder.x, shoulder.y, target.x, target.y].every(Number.isFinite)) throw new RangeError('Invalid joint');
  const dx = target.x - shoulder.x, dy = target.y - shoulder.y;
  const reach = Math.min(UPPER_LENGTH + LOWER_LENGTH - 0.01, Math.max(Math.abs(UPPER_LENGTH - LOWER_LENGTH) + 0.01, Math.hypot(dx, dy)));
  const angle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
  const cosine = (UPPER_LENGTH ** 2 + reach ** 2 - LOWER_LENGTH ** 2) / (2 * UPPER_LENGTH * reach);
  const upperAngle = angle + bend * Math.acos(Math.max(-1, Math.min(1, cosine)));
  return { elbow: { x: shoulder.x + Math.cos(upperAngle) * UPPER_LENGTH, y: shoulder.y + Math.sin(upperAngle) * UPPER_LENGTH },
           wrist: { x: shoulder.x + Math.cos(angle) * reach, y: shoulder.y + Math.sin(angle) * reach } };
}
const smooth = (t: number): number => t * t * (3 - 2 * t);
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

/** Body orientation is quantized; hand, blade and wind follow the precise aim. */
export function sampleAimedThrust(angleDegrees: number, milliseconds: number, repeat = false) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid Q time');
  const angle = normalizeAngle(angleDegrees), direction = directionForAngle(angle), body = BODIES[direction];
  if (!body) throw new MissingDirectionError();
  const radians = angle * Math.PI / 180, forward = { x: Math.cos(radians), y: Math.sin(radians) };
  const side = { x: -forward.y * body.bend, y: forward.x * body.bend };
  const shoulder = { x: (body.shoulder.x - body.foot.x) * body.scale, y: (body.shoulder.y - body.foot.y) * body.scale };
  const swordScale = 1 - 0.28 * Math.abs(forward.y);
  const target = (along: number, across: number): Point => ({ x: shoulder.x + forward.x * along + side.x * across, y: shoulder.y + forward.y * along + side.y * across });
  const ready = target(15, 15), pulled = target(11, 1), extended = target(40 * swordScale, 1);
  const t = repeat ? milliseconds % RIG.repeatPeriod : Math.min(milliseconds, RIG.duration);
  let wrist: Point, wind: number, phase: 'prepare' | 'thrust' | 'impact' | 'recover' | 'ready';
  if (t < 120) { wrist = mix(ready, pulled, smooth(t / 120)); wind = smooth(t / 120); phase = 'prepare'; }
  else if (t < 190) { wrist = mix(pulled, extended, 1 - (1 - (t - 120) / 70) ** 3); wind = 1; phase = 'thrust'; }
  else if (t < 240) { wrist = extended; wind = 1; phase = 'impact'; }
  else if (t < 480) { wrist = mix(extended, ready, smooth((t - 240) / 240)); wind = 1 - smooth((t - 240) / 240); phase = 'recover'; }
  else { wrist = ready; wind = 0; phase = 'ready'; }
  const joints = solveDirectionalArm(shoulder, wrist, body.bend);
  const tipLength = (RIG.sword.tip.x - RIG.sword.grip.x) * swordScale;
  return { ...joints, shoulder, foot: RIG.foot, angle, radians, direction, body, forward, swordScale, wind, phase,
    castTime: Math.min(t, RIG.duration), active: t < RIG.duration,
    tip: { x: joints.wrist.x + forward.x * tipLength, y: joints.wrist.y + forward.y * tipLength } };
}
export function sampleDirectionalThrust(direction: Direction, milliseconds: number, repeat = false) { return sampleAimedThrust(headingForDirection(direction), milliseconds, repeat); }
export function bladePoint(pose: ReturnType<typeof sampleAimedThrust>, native: Point): Point {
  const along = (native.x - RIG.sword.grip.x) * pose.swordScale, across = native.y - RIG.sword.grip.y;
  return { x: pose.wrist.x + Math.cos(pose.radians) * along - Math.sin(pose.radians) * across,
           y: pose.wrist.y + Math.sin(pose.radians) * along + Math.cos(pose.radians) * across };
}
