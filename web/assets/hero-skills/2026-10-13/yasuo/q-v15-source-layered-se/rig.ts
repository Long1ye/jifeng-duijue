export const DURATION=480;
export type Point={x:number;y:number};
const smooth=(v:number)=>v*v*(3-2*v);
export function poseAt(time:number){
  const t=Math.max(0,Math.min(DURATION,time));
  const p=t<110?-.15*smooth(t/110):t<190?-.15+1.15*(1-(1-(t-110)/80)**3):t<240?1:1-smooth((t-240)/240);
  const shoulder={x:20+p*3,y:51+p};
  const a=Math.atan2(11,-3)-p*1.1,b=Math.atan2(10,-1)-p*.94;
  const elbow={x:shoulder.x+Math.cos(a)*Math.hypot(3,11),y:shoulder.y+Math.sin(a)*Math.hypot(3,11)};
  const wrist={x:elbow.x+Math.cos(b)*Math.hypot(1,10),y:elbow.y+Math.sin(b)*Math.hypot(1,10)};
  return {t,p,shoulder,elbow,wrist,angle:Math.PI/4,wind:t<110?smooth(t/110):t<240?1:1-smooth((t-240)/240)};
}
