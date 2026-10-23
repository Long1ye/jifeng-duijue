// Compact, eased gesture: tuck, settle into the hit, then let the wrist recover first.
const keys = [
 {t:0,x:86,y:84,lean:0,angle:45},
 {t:75,x:84.8,y:83.2,lean:.15,angle:43},
 {t:175,x:88.5,y:84.4,lean:1,angle:46},
 {t:220,x:88,y:85,lean:.95,angle:46},
 {t:330,x:86,y:84.8,lean:.45,angle:45.5},
 {t:480,x:86,y:84,lean:0,angle:45},
];
export const armLengths={upper:12,lower:13};
export function compactPoseAt(time:number){
 const t=Math.max(0,Math.min(480,time));
 const i=keys.findIndex((k,n)=>n>0&&t<=k.t),a=keys[Math.max(0,i-1)],b=keys[Math.max(1,i)];
 const u=(t-a.t)/(b.t-a.t),s=u*u*(3-2*u);
 const mix=(a:number,b:number)=>a+(b-a)*s;
 const lean=mix(a.lean,b.lean),wrist={x:mix(a.x,b.x),y:mix(a.y,b.y)};
 // Match the body's shear at the shoulder socket, beneath the armor.
 const shoulder={x:74+(121-73)*.018*lean,y:73};
 const dx=wrist.x-shoulder.x,dy=wrist.y-shoulder.y,d=Math.hypot(dx,dy);
 const {upper,lower}=armLengths;
 const angle=Math.atan2(dy,dx)+Math.acos(Math.max(-1,Math.min(1,(upper**2+d*d-lower**2)/(2*upper*d))));
 return {shoulder,wrist,elbow:{x:shoulder.x+upper*Math.cos(angle),y:shoulder.y+upper*Math.sin(angle)},lean,swordAngle:mix(a.angle,b.angle)*Math.PI/180};
}
