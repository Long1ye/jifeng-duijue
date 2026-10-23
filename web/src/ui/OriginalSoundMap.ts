import type {GameEvent} from '../game/types';
export type OriginalSound='yasuo-flute-user'|'yasuo-walk-user-v1'|'yasuo-walk-user-v2'|'yasuo-swing'|'yasuo-attack-hit'|'yasuo-q-user-v1'|'yasuo-q-user-v2'|'yasuo-q3-user'|'yasuo-w'|'yasuo-e'|'yasuo-r-user'|'tf-swing'|'tf-hit'|'tf-q-cast'|'tf-q-hit'|'tf-w'|'tf-red-hit';
/** User-supplied Q/R take priority over the earlier public demo extracts. */
export function originalSound(event:GameEvent,qVariant=0):OriginalSound|null{
 // Both teams now use Yasuo; enemy actions share the same action/contact routing.
 if(event.type==='cast'){
  if(event.ability==='q')return event.impact==='q3'||event.impact==='eq3'?'yasuo-q3-user':qVariant%2?'yasuo-q-user-v2':'yasuo-q-user-v1';
  if(event.ability==='w')return null;
  if(event.ability==='e')return null;
  if(event.ability==='r')return 'yasuo-r-user';
 }
 if(event.sourceKind!=='hero')return null;
 if(event.type==='attack')return 'yasuo-swing';
 if(event.type==='hit'){
  if(event.impact==='ignite')return null;
  if(event.impact==='r')return null;
  if(event.impact==='q3'||event.impact==='eq3')return null;
  if(event.impact==='q'||event.impact==='eq')return null;
  // E's cast sample includes its contact; don't play it twice on a short dash.
  if(event.impact==='e')return null;
  return 'yasuo-attack-hit';
 }
 return null;
}
export const originalHeroEvent=(event:GameEvent)=>event.type==='cast'||event.sourceKind==='hero'&&(event.type==='hit'||event.type==='attack');
