import type { Entity } from '../game/types';
import { HERO_EFFECT_SCALE } from './Presentation';

export const NAILONG_DIRECTIONS = ['e','se','s','sw','w','nw','n','ne'] as const;
export const NAILONG_URLS = import.meta.glob('../../assets/heroes/nailong/*.png', {eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const nailongKey = (path:string) => 'nailong-'+path.split('/').pop()!.replace('.png','');
export const NAILONG_TEXTURES = Object.entries(NAILONG_URLS).filter(([p])=>!p.endsWith('preview.png')).map(([p,url])=>({
  key:nailongKey(p),url,width:/\/fire(?:-hit)?\.png$/.test(p)?184:128,height:/\/fire(?:-hit)?\.png$/.test(p)?120:128,
}));
export function nailongDirection(angle:number){return NAILONG_DIRECTIONS[(Math.round(angle/(Math.PI/4))%8+8)%8];}

/** Locomotion follows actual movement; attack release stays synced to simulation windup. */
export class NailongAnimator {
  private previous?:{x:number;y:number;time:number};
  private moving=false;
  reset(){this.previous=undefined;this.moving=false;}
  sample(unit:Entity,time:number){
    if(this.previous&&time!==this.previous.time)this.moving=Math.hypot(unit.x-this.previous.x,unit.y-this.previous.y)>.01;
    this.previous={x:unit.x,y:unit.y,time};
    const age=unit.attackStartedAt===null?Infinity:time-unit.attackStartedAt;
    const released=unit.attackReleasedAt===null?null:time-unit.attackReleasedAt;
    const attacking=unit.hp>0&&age>=0&&(unit.windup>0||released!==null&&released<.42&&!this.moving);
    const flip=attacking&&Math.cos(unit.attackFacing??unit.facing)<0;
    // Frame 13 opens the mouth; release there, then run the remaining breath/recovery poses.
    const frame=attacking?(released===null?Math.min(11,Math.floor(age/Math.max(.01,age+unit.windup)*12)):Math.min(38,12+Math.floor(released/.42*27))):this.moving?Math.floor(time*10)%8:0;
    const key=attacking?'nailong-attack':`nailong-${this.moving?'walk':'idle'}-${nailongDirection(unit.facing)}`;
    return {key,frame,width:128,height:128,ax:.5,ay:119/128,scale:HERO_EFFECT_SCALE,flip};
  }
}
