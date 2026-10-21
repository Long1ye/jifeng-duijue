import type { Entity } from '../game/types';
import { distance } from '../game/geometry';
import { HERO_EFFECT_SCALE } from './Presentation';

export const TF_DIRECTIONS=['e','se','s','sw','w','nw','n','ne'] as const;
export function tfDirection(angle:number){
  return TF_DIRECTIONS[((Math.round(angle/(Math.PI/4))%8)+8)%8];
}
export const TF_URLS=import.meta.glob('../../assets/heroes/twisted-fate/user-eight/卡牌*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export function tfTextureKey(path:string){return 'tf-'+path.split('/').pop()!.replace('.png','');}

/** Two supplied still poses, not a fabricated frame animation. Preserve native eight views. */
export function tfPose(unit:Entity,time:number,target?:Entity){
  const moving=unit.hp>0&&unit.windup<=0&&(
    (!!unit.destination&&distance(unit,unit.destination)>1)||
    (!!target&&target.hp>0&&distance(unit,target)>unit.range+target.radius));
  const action=moving||unit.windup>0||time-(unit.attackReleasedAt??-Infinity)<.28||
    !!unit.qCast||!!unit.wCast||!!unit.eCast||!!unit.rCast;
  const direction=tfDirection(unit.facing);
  const standing=!action;
  const bottoms=standing?{e:124,se:127,s:126,sw:127,w:124,nw:127,n:126,ne:127}:{e:123,se:124,s:124,sw:124,w:123,nw:123,n:123,ne:123};
  return {key:`tf-卡牌${standing?'站立':''}-${direction}`,originX:.5,originY:(bottoms[direction]-1)/128,
    scale:HERO_EFFECT_SCALE*(standing?.95:1),bob:moving?Math.sin(time*12)*.6:0};
}
