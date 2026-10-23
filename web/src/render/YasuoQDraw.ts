import { YASUO_Q_CAST_SECONDS, YASUO_Q_HIT_SECONDS } from '../game/YasuoQ';
import { HERO_ATTACHMENT_SCALE, HERO_EFFECT_SCALE } from './Presentation';
export const Q_DRAW_FRAME_COUNT = 37;
// The supplied v2 first shows its hand flash at frame 22.
export const Q_FLASH_START = YASUO_Q_HIT_SECONDS;
export const Q_FLASH_DURATION = .18;
export function qDrawPose(age:number, facing:number) {
  const flipX=Math.cos(facing)<-.001;
  return {frame:Math.min(Q_DRAW_FRAME_COUNT-1,Math.max(0,Math.floor(age/YASUO_Q_CAST_SECONDS*Q_DRAW_FRAME_COUNT))),flipX,originX:.5,originY:108/113};
}
export function qSwordPose(age:number,vx:number,vy:number) {
  return {frame:Math.min(15,Math.max(0,Math.floor((age-Q_FLASH_START)/Q_FLASH_DURATION*16))),
    rotation:Math.atan2(vy,vx)-Math.atan2(27,112),scale:.65*HERO_ATTACHMENT_SCALE*.8,originX:14/135,originY:8/39};
}
/** One anchored flash outside the actor silhouette; no projectile-position dependency. */
export function qSwordFlash(age:number,x:number,y:number,facing:number) {
  const dx=Math.cos(facing),dy=Math.sin(facing);
  const elapsed=age-Q_FLASH_START;
  // This body clip only mirrors left/right: attach the hilt to its hand, not to the aim ray.
  const handSide=qDrawPose(age,facing).flipX?-1:1;
  return {...qSwordPose(age,dx,dy),x:x+handSide*16*HERO_EFFECT_SCALE,y:y-30*HERO_EFFECT_SCALE,
    visible:elapsed>=0&&elapsed<Q_FLASH_DURATION,
    alpha:Math.max(0,Math.min(1,elapsed/.012,(Q_FLASH_DURATION-elapsed)/.04))};
}
