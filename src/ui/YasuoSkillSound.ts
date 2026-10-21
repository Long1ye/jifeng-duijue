import type {GameEvent} from '../game/types';
export type SkillSound='q-cast'|'q-hit'|'q3-cast'|'q3-hit'|'w-cast'|'w-loop'|'e-cast'|'e-hit'|'r-slash'|'r-hit';
/** These are effects only. Player-supplied speech stays on its own channel. */
export function yasuoSkillSound(event:GameEvent):SkillSound|null {
 if(event.type==='cast'){
  if(event.ability==='q')return event.impact==='q3'||event.impact==='eq3'?'q3-cast':'q-cast';
  if(event.ability==='w')return 'w-cast';
  if(event.ability==='e')return 'e-cast';
  if(event.ability==='r')return 'r-slash';
 }
 if(event.type==='hit'&&event.sourceKind==='hero'){
  if(event.impact==='q3'||event.impact==='eq3')return 'q3-hit';
  if(event.impact==='q'||event.impact==='eq')return 'q-hit';
  if(event.impact==='e')return 'e-hit';
  if(event.impact==='r')return 'r-hit';
 }
 return null;
}
