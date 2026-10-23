import { RIG, UPPER_LENGTH, LOWER_LENGTH, windRibbon, type Direction, type Point, type sampleLinkedThrust } from './rig';
export type Pose = ReturnType<typeof sampleLinkedThrust>;
export interface RigImages { bodies: Record<Direction, HTMLImageElement>; upper: HTMLImageElement; hand: HTMLImageElement; sword: HTMLImageElement }
function arm(ctx: CanvasRenderingContext2D, image: HTMLImageElement, joint: Point, end: Point, upper = false): void {
  const native = upper ? RIG.upper : RIG.lower, mount = native.mount;
  const nativeX = native.end.x - mount.x, nativeY = native.end.y - mount.y;
  ctx.save(); ctx.translate(joint.x, joint.y); ctx.rotate(Math.atan2(end.y - joint.y, end.x - joint.x));
  ctx.scale((upper ? UPPER_LENGTH : LOWER_LENGTH) / Math.hypot(nativeX, nativeY), 1); ctx.rotate(-Math.atan2(nativeY, nativeX));
  if (upper) {
    const source = RIG.upper.source;
    ctx.drawImage(image, source.x, source.y, source.width, source.height, -mount.x, -mount.y, source.width, source.height);
  } else ctx.drawImage(image, -mount.x, -mount.y);
  ctx.restore();
}
function bladeTransform(ctx: CanvasRenderingContext2D, pose: Pose): void {
  ctx.translate(pose.wrist.x, pose.wrist.y); ctx.rotate(pose.radians); ctx.scale(pose.swordScale, 1); ctx.translate(-RIG.sword.grip.x, -RIG.sword.grip.y);
}
function drawWind(ctx: CanvasRenderingContext2D, pose: Pose, front: boolean): void {
  if (pose.wind <= 0) return;
  ctx.save(); bladeTransform(ctx, pose);
  if (!front) { ctx.fillStyle = '#82d5f5'; ctx.globalAlpha = pose.wind * 0.12; ctx.fillRect(36, 6, 74, 11); }
  for (const strand of [0, 1] as const) {
    ctx.fillStyle = front ? '#c3eeff' : '#73badb'; ctx.globalAlpha = pose.wind * (front ? 0.65 : 0.4);
    for (const point of windRibbon(pose.castTime, strand)) if (point.front === front) ctx.fillRect(point.x, point.y, 1, 1);
  }
  ctx.restore();
}
function drawBody(ctx: CanvasRenderingContext2D, pose: Pose, image: HTMLImageElement): void {
  const { bodyScale: scale, binding, waist, torso } = pose;
  const x = -binding.foot.x * scale, y = -binding.foot.y * scale;
  const width = 128 * scale, height = 128 * scale;
  // One shared belt cut: lower body is fixed, upper body is sheared about the waist.
  // A 2px overlap hides subpixel seams; it does not move the feet or regenerate art.
  ctx.save(); ctx.beginPath(); ctx.rect(-128, waist.y - 1, 256, 160); ctx.clip(); ctx.drawImage(image, x, y, width, height); ctx.restore();
  ctx.save();
  ctx.transform(1, 0, torso.shearX, 1 + torso.shearY, -torso.shearX * waist.y, -torso.shearY * waist.y);
  ctx.beginPath(); ctx.rect(-128, -160, 256, waist.y + 161); ctx.clip(); ctx.drawImage(image, x, y, width, height); ctx.restore();
}
export type BladePainter = (ctx: CanvasRenderingContext2D, pose: Pose) => void;
export function renderLinkedThrust(ctx: CanvasRenderingContext2D, pose: Pose, images: RigImages, showJoints = false, paintBlade?: BladePainter): void {
  ctx.imageSmoothingEnabled = false;
  const weapon = (): void => {
    if (paintBlade) paintBlade(ctx, pose);
    else { drawWind(ctx, pose, false); ctx.save(); bladeTransform(ctx, pose); ctx.drawImage(images.sword, 0, 0); ctx.restore(); drawWind(ctx, pose, true); }
    arm(ctx, images.hand, pose.elbow, pose.wrist);
  };
  const upperArm = (): void => arm(ctx, images.upper, pose.shoulder, pose.elbow, true);
  if (pose.binding.upperInFront) {
    drawBody(ctx, pose, images.bodies[pose.direction]); upperArm(); weapon();
  } else {
    upperArm();
    if (pose.binding.behind) { weapon(); drawBody(ctx, pose, images.bodies[pose.direction]); }
    else { drawBody(ctx, pose, images.bodies[pose.direction]); weapon(); }
  }
  if (showJoints) {
    ctx.strokeStyle = '#e9b96a'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(pose.waist.x, pose.waist.y); ctx.lineTo(pose.shoulder.x, pose.shoulder.y); ctx.lineTo(pose.elbow.x, pose.elbow.y); ctx.lineTo(pose.wrist.x, pose.wrist.y); ctx.stroke();
    for (const point of [pose.waist, pose.shoulder, pose.elbow, pose.wrist]) { ctx.fillStyle = '#ffd582'; ctx.fillRect(Math.round(point.x) - 1, Math.round(point.y) - 1, 3, 3); }
  }
}
