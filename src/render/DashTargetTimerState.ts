import type {Entity} from '../game/types';
import {E} from '../game/YasuoE';
import {UNIT_METRICS} from '../game/UnitMetrics';
import {airborneLift} from './SkillPresentation';

/** Rebuild the original E timer mesh as a readable, body-bound 2D arc. */
export function dashTargetTimer(unit:Entity,until:number,now:number){
 if(unit.hp<=0||unit.kind==='tower'||until<=now)return null;
 const body=UNIT_METRICS[unit.kind],remaining=Math.max(0,Math.min(1,(until-now)/E.targetCooldown));
 const age=Math.max(0,now-(until-E.targetCooldown));
 return {x:unit.x,y:unit.y-body.height*.18-airborneLift(unit,now),
  radiusX:body.halfWidth+7,radiusY:unit.kind==='hero'?12:9,
  remaining,start:-Math.PI/2+(1-remaining)*Math.PI*2,end:Math.PI*1.5,
  alpha:.8+.2*Math.min(1,age/.12),depthY:unit.y};
}
