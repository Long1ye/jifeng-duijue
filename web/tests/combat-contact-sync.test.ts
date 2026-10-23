import {describe,it,expect} from 'vitest';
import {Match} from '../src/game/Match';
import {grantStorm} from '../src/game/YasuoStorm';
import {eqPresentation,contactPosition,airborneLift} from '../src/render/SkillPresentation';
import {CombatFeel} from '../src/render/CombatFeel';
import {OriginalCombatAudio} from '../src/ui/OriginalCombatAudio';
import type {GameEvent} from '../src/game/types';

describe('combat contacts stay aligned with presentation',()=>{
 it.each([false,true])('aligns the full EQ ring with all actual victims (empowered=%s)',empowered=>{
  const m=new Match({ai:false,waves:false});m.start();
  const h=m.hero('blue'),enemy=m.hero('red');
  Object.assign(h,{x:500,y:350});Object.assign(enemy,{x:559,y:350,speed:0,damage:0,hp:2000,maxHp:2000});
  if(empowered){grantStorm(h,0);grantStorm(h,0);}
  expect(m.cast('blue','e',enemy)).toBe(true);
  const end=h.eCast!.end;
  const second=m.spawnMinion('red','melee',{x:end.x,y:end.y+24});second.speed=0;second.damage=0;
  const miss=m.spawnMinion('red','melee',{x:end.x,y:end.y+65});miss.speed=0;miss.damage=0;
  expect(m.cast('blue','q',enemy)).toBe(true);
  const cast={...h.eqCast!},kind=empowered?'eq3':'eq',events:GameEvent[]=[];
  expect(eqPresentation(cast,cast.startedAt-.01).visible).toBe(false);
  expect(eqPresentation(cast,cast.triggerAt-.001).frame).toBe(2);
  while(m.time<cast.triggerAt+1/120){m.step(1/120);events.push(...m.drainEvents());}
  const contacts=events.filter(e=>e.type==='hit'&&e.impact===kind);
  expect(contacts.map(e=>e.targetId).sort()).toEqual([enemy.id,second.id].sort());
  for(const event of contacts){
   expect(eqPresentation(cast,event.at!).frame).toBe(3);
   expect(eqPresentation(cast,event.at!).contact).toBe(true);
   const victim=m.entity(event.targetId!)!;
   expect(event.amount).toBeGreaterThan(0);
   if(empowered)expect(airborneLift(victim,m.time)).toBeGreaterThan(0);
  }
  expect(miss.hp).toBe(miss.maxHp);
  expect(eqPresentation(cast,cast.endsAt).visible).toBe(false);
 });
 it('keeps contact attached to a moving airborne victim without mutating it',()=>{
  const m=new Match({ai:false,waves:false}),target=m.hero('red');
  Object.assign(target,{x:600,y:350,airborneUntil:2});
  const hit:GameEvent={type:'hit',team:'blue',x:590,y:350,from:{x:550,y:350},targetKind:'hero',impact:'eq3'};
  const airborne=contactPosition(hit,1,target),grounded=contactPosition(hit,2,target);
  expect(grounded.y-airborne.y).toBeCloseTo(airborneLift(target,1));
  expect(airborne.groundX).toBe(600);expect(target.y).toBe(350);expect(hit.x).toBe(590);
 });
 it('does not create hit reactions or contact audio merely for a cast',()=>{
  const audio=new OriginalCombatAudio(),feel=new CombatFeel();
  const cast:GameEvent={type:'cast',team:'blue',x:0,y:0,ability:'q',sourceKind:'hero',sourceId:1,targetId:2};
  feel.event(cast,1);expect(feel.reaction(2,1).active).toBe(false);
  // A null original hit sample must reach AudioFeedback's contact synth instead of being swallowed.
  const hit:GameEvent={...cast,type:'hit',impact:'eq',targetKind:'hero'};
  expect(audio.play(hit,{} as AudioContext)).toBe(false);
  expect(audio.play({...hit,impact:'eq3'},{} as AudioContext)).toBe(false);
  audio.dispose();
 });
});
