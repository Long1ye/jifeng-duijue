import { directionForAngle, headingForDirection, normalizeAngle, DIRECTIONS, type Direction, type Point } from '../q-v6-eight-directions/rig';
import { partAngle, windRibbon, RIG as V5 } from '../q-v5-small-grip-wind-e/rig';
export { directionForAngle, headingForDirection, normalizeAngle, DIRECTIONS, partAngle, windRibbon };
export type { Direction, Point };
export const LABELS: Record<Direction, string> = { e: '正右', se: '右下', s: '正下', sw: '左下', w: '正左', nw: '左上', n: '正上', ne: '右上' };
export interface BodyBinding {
  foot: Point; waist: Point; shoulder: Point; ready: Point;
  visibleHeight: number; behind: boolean; bend: 1 | -1;
  pulled?: Point;
  extended?: Point;
  elbowBend?: 1 | -1;
  upperInFront?: boolean;
}
// These bindings are measured on the user's prepared 128px textures, not v6 bodies.
export const BINDINGS: Record<Direction, BodyBinding> = {
  e: { foot: { x: 77, y: 121 }, waist: { x: 81, y: 80 }, shoulder: { x: 96, y: 57 }, ready: { x: 7, y: 17 }, visibleHeight: 116, behind: false, bend: 1 },
  se: { foot: { x: 73, y: 120 }, waist: { x: 77, y: 80 }, shoulder: { x: 88, y: 58 }, ready: { x: 5, y: 17 }, visibleHeight: 115, behind: false, bend: 1 },
  s: { foot: { x: 67, y: 121 }, waist: { x: 64, y: 81 }, shoulder: { x: 82, y: 56 }, ready: { x: 3, y: 17 }, visibleHeight: 116, behind: false, bend: 1 },
  sw: { foot: { x: 58, y: 120 }, waist: { x: 51, y: 80 }, shoulder: { x: 40, y: 58 }, ready: { x: -5, y: 17 }, visibleHeight: 115, behind: false, bend: -1 },
  w: { foot: { x: 50, y: 121 }, waist: { x: 46, y: 80 }, shoulder: { x: 32, y: 57 }, ready: { x: -7, y: 17 }, visibleHeight: 116, behind: false, bend: -1 },
  nw: { foot: { x: 53, y: 120 }, waist: { x: 53, y: 80 }, shoulder: { x: 67, y: 56 }, ready: { x: -6, y: 17 }, visibleHeight: 115, behind: true, bend: -1 },
  n: { foot: { x: 59, y: 121 }, waist: { x: 58, y: 80 }, shoulder: { x: 74, y: 56 }, ready: { x: 6, y: 17 }, visibleHeight: 116, behind: true, bend: 1 },
  ne: { foot: { x: 74, y: 120 }, waist: { x: 75, y: 80 }, shoulder: { x: 60, y: 56 }, ready: { x: 6, y: 17 }, visibleHeight: 115, behind: true, bend: 1 },
};
export const RIG = {
  duration: 480, repeatPeriod: 1400, visibleBodyHeight: 90,
  // Use only the bare-skin end of the old upper arm; no detached blue sleeve.
  upper: { source: { x: 17, y: 6, width: 16, height: 12 }, mount: { x: 0, y: 6 }, end: { x: 14, y: 7 } },
  lower: V5.lower, sword: V5.sword,
} as const;
export const UPPER_LENGTH = 18, LOWER_LENGTH = 21;
const smooth = (t: number): number => t * t * (3 - 2 * t);
const mix = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function bodyDrive(milliseconds: number) {
  const t = Math.min(milliseconds, RIG.duration);
  let lean: number;
  if (t < 110) lean = -0.38 * smooth(t / 110);
  else if (t < 195) lean = -0.38 + 1.38 * (1 - (1 - (t - 110) / 85) ** 3);
  else if (t < 240) lean = 1 - 0.1 * smooth((t - 195) / 45);
  else lean = 0.9 * (1 - smooth((t - 240) / 240));
  return { lean, settle: t < 120 ? Math.sin(Math.PI * t / 120) * 0.35 : 0 };
}
export interface TorsoTransform { waist: Point; shearX: number; shearY: number }
export function transformTorso(point: Point, transform: TorsoTransform): Point {
  const distanceFromWaist = point.y - transform.waist.y;
  return { x: point.x + transform.shearX * distanceFromWaist, y: point.y + transform.shearY * distanceFromWaist };
}
export function solveArm(shoulder: Point, target: Point, bend: 1 | -1) {
  const dx = target.x - shoulder.x, dy = target.y - shoulder.y;
  const reach = Math.min(UPPER_LENGTH + LOWER_LENGTH - 0.01, Math.max(LOWER_LENGTH - UPPER_LENGTH + 0.01, Math.hypot(dx, dy)));
  const angle = dx === 0 && dy === 0 ? 0 : Math.atan2(dy, dx);
  const cosine = (UPPER_LENGTH ** 2 + reach ** 2 - LOWER_LENGTH ** 2) / (2 * UPPER_LENGTH * reach);
  const upperAngle = angle + bend * Math.acos(Math.max(-1, Math.min(1, cosine)));
  return { elbow: { x: shoulder.x + Math.cos(upperAngle) * UPPER_LENGTH, y: shoulder.y + Math.sin(upperAngle) * UPPER_LENGTH },
    wrist: { x: shoulder.x + Math.cos(angle) * reach, y: shoulder.y + Math.sin(angle) * reach } };
}
/** The shoulder is derived from the same torso transform used to render the body. */
export function sampleLinkedThrust(angleDegrees: number, milliseconds: number, linked = true, repeat = false, bindings: Record<Direction, BodyBinding> = BINDINGS) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid Q time');
  const angle = normalizeAngle(angleDegrees), direction = directionForAngle(angle), binding = bindings[direction];
  const radians = angle * Math.PI / 180, forward = { x: Math.cos(radians), y: Math.sin(radians) };
  const side = { x: -forward.y * binding.bend, y: forward.x * binding.bend };
  const scale = RIG.visibleBodyHeight / binding.visibleHeight;
  const nativeToWorld = (point: Point): Point => ({ x: (point.x - binding.foot.x) * scale, y: (point.y - binding.foot.y) * scale });
  const waist = nativeToWorld(binding.waist), restShoulder = nativeToWorld(binding.shoulder);
  const t = repeat ? milliseconds % RIG.repeatPeriod : Math.min(milliseconds, RIG.duration);
  const drive = linked ? bodyDrive(Math.min(t, RIG.duration)) : { lean: 0, settle: 0 };
  const lever = waist.y - restShoulder.y;
  const torso: TorsoTransform = { waist, shearX: -forward.x * drive.lean * 2.7 / lever || 0,
    shearY: -(forward.y * drive.lean * 1.4 + drive.settle) / lever || 0 };
  const shoulder = transformTorso(restShoulder, torso);
  const swordScale = 1 - 0.28 * Math.abs(forward.y);
  const ready = binding.ready;
  const pulled = binding.pulled ?? { x: forward.x * 8 + side.x * 9, y: forward.y * 8 + side.y * 9 + 5 };
  const extended = binding.extended ?? { x: forward.x * 29 * swordScale + side.x * 2, y: forward.y * 29 * swordScale + side.y * 2 + 2 };
  let relative: Point, wind: number, phase: 'prepare' | 'thrust' | 'impact' | 'recover' | 'ready';
  if (t < 120) { relative = mix(ready, pulled, smooth(t / 120)); wind = smooth(t / 120); phase = 'prepare'; }
  else if (t < 190) { relative = mix(pulled, extended, 1 - (1 - (t - 120) / 70) ** 3); wind = 1; phase = 'thrust'; }
  else if (t < 240) { relative = extended; wind = 1; phase = 'impact'; }
  else if (t < 480) { relative = mix(extended, ready, smooth((t - 240) / 240)); wind = 1 - smooth((t - 240) / 240); phase = 'recover'; }
  else { relative = ready; wind = 0; phase = 'ready'; }
  // The wrist path side and the anatomical elbow bend are independent controls.
  const joints = solveArm(shoulder, { x: shoulder.x + relative.x, y: shoulder.y + relative.y }, binding.elbowBend ?? binding.bend);
  const tipLength = (RIG.sword.tip.x - RIG.sword.grip.x) * swordScale;
  return { ...joints, shoulder, restShoulder, waist, foot: { x: 0, y: 0 }, torso, binding, bodyScale: scale, linked, direction,
    angle, radians, forward, swordScale, wind, phase, castTime: Math.min(t, RIG.duration), active: t < RIG.duration,
    tip: { x: joints.wrist.x + forward.x * tipLength, y: joints.wrist.y + forward.y * tipLength } };
}
export function bladePoint(pose: ReturnType<typeof sampleLinkedThrust>, native: Point): Point {
  const along = (native.x - RIG.sword.grip.x) * pose.swordScale, across = native.y - RIG.sword.grip.y;
  return { x: pose.wrist.x + Math.cos(pose.radians) * along - Math.sin(pose.radians) * across,
    y: pose.wrist.y + Math.sin(pose.radians) * along + Math.cos(pose.radians) * across };
}
