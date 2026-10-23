import type {Entity} from './types';
import {distance} from './geometry';

/** Shared R presentation and simulation timeline (seconds / world units). */
export const YASUO_R = {
  offsetX: 32,
  offsetY: -24,
  animationDuration: 1.6,
  airborneDuration: 1.6,
  hitAt: 1.312,
  duration: 1.84,
} as const;

export function yasuoRFrame(age:number):number {
  return Math.max(0,Math.min(15,Math.floor(age/YASUO_R.animationDuration*16)));
}
/** R is a range check on airborne heroes; cursor position never gates it. */
export function findYasuoRTarget(caster:Entity,entities:readonly Entity[],now:number,range:number):Entity|undefined {
  return entities.filter(e=>e.team!==caster.team&&e.kind==='hero'&&e.hp>0&&(e.airborneUntil??0)>now&&distance(caster,e)<=range)
    .sort((a,b)=>distance(caster,a)-distance(caster,b)||a.id-b.id)[0];
}

