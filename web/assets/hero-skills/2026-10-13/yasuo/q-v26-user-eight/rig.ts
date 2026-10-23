export type Point={x:number;y:number};
export type Direction='nw'|'n'|'ne'|'w'|'e'|'sw'|'s'|'se';
export const order:Direction[]=['nw','n','ne','w','e','sw','s','se'];
export type Rig={label:string; shoulder:Point; wrist:Point; angle:number; bend:number; upper:number; lower:number; behind:boolean; flip:boolean; reach:number};
// Each view has its own shoulder socket, elbow side, depth and projected reach.
export const rigs:Record<Direction,Rig>={
 nw:{label:'左上',shoulder:{x:48,y:64},wrist:{x:34,y:54},angle:-135,bend:-1,upper:12,lower:13,behind:true,flip:true,reach:.48},
 n:{label:'正上',shoulder:{x:77,y:65},wrist:{x:78,y:45},angle:-90,bend:1,upper:12,lower:13,behind:true,flip:false,reach:.42},
 ne:{label:'右上',shoulder:{x:80,y:64},wrist:{x:94,y:54},angle:-45,bend:1,upper:12,lower:13,behind:true,flip:false,reach:.48},
 w:{label:'正左',shoulder:{x:46,y:65},wrist:{x:28,y:71},angle:180,bend:-1,upper:12,lower:14,behind:false,flip:true,reach:.56},
 e:{label:'正右',shoulder:{x:82,y:65},wrist:{x:100,y:71},angle:0,bend:1,upper:12,lower:14,behind:false,flip:false,reach:.56},
 sw:{label:'左下',shoulder:{x:43,y:66},wrist:{x:28,y:81},angle:135,bend:-1,upper:13,lower:14,behind:false,flip:true,reach:.51},
 s:{label:'正下',shoulder:{x:79,y:68},wrist:{x:78,y:90},angle:90,bend:-1,upper:13,lower:14,behind:false,flip:false,reach:.43},
 se:{label:'右下',shoulder:{x:85,y:66},wrist:{x:100,y:81},angle:45,bend:1,upper:13,lower:14,behind:false,flip:false,reach:.51},
};
export function poseAt(dir:Direction,time:number){
 const r=rigs[dir],t=Math.max(0,Math.min(time,480));
 const p=t<150?Math.sin(t/150*Math.PI/2):t<210?1:Math.max(0,(1+Math.cos((t-210)/270*Math.PI))/2);
 const angle=r.angle*Math.PI/180,wrist={x:r.wrist.x+Math.cos(angle)*3*p,y:r.wrist.y+Math.sin(angle)*3*p};
 const dx=wrist.x-r.shoulder.x,dy=wrist.y-r.shoulder.y,d=Math.hypot(dx,dy);
 const a=Math.atan2(dy,dx)+r.bend*Math.acos(Math.max(-1,Math.min(1,(r.upper*r.upper+d*d-r.lower*r.lower)/(2*r.upper*d))));
 return {shoulder:r.shoulder,elbow:{x:r.shoulder.x+r.upper*Math.cos(a),y:r.shoulder.y+r.upper*Math.sin(a)},wrist,angle,p};
}
