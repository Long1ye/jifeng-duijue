import type {Entity,Point} from './types';

/** A spread of reachable E anchors, with a readable frontline and a softer backline. */
export const MINION_LANE={spacing:34,backline:58,leash:145,heroNotice:115,marchMultiplier:44/28,allySpacing:26,targetCrowdingCost:26} as const;
/** Reinforcements travel briskly; target approach and combat footwork keep their readable pace. */
export function minionMovementSpeed(unit:Entity,engaged=unit.targetId!==null):number{
 return unit.speed*(unit.formation&&!engaged&&!unit.laneRules?MINION_LANE.marchMultiplier:1);
}
export function minionLaneSlot(front:Point,direction:Point,slot:number,hasFrontline=true):Point{
 const column=slot%3-1,back=slot<3||!hasFrontline?0:MINION_LANE.backline;
 const stagger=[0,7,-5][slot%3]*(slot<3?1:-1);
 return {x:front.x-direction.x*(back+stagger)-direction.y*column*MINION_LANE.spacing,
  y:front.y-direction.y*(back+stagger)+direction.x*column*MINION_LANE.spacing};
}

/** Reserve a broad firing arc instead of sending every soldier to the target's centre. */
export function minionAttackSpot(unit:Entity,target:Entity,home:Point,units?:readonly Entity[]):Point{
 const attackers=units?.filter(e=>e.hp>0&&e.team===unit.team&&e.kind===unit.kind&&e.targetId===target.id).sort((a,b)=>a.id-b.id);
 const rank=attackers?.findIndex(e=>e.id===unit.id)??-1;
 // Reservations span waves, so reinforcements cannot reuse an occupied column.
 const capacity=unit.kind==='melee'?3:5;
 const slot=rank>=0?rank%capacity:-1;
 const column=slot>=0?(slot===0?0:Math.ceil(slot/2)*(slot%2?-1:1)):(unit.formation?.slot??unit.id)%3-1;
 const facing=Math.atan2(home.y-target.y,home.x-target.x);
 const angle=facing+Math.max(-1.2,Math.min(1.2,column*(unit.kind==='melee'?1.2:.4)));
 const attackRadius=unit.kind==='melee'?unit.range+target.radius-1:unit.range*.85+target.radius-2;
 // Overflow waits behind the occupied arc until a slot opens, instead of piling into it.
 const radius=attackRadius+(rank>=0?Math.floor(rank/capacity)*MINION_LANE.allySpacing:0);
 return {x:target.x+Math.cos(angle)*radius,y:target.y+Math.sin(angle)*radius};
}

/** Spread new assignments, keeping committed targets stable in Match. */
export function minionTargetCost(unit:Entity,target:Entity,units:readonly Entity[]):number{
 const claims=units.filter(e=>e.id!==unit.id&&e.hp>0&&e.team===unit.team&&e.kind===unit.kind&&e.targetId===target.id).length;
 return Math.hypot(unit.x-target.x,unit.y-target.y)+claims*MINION_LANE.targetCrowdingCost;
}

export function minionHeroVisibility(unit:Entity,heroes:readonly Entity[],selected=false):number{
 if(selected)return 1;
 return heroes.some(h=>h.hp>0&&Math.abs(h.x-unit.x)<22&&unit.y>=h.y-3&&unit.y-h.y<25)?.58:1;
}
