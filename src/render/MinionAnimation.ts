import clips from '../../assets/units/minions-animated-v1/runtime/clips.json';
import {MINION_VISUAL_SCALE} from '../game/UnitMetrics';
import {BALANCE} from '../game/config';
import {minionMovementSpeed} from '../game/MinionLane';
import type {Entity} from '../game/types';

export const MINION_CLIPS=clips;
export const MINION_URLS=import.meta.glob('../../assets/units/minions-animated-v1/runtime/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;

/** Presentation only. Damage and projectile release stay in Match. */
export function minionPose(unit:Entity,time:number,moving:boolean){
 const kind=unit.kind==='melee'?'melee':'ranged';
 const release=unit.attackReleasedAt;
 const attack=unit.hp>0&&!moving&&unit.attackStartedAt!==null&&(unit.windup>0||(release!==null&&time-release<.32));
 const action=attack?'attack':'walk';
 const key=`${unit.team}-${kind}-${action}` as keyof typeof clips;
 let frame=0;
 if(attack){
  frame=unit.windup>0?Math.min(3,Math.floor(Math.max(0,time-unit.attackStartedAt!)/BALANCE[kind].windup*4))
   :Math.min(7,4+Math.floor(Math.max(0,time-release!)/.32*4));
  // Generated blue caster frame 4 loses its crystal; hold the prior valid pose.
  if(unit.team==='blue'&&kind==='ranged'&&frame===4)frame=3;
 }else if(moving&&unit.hp>0)frame=Math.floor(time*10+unit.id%8)%8;
 const clip=clips[key],anchor=clip.anchors[frame];
 return {key:`minion-${key}`,frame,scale:clip.scale*MINION_VISUAL_SCALE,originX:anchor[0]/clip.width,originY:anchor[1]/clip.height};
}

/** Accumulate actual ground travel, so blocked units cannot walk in place. */
export class MinionAnimator {
 private states=new Map<number,{x:number;y:number;time:number;travel:number;flip:boolean;moving:boolean}>();
 reset(){this.states.clear();}
 retain(ids:ReadonlySet<number>){for(const id of this.states.keys())if(!ids.has(id))this.states.delete(id);}
 sample(unit:Entity,time:number){
  let state=this.states.get(unit.id);
  if(!state||time<state.time){state={x:unit.x,y:unit.y,time,travel:0,flip:unit.team==='red'?false:Math.cos(unit.facing)<0,moving:false};this.states.set(unit.id,state);}
  const dt=time-state.time,travel=Math.hypot(unit.x-state.x,unit.y-state.y);
  const moving=dt>0?unit.hp>0&&unit.speed>0&&unit.windup<=0&&(unit.airborneUntil??0)<=time&&travel>.025:state.moving;
  const speed=minionMovementSpeed(unit);
  // Longer marching strides keep faster reinforcements from looking like sped-up footage.
  const frameDistance=3.2*(unit.speed>0?speed/unit.speed:1);
  if(moving&&dt>0&&travel<Math.max(3,speed*dt*2))state.travel+=travel/frameDistance;
  const facing=Math.cos(unit.facing);
  // Preserve handedness inside a vertical dead zone instead of flickering on tiny turns.
  if(facing>.22)state.flip=unit.team==='red';else if(facing<-.22)state.flip=unit.team==='blue';
  const pose=minionPose(unit,time,moving);
  if(moving&&pose.key.endsWith('-walk')){
   pose.frame=Math.floor(state.travel+unit.id%8)%8;
   const clip=clips[pose.key.replace('minion-','') as keyof typeof clips],anchor=clip.anchors[pose.frame];
   pose.originX=anchor[0]/clip.width;pose.originY=anchor[1]/clip.height;
  }
  const breathing=!moving&&pose.key.endsWith('-walk')&&unit.hp>0?Math.sin(time*2.6+unit.id*1.7)*.35:0;
  state.x=unit.x;state.y=unit.y;state.time=time;state.moving=moving;
  return {...pose,originX:state.flip?1-pose.originX:pose.originX,flip:state.flip,breathing};
 }
}
