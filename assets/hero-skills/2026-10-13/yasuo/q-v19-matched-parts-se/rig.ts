export type Point={x:number;y:number};
export const DURATION=480, UPPER=14, LOWER=16, WAIST=84;
const smooth=(t:number)=>t*t*(3-2*t);
export function solve(s:Point,target:Point,bend=1){
 const dx=target.x-s.x,dy=target.y-s.y,d=Math.max(Math.abs(LOWER-UPPER)+.01,Math.min(UPPER+LOWER-.01,Math.hypot(dx,dy))),a=Math.atan2(dy,dx);
 const b=a+bend*Math.acos(Math.max(-1,Math.min(1,(UPPER*UPPER+d*d-LOWER*LOWER)/(2*UPPER*d))));
 return {elbow:{x:s.x+Math.cos(b)*UPPER,y:s.y+Math.sin(b)*UPPER},wrist:{x:s.x+Math.cos(a)*d,y:s.y+Math.sin(a)*d}};
}
export function poseAt(time:number){
 const t=Math.max(0,Math.min(DURATION,time));
 const p=t<110?-.2*smooth(t/110):t<195?-.2+1.2*(1-(1-(t-110)/85)**3):t<240?1:1-smooth((t-240)/240);
 const transform=(v:Point)=>({x:v.x+(WAIST-v.y)*p*.15,y:v.y+(WAIST-v.y)*p*.04});
 // Near shoulder drives the blade outward, rather than across the belly.
 const shoulder=transform({x:62,y:66}),support=transform({x:34,y:70});
 const target={x:shoulder.x+13+p*9,y:shoulder.y+10+p*9};
 return {t,p,shoulder,...solve(shoulder,target,1),support,supportArm:solve(support,{x:support.x-13-p*2,y:support.y+10-p*2},1),angle:Math.PI/4};
}
