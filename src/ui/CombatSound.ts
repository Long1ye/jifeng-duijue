import type {GameEvent} from '../game/types';
export interface CombatSoundPlan {duration:number;noise:number;low:number;high:number;tone:number;pitch:number;sweep:number}
/** Restrict the foreground mix to hero actions; minion battles must remain quiet. */
export function combatSound(event:GameEvent):CombatSoundPlan|null{
 if(event.type==='hit'){
  if(event.impact==='ignite')return null;
  if(event.sourceKind!=='hero'&&event.targetKind!=='hero')return null;
  const heavy=event.impact==='r'||event.impact==='q3'||event.impact==='eq3';
  const pierce=event.impact==='q',dash=event.impact==='e',spin=event.impact==='eq',stone=event.targetKind==='tower';
  return {duration:heavy?.22:dash?.1:spin?.16:.13,noise:heavy?.08:dash?.035:spin?.06:.055,
   low:stone?700:heavy?500:pierce?1800:1200,high:stone?3600:6500,
   tone:heavy?.065:spin?.035:.025,pitch:heavy?105:stone?230:pierce?420:spin?260:165,sweep:heavy?42:spin?110:70};
 }
 if(event.type==='attack'&&event.team==='blue')return {duration:.09,noise:.026,low:900,high:4800,tone:0,pitch:1,sweep:1};
 if(event.type==='cast')return {duration:event.ability==='e'?.15:.17,noise:.038,low:event.ability==='q'?1400:650,high:5400,tone:0,pitch:1,sweep:1};
 if(event.type==='last-hit'&&event.team==='blue')return {duration:.14,noise:.008,low:2400,high:7000,tone:.032,pitch:1175,sweep:1760};
 if(event.type==='end')return {duration:.3,noise:0,low:700,high:4000,tone:.05,pitch:440,sweep:660};
 return null;
}
