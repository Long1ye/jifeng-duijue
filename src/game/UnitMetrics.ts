import type {Entity, Point} from './types';

/** World-space body dimensions, excluding blades, trails and transparent sprite margins. */
export const UNIT_METRICS = {
  hero: {radius:11, halfWidth:21, height:78},
  melee: {radius:6, halfWidth:10, height:32},
  ranged: {radius:6, halfWidth:10, height:32},
  tower: {radius:20, halfWidth:32, height:105},
} as const;
export const MINION_VISUAL_SCALE = 32 / 46;

/** Hero melee reach is measured from its body edge; committed swings get a small leeway. */
export function basicAttackRadius(unit:Entity):number{return unit.range+(unit.kind==='hero'?unit.radius:0);}
export function basicAttackReach(unit:Entity,target:Entity,releasing=false):number{
 return basicAttackRadius(unit)+target.radius+(releasing?8:0);
}

/** Torso ellipse plus a small foot target; weapon poses never enlarge selection. */
export function containsUnitBody(unit:Entity,point:Point):boolean {
  const body=UNIT_METRICS[unit.kind],dx=point.x-unit.x,dy=point.y-unit.y;
  if(Math.hypot(dx,dy)<=unit.radius+3)return true;
  const center=-body.height*.48;
  return (dx/body.halfWidth)**2+((dy-center)/(body.height*.52))**2<=1;
}
export function pickUnit(entities:readonly Entity[],point:Point):Entity|undefined {
  return entities.filter(e=>e.hp>0&&containsUnitBody(e,point))
    .sort((a,b)=>{
      const da=Math.hypot(a.x-point.x,a.y-point.y),db=Math.hypot(b.x-point.x,b.y-point.y);
      const footA=da<=a.radius+3,footB=db<=b.radius+3;
      return Number(footB)-Number(footA)||(footA&&footB?da-db:b.y-a.y)||a.id-b.id;
    })[0];
}
