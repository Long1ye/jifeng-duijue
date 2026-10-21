import {describe,it,expect} from 'vitest';
import {CombatFeel,recoilDistance,impactProfile} from '../src/render/CombatFeel';
import {Q_FLASH_START,qSwordFlash} from '../src/render/YasuoQDraw';
import {YASUO_Q_CAST_SECONDS,YASUO_Q_HIT_SECONDS} from '../src/game/YasuoQ';
import {combatSound} from '../src/ui/CombatSound';
import {createCombatPractice} from '../src/game/CombatPractice';
import type {GameEvent,ImpactKind} from '../src/game/types';
import {grantStorm} from '../src/game/YasuoStorm';
const hit=(extra:Partial<GameEvent>={}):GameEvent=>({type:'hit',team:'blue',x:100,y:0,at:1,sourceId:1,targetId:2,sourceKind:'hero',targetKind:'hero',from:{x:0,y:0},impact:'q',amount:85,...extra});
describe('contact presentation',()=>{
 it('keeps movement recovery artwork separate and permanently cancels it for a new spell',()=>{
  const feel=new CombatFeel(),match=createCombatPractice(),hero=match.hero('blue');
  hero.qCast=null;feel.beginQ(hero.id,0,YASUO_Q_HIT_SECONDS,Math.PI/4);
  const before=structuredClone(hero);
  expect(feel.qPresentation(hero,.55)).toMatchObject({startedAt:0,facing:Math.PI/4});
  expect(hero).toEqual(before);
  hero.wCast={startedAt:.56,facing:0};expect(feel.qPresentation(hero,.56)).toBeNull();
  hero.wCast=null;expect(feel.qPresentation(hero,.6)).toBeNull();
  feel.beginQ(hero.id,1,YASUO_Q_HIT_SECONDS,0);
  expect(feel.qPresentation(hero,1.7)).not.toBeNull();
  expect(feel.qPresentation(hero,1+YASUO_Q_CAST_SECONDS)).toBeNull();
  feel.reset();expect(feel.qPresentation(hero,1.5)).toBeNull();
 });
 it('holds only the attacker action briefly, then catches up monotonically',()=>{
  const feel=new CombatFeel();feel.event(hit(),1);
  expect(feel.actionTime(1,1.02)).toBe(1);expect(feel.actionTime(2,1.02)).toBe(1.02);
  let previous=1;
  for(let i=0;i<=30;i++){
   const time=1+i*.01,value=feel.actionTime(1,time);
   expect(value).toBeGreaterThanOrEqual(previous);expect(value).toBeLessThanOrEqual(time);previous=value;
  }
  expect(feel.actionTime(1,1.15)).toBe(1.15);
 });
 it('does not stall a dash or a distant tornado caster',()=>{
  for(const impact of ['e','q3'] as const){const feel=new CombatFeel();feel.event(hit({impact}),1);expect(feel.actionTime(1,1.02)).toBe(1.02);}
 });
 it('keeps a cleave from extending one stop and ignores minion-only contact',()=>{
  const feel=new CombatFeel();feel.event(hit(),1);feel.event(hit({at:1.04,targetId:3}),1.04);
  const single=new CombatFeel();single.event(hit(),1);
  expect(feel.actionTime(1,1.06)).toBe(single.actionTime(1,1.06));
  const quiet=new CombatFeel();quiet.event(hit({sourceKind:'melee',targetKind:'ranged'}),1);
  expect(quiet.reaction(2,1.02).active).toBe(false);
 });
 it('recoils in the incoming direction with a small rebound and no persistent displacement',()=>{
  const feel=new CombatFeel(),event=Object.freeze(hit());feel.event(event,1);
  expect(feel.reaction(2,1.02).x).toBeGreaterThan(0);expect(feel.reaction(2,1.02).y).toBe(0);
  expect(recoilDistance(.16,6)).toBeLessThan(0);expect(recoilDistance(.22,6)).toBe(0);
  expect(feel.reaction(2,1.24).active).toBe(false);expect(event.x).toBe(100);
  const other=new CombatFeel();other.event(hit({from:{x:200,y:0}}),1);expect(other.reaction(2,1.02).x).toBeLessThan(0);
 });
 it('freezes on a stopped simulation clock and clears on restart',()=>{
  const feel=new CombatFeel();feel.update(1);feel.event(hit(),1);feel.update(1.02);
  const before=feel.reaction(2,1.02);feel.update(1.02);expect(feel.reaction(2,1.02)).toEqual(before);
  feel.update(0);expect(feel.reaction(2,.02).active).toBe(false);expect(feel.actionTime(1,.02)).toBe(.02);
 });
 it('reserves bigger contacts for heavy skills and separate audio for swings and hits',()=>{
  expect(impactProfile('r').length).toBeGreaterThan(impactProfile('attack').length);
  expect(combatSound(hit())!.noise).toBeGreaterThan(combatSound(hit({type:'attack'}))!.noise);
  expect(combatSound(hit({sourceKind:'melee',targetKind:'ranged'}))).toBeNull();
  expect(combatSound(hit({type:'move'}))).toBeNull();
  expect(combatSound(hit({impact:'e'}))).not.toEqual(combatSound(hit({impact:'q'})));
 });
});
describe('simulation feedback context',()=>{
 it('shows the Q sword flash on its fixed thrust contact tick',()=>{
  const match=createCombatPractice(),feel=new CombatFeel();match.start();const hero=match.hero('blue'),target=match.hero('red');
  match.cast('blue','q',target);feel.beginQ(hero.id,hero.qCast!.startedAt,YASUO_Q_HIT_SECONDS);
  let contact:GameEvent|undefined;
  for(let i=0;i<60&&!contact;i++){
   match.step(1/60);
   for(const event of match.drainEvents()){feel.event(event,match.time);if(event.type==='hit'&&event.targetId===target.id)contact=event;}
  }
  expect(contact).toBeDefined();expect(match.time).toBeGreaterThanOrEqual(YASUO_Q_HIT_SECONDS);expect(match.time).toBeLessThan(YASUO_Q_HIT_SECONDS+1/60);
  const age=feel.qAge(hero.id,hero.qCast!.startedAt,match.time,Q_FLASH_START,YASUO_Q_CAST_SECONDS);
  expect(qSwordFlash(age,hero.x,hero.y,hero.facing).visible).toBe(true);
  expect(feel.qAge(hero.id,0,YASUO_Q_CAST_SECONDS,Q_FLASH_START,YASUO_Q_CAST_SECONDS)).toBe(YASUO_Q_CAST_SECONDS);
 });
 it('keeps a missed Q moving through its predicted contact without a stop',()=>{
  const feel=new CombatFeel();feel.beginQ(1,0,.24);
  const a=feel.qAge(1,0,.25,Q_FLASH_START,.72),b=feel.qAge(1,0,.27,Q_FLASH_START,.72);
  expect(b).toBeGreaterThan(a);
 });
 it('records stable source and target snapshots without changing damage or positions',()=>{
  const match=createCombatPractice(),source=match.hero('blue'),target=match.hero('red');match.start();
  const before={x:target.x,y:target.y,hp:target.hp};match.damage(source,target,43);
  const event=match.drainEvents().find(e=>e.type==='hit')!;
  expect(event).toMatchObject({sourceId:source.id,targetId:target.id,impact:'attack',sourceKind:'hero',targetKind:'hero',at:match.time});
  expect(target.hp).toBe(before.hp-43);expect({x:target.x,y:target.y}).toEqual({x:before.x,y:before.y});
  source.x+=20;expect(event.from?.x).not.toBe(source.x);
 });
 it.each(['q','e','q3','r'] as const)('identifies real %s contacts at the damage tick',(kind)=>{
  const match=createCombatPractice();match.start();const source=match.hero('blue'),target=match.hero('red');
  if(kind==='q3'){grantStorm(source,0);grantStorm(source,0);}
  if(kind==='r')target.airborneUntil=3;
  expect(match.cast('blue',kind==='q3'?'q':kind,target)).toBe(true);
  const events:GameEvent[]=[];
  for(let i=0;i<90;i++){match.step(1/60);events.push(...match.drainEvents());}
  const contacts=events.filter(e=>e.type==='hit'&&e.sourceId===source.id&&e.targetId===target.id);
  expect(contacts.length).toBeGreaterThan(0);expect(contacts[0].impact).toBe(kind as ImpactKind);
 });
 it('reports melee attack release and contact in the same tick',()=>{
  const match=createCombatPractice();match.start();match.orderAttack('blue',match.hero('red').id);
  const events:GameEvent[]=[];for(let i=0;i<60;i++){match.step(1/60);events.push(...match.drainEvents());}
  const swing=events.find(e=>e.type==='attack'),contact=events.find(e=>e.type==='hit'&&e.sourceKind==='hero');
  expect(swing).toBeDefined();expect(contact).toBeDefined();expect(contact!.at).toBe(swing!.at!);
 });
});
