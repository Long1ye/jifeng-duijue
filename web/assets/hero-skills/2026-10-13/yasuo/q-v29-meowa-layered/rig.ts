import {compactPoseAt} from '../q-v27-upright-se/motion';
export type {Point,Direction} from '../q-v26-user-eight/rig';
import type {Direction,Rig} from '../q-v26-user-eight/rig';
export const order:Direction[]=['nw','n','ne','w','e','sw','s','se'];
// Sockets measured on the new 576×704 bodies rendered at 0.2 scale.
export const rigs:Record<Direction,Rig>={
 nw:{label:'左上',shoulder:{x:38,y:73},wrist:{x:26,y:61},angle:-135,bend:-1,upper:12,lower:13,behind:true,flip:true,reach:.48},
 n:{label:'正上',shoulder:{x:40,y:72},wrist:{x:41,y:54},angle:-90,bend:-1,upper:12,lower:13,behind:true,flip:true,reach:.42},
 ne:{label:'右上',shoulder:{x:59,y:71},wrist:{x:70,y:58},angle:-45,bend:1,upper:12,lower:13,behind:true,flip:false,reach:.48},
 w:{label:'正左',shoulder:{x:47,y:75},wrist:{x:32,y:79},angle:180,bend:-1,upper:12,lower:13,behind:false,flip:true,reach:.56},
 e:{label:'正右',shoulder:{x:65,y:73},wrist:{x:80,y:78},angle:0,bend:1,upper:12,lower:13,behind:true,flip:false,reach:.56},
 sw:{label:'左下',shoulder:{x:61,y:74},wrist:{x:47,y:92},angle:135,bend:-1,upper:12,lower:13,behind:false,flip:true,reach:.51},
 s:{label:'正下',shoulder:{x:70,y:75},wrist:{x:67,y:97},angle:90,bend:-1,upper:12,lower:13,behind:false,flip:false,reach:.43},
 se:{label:'右下',shoulder:{x:74,y:73},wrist:{x:86,y:84},angle:45,bend:1,upper:12,lower:13,behind:false,flip:false,reach:.51},
};
export function poseAt(dir:Direction,time:number){
 const r=rigs[dir],base=compactPoseAt(time),rotation=(r.angle-45)*Math.PI/180;
 // Downward views use a relaxed, lowered elbow and a smaller extension.
 // Keep a bend reserve instead of forcing the IK chain to lock straight.
 const motionScale=dir==='sw'||dir==='s'?.55:1;
 const dx=(base.wrist.x-86)*motionScale,dy=(base.wrist.y-84)*motionScale;
 const wrist={x:r.wrist.x+dx*Math.cos(rotation)-dy*Math.sin(rotation),y:r.wrist.y+dx*Math.sin(rotation)+dy*Math.cos(rotation)};
 const shoulder=r.shoulder,wx=wrist.x-shoulder.x,wy=wrist.y-shoulder.y,d=Math.hypot(wx,wy);
 const a=Math.atan2(wy,wx)+r.bend*Math.acos(Math.max(-1,Math.min(1,(r.upper**2+d*d-r.lower**2)/(2*r.upper*d))));
 return {shoulder,wrist,elbow:{x:shoulder.x+r.upper*Math.cos(a),y:shoulder.y+r.upper*Math.sin(a)},angle:base.swordAngle+rotation,p:base.lean};
}
