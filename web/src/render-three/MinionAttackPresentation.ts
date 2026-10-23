import type { Entity, Projectile, Team } from '../game/types';
import { airborneLift } from '../render/SkillPresentation';
import type { ThreeCamera } from './Coordinates';

export function minionBoltPose(shot: Projectile, source: Entity, target: Entity, camera: ThreeCamera, time: number) {
 const targetHeight = (target.kind === 'hero' ? 35 : 16) + airborneLift(target, time);
 const progress = Math.min(1, Math.hypot(shot.x - source.x, shot.y - source.y) / Math.max(1, Math.hypot(source.x - target.x, source.y - target.y)));
 const height = 29 + (targetHeight - 29) * progress;
 const point = { x: shot.x + Math.cos(source.facing) * 8 * (1 - progress), y: shot.y + Math.sin(source.facing) * 8 * (1 - progress) };
 const from = camera.project(point, height), to = camera.project(target, targetHeight);
 return { point, height, angle: -Math.atan2(to.y - from.y, to.x - from.x), width: 38, tall: 38, ax: 192 / 256, ay: .5,
  frame: (shot.team === 'blue' ? 0 : 4) + Math.floor(Math.max(0, time - (shot.startedAt ?? source.attackReleasedAt ?? time)) * 24) % 4 };
}
export function minionImpactPose(kind: 'melee' | 'ranged', team: Team, age: number) {
 return { visible: age >= 0 && age < .2, frame: (kind === 'melee' ? 8 : 12) + Math.max(0, Math.min(3, Math.floor(age / .05))),
  color: kind === 'melee' ? 0xffffff : team === 'blue' ? 0x94d9ff : 0xffa2ae,
  size: kind === 'melee' ? 32 : 38, alpha: Math.max(0, Math.min(1, (.2 - age) / .06)) };
}
