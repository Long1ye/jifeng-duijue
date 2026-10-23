import timing from '../q-v10-sword-wind-only/animation.json';
import type { Pose } from '../q-v7-user-linked/render';

export const VIEW = { width: 384, height: 320, foot: { x: 192, y: 200 } } as const;
export const WEAPON = {
  grip: { x: 38, y: 104 }, source: { x: 19, y: 93, width: 164, height: 24 },
  scaleX: 132 / 140, tipX: 178, duration: 480,
} as const;
/** One source loop per cast. The resting pose uses frame zero, like the next cast. */
export function weaponFrame(castTime: number): number {
  if (!Number.isFinite(castTime) || castTime < 0) throw new RangeError('Invalid weapon time');
  if (castTime >= WEAPON.duration) return 0;
  const time = castTime / WEAPON.duration * timing.durationMs;
  let end = 0;
  for (let i = 0; i < timing.frames.length; i++) {
    end += timing.frames[i].durationMs;
    if (time < end) return i;
  }
  return timing.frames.length - 1;
}
export function gripForFrame(frame: number) {
  // Fixed grip, not per-frame alpha centering. Correct the three measured handle drifts.
  return { x: WEAPON.grip.x, y: frame === 21 ? 104.5 : frame === 22 ? 105.5 : frame === 23 ? 105 : 104 };
}
export function weaponPoint(pose: Pose, point: { x: number; y: number }) {
  const grip = gripForFrame(weaponFrame(pose.castTime));
  const x = (point.x - grip.x) * WEAPON.scaleX * pose.swordScale, y = point.y - grip.y;
  return { x: pose.wrist.x + Math.cos(pose.radians) * x - Math.sin(pose.radians) * y,
    y: pose.wrist.y + Math.sin(pose.radians) * x + Math.cos(pose.radians) * y };
}
export function drawWeapon(ctx: CanvasRenderingContext2D, pose: Pose, frames: HTMLImageElement[]) {
  const frame = weaponFrame(pose.castTime), grip = gripForFrame(frame), source = WEAPON.source;
  ctx.save(); ctx.translate(pose.wrist.x, pose.wrist.y); ctx.rotate(pose.radians);
  ctx.scale(WEAPON.scaleX * pose.swordScale, 1);
  ctx.drawImage(frames[frame], source.x, source.y, source.width, source.height,
    source.x - grip.x, source.y - grip.y, source.width, source.height);
  ctx.restore();
}
