import { YASUO_Q_HIT_SECONDS } from '../game/YasuoQ';
import { classicQPose } from './ClassicQVfx';

/** Eight authored frames: begin two frames early so full extension meets contact. */
export function meowaQPose(age: number, facing: number) {
 const elapsed = age - YASUO_Q_HIT_SECONDS;
 const hand = classicQPose(age, facing).hand;
 return { visible: elapsed >= -.025 && elapsed < .18, hand,
  frame: elapsed < 0 ? Math.max(0, Math.min(1, Math.floor((elapsed + .025) / .025 * 2))) : Math.min(7, 2 + Math.floor(elapsed / .18 * 6)),
  alpha: Math.max(0, Math.min(1, (elapsed + .025) / .012, (.18 - elapsed) / .045)),
  width: 130, height: 65, ax: 56 / 512, ay: .5 };
}

export function meowaQHitPose(age: number) {
 return { visible: age >= 0 && age < .2, frame: Math.max(0, Math.min(3, Math.floor(age / .2 * 4))),
  alpha: Math.max(0, Math.min(1, (.2 - age) / .055)), width: 54, height: 54 };
}
