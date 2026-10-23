import type { Vector3 } from 'three';
import type { Entity, Projectile, Team } from '../game/types';
import { airborneLift } from '../render/SkillPresentation';
import { toThree, type ThreeCamera } from './Coordinates';

export function towerImpactPose(team: Team, age: number) {
  return { visible: age >= 0 && age < .24, frame: (team === 'blue' ? 8 : 12) + Math.min(3, Math.max(0, Math.floor(age / .06))),
    alpha: Math.max(0, Math.min(1, (.24 - age) / .07)) };
}

/** Follow the existing homing projectile, descending from its actual crystal to the struck body. */
export function towerBoltPose(shot: Projectile, source: Entity, target: Entity, muzzle: Vector3, camera: ThreeCamera, time: number, previousProgress = 0) {
  const distance = Math.hypot(shot.x - source.x, shot.y - source.y);
  const progress = Math.max(previousProgress, Math.min(1, distance / Math.max(1, Math.hypot(target.x - source.x, target.y - source.y) - target.radius)));
  const targetHeight = (target.kind === 'hero' ? 35 : 16) + airborneLift(target, time);
  const origin = toThree(source), position = toThree(shot, muzzle.y + (targetHeight - muzzle.y) * progress);
  position.x += (muzzle.x - origin.x) * (1 - progress);
  position.z += (muzzle.z - origin.z) * (1 - progress);
  const from = position.clone().project(camera.camera), to = toThree(target, targetHeight).project(camera.camera);
  const angle = Math.atan2((to.y - from.y) * camera.size.height, (to.x - from.x) * camera.size.width);
  const age = Math.max(0, time - (shot.startedAt ?? source.attackReleasedAt ?? time));
  return { position, angle, frame: (shot.team === 'blue' ? 0 : 4) + Math.floor(age * 20) % 4,
    width: 50, height: 50, ax: 192 / 256, ay: .5, progress };
}
