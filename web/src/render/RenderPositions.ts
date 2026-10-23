import type {Point} from '../game/types';

/** Interpolate presentation only; instantaneous teleports must never sweep across the map. */
export class RenderPositions {
 private previous=new Map<number,Point>();
 capture(entities:readonly (Point&{id:number})[]){
  this.previous.clear();for(const entity of entities)this.previous.set(entity.id,{x:entity.x,y:entity.y});
 }
 reset(){this.previous.clear();}
 sample<T extends Point&{id:number}>(entity:T,alpha:number):T{
  const previous=this.previous.get(entity.id);
  if(!previous||Math.hypot(entity.x-previous.x,entity.y-previous.y)>32)return entity;
  const t=Math.max(0,Math.min(1,alpha));
  return {...entity,x:previous.x+(entity.x-previous.x)*t,y:previous.y+(entity.y-previous.y)*t};
 }
}
