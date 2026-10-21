/** Upright, foot-anchored animation. Flight heading never rotates the wind column. */
export function meowaStormPose(age: number, remaining: number) {
 return { visible: age >= 0 && remaining > 0, frame: Math.floor(Math.max(0, age) * 16) % 8,
  alpha: Math.max(0, Math.min(1, age / .07, remaining / 22)) * .82,
  width: 52, height: 104, ax: .5, ay: 460 / 512 };
}
export function meowaStormHitPose(age: number) {
 return { visible: age >= 0 && age < .32, frame: Math.max(0, Math.min(3, Math.floor(age / .32 * 4))),
  alpha: Math.max(0, Math.min(1, (.32 - age) / .09)) * .85, width: 76, height: 76, ax: .5, ay: .8 };
}
