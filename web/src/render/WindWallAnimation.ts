import {W_DURATION} from '../game/WindWall';

export const WIND_WALL_ANIMATION={frames:8,fps:8,columns:4} as const;
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const ease=(n:number)=>{const t=clamp(n);return t*t*(3-2*t);};
/** All timing follows the wall's real lifetime, including pause and slow motion. */
export function windWallPose(age:number){
 const active=age>=0&&age<W_DURATION;
 return {active,frame:Math.floor(Math.max(0,age)*WIND_WALL_ANIMATION.fps)%WIND_WALL_ANIMATION.frames,
   grow:ease(age/.32),alpha:active?ease(age/.12)*(1-ease((age-(W_DURATION-.45))/.45)):0};
}
/** Keep wind upright; only its ground baseline follows the cast direction. */
export function windWallAxes(angle:number){
 const x=-Math.sin(angle),y=Math.cos(angle);
 return {x:Math.abs(x)<.16?(x<0?-.16:.16):x,y,normalX:Math.cos(angle),normalY:Math.sin(angle)};
}
