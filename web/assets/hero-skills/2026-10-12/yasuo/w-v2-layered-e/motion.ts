import { sampleLinkedThrust } from '../q-v8-direction-picker/rig';
import { solveArm, transformTorso, RIG } from '../q-v7-user-linked/rig';

export const TIMING = { release: 190, wallStart: 300, castEnd: 560, wallFull: 590, wallFade: 1920, wallEnd: 2240, period: 2700 } as const;
export const VIEW = { width: 288, height: 216, foot: { x: 64, y: 168 }, wall: { x: 232, y: 168 } } as const;
const smooth = (t: number) => { const v = Math.max(0, Math.min(1, t)); return v * v * (3 - 2 * v); };
const keys = [
  { t: 0, x: 20, y: 8, angle: 10, lean: 0 },
  { t: 130, x: 15, y: 1, angle: -48, lean: -0.5 },
  { t: 205, x: 32, y: 5, angle: 5, lean: 1 },
  { t: 280, x: 30, y: 13, angle: 28, lean: 0.75 },
  { t: 560, x: 20, y: 8, angle: 10, lean: 0 },
] as const;

/** W has an independent short swing path; only body artwork and the arm rig are shared with Q. */
export function sampleWindCast(milliseconds: number) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) throw new RangeError('Invalid W time');
  const t = Math.min(milliseconds, TIMING.castEnd);
  const a = [...keys].reverse().find(key => key.t <= t) ?? keys[0];
  const b = keys.find(key => key.t > t) ?? a;
  const p = a === b ? 0 : smooth((t - a.t) / (b.t - a.t));
  const interpolate = (name: 'x' | 'y' | 'angle' | 'lean') => a[name] + (b[name] - a[name]) * p;
  const base = sampleLinkedThrust(0, 480);
  const lever = base.waist.y - base.restShoulder.y;
  const torso = { waist: base.waist, shearX: -interpolate('lean') * 3 / lever, shearY: -Math.sin(t / 560 * Math.PI) * 0.018 };
  const shoulder = transformTorso(base.restShoulder, torso);
  const joints = solveArm(shoulder, { x: shoulder.x + interpolate('x'), y: shoulder.y + interpolate('y') }, 1);
  const angle = interpolate('angle'), radians = angle * Math.PI / 180;
  const forward = { x: Math.cos(radians), y: Math.sin(radians) };
  const length = RIG.sword.tip.x - RIG.sword.grip.x;
  const phase = t < 130 ? 'prepare' : t < 205 ? 'thrust' : t < 280 ? 'impact' : t < 560 ? 'recover' : 'ready';
  return { ...base, ...joints, torso, shoulder, angle, radians, forward, castTime: t, active: t < TIMING.castEnd,
    phase: phase as typeof base.phase, wind: t < 130 ? smooth(t / 130) : 1 - smooth((t - 250) / 220),
    tip: { x: joints.wrist.x + forward.x * length, y: joints.wrist.y + forward.y * length } };
}

export function sampleWall(time: number) {
  const growth = smooth((time - TIMING.wallStart) / (TIMING.wallFull - TIMING.wallStart));
  const opacity = growth * (1 - smooth((time - TIMING.wallFade) / (TIMING.wallEnd - TIMING.wallFade)));
  return { growth, opacity, active: time >= TIMING.wallStart && time < TIMING.wallEnd };
}

// The gust starts at the moving blade, then becomes an independent world-space effect.
export function sampleGust(time: number) {
  const release = sampleWindCast(TIMING.release);
  const start = { x: VIEW.foot.x + release.wrist.x + release.forward.x * 58, y: VIEW.foot.y + release.wrist.y + release.forward.y * 58 };
  const p = Math.max(0, Math.min(1, (time - TIMING.release) / (TIMING.wallStart - TIMING.release)));
  return { x: start.x + (VIEW.wall.x - start.x) * p, y: start.y + (VIEW.wall.y - 38 - start.y) * p,
    progress: p, active: time >= TIMING.release && time <= TIMING.wallStart };
}

export function phaseLabel(time: number) {
  if (time < 130) return '收刀蓄力';
  if (time < TIMING.release) return '向前短挥';
  if (time < TIMING.wallStart) return '送风 · 跟随收刀';
  if (time < TIMING.castEnd) return '收势 · 风墙升起';
  if (time < TIMING.wallFade) return '人物就绪 · 风墙独立持续';
  if (time < TIMING.wallEnd) return '风墙消散';
  return '就绪';
}
