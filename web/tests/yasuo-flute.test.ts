import {describe,it,expect,vi,afterEach} from 'vitest';
import {Match} from '../src/game/Match';
import {fluteActive,fluteShortcut} from '../src/game/YasuoFlute';
import {YasuoAnimator,YASUO_FLUTE} from '../src/render/YasuoAnimation';
import {AudioFeedback} from '../src/ui/AudioFeedback';
import {OriginalCombatAudio} from '../src/ui/OriginalCombatAudio';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function setup(){const match=new Match({ai:false,waves:false});match.phase='playing';return match;}
describe('Yasuo flute action',()=>{
 it('accepts Ctrl+3 and the plain-3 fallback, and clears movement without spending mana',()=>{
  const key={code:'Digit3',ctrlKey:true,altKey:false,metaKey:false,shiftKey:false};
  expect(fluteShortcut(key)).toBe(true);expect(fluteShortcut({...key,ctrlKey:false})).toBe(true);
  expect(fluteShortcut({...key,code:'Numpad3',ctrlKey:false})).toBe(true);
  expect(fluteShortcut({...key,code:'',key:'3'})).toBe(true);
  expect(fluteShortcut({...key,metaKey:true})).toBe(false);
  expect(fluteShortcut({...key,code:'Digit2'})).toBe(false);expect(fluteShortcut({...key,altKey:true})).toBe(false);
  const match=setup(),hero=match.hero('blue'),mana=hero.mana;
  match.orderMove('blue',{x:400,y:400});expect(match.startFlute()).toBe(true);
  expect(hero.destination).toBeNull();expect(hero.targetId).toBeNull();expect(hero.mana).toBe(mana);
  const animator=new YasuoAnimator();expect(animator.sample(hero,0).state).toBe('flute');
  expect(animator.sample(hero,.25).frame).toBe(2);expect(animator.sample(hero,4.25).frame).toBe(2);
  match.step(24.25);expect(fluteActive(hero,match.time)).toBe(true);expect(animator.sample(hero,match.time).state).toBe('flute');expect(animator.sample(hero,match.time).frame).toBe(2);
  match.stop('blue');expect(animator.sample(hero,match.time).state).toBe('idle');
  expect(YASUO_FLUTE.frame_count).toBe(32);expect(YASUO_FLUTE.durations_ms.reduce((a,b)=>a+b,0)).toBe(4000);
 });
 it('cancels for move, attack, skill, stop or damage; cannot interrupt a committed attack',()=>{
  for(const cancel of ['move','attack','cast','stop','hit']){
   const match=setup(),hero=match.hero('blue'),enemy=match.hero('red');match.startFlute();
   if(cancel==='move')match.orderMove('blue',{x:400,y:400});
   if(cancel==='attack')match.orderAttack('blue',enemy.id);
   if(cancel==='cast')match.cast('blue','q',{x:hero.x+30,y:hero.y});
   if(cancel==='stop')match.stop('blue');
   if(cancel==='hit')match.damage(enemy,hero,1);
   expect(fluteActive(hero,match.time)).toBe(false);
  }
  const match=setup(),hero=match.hero('blue');hero.windup=.2;hero.attackStartedAt=0;
  expect(match.startFlute()).toBe(false);hero.hp=0;expect(match.startFlute()).toBe(false);
  match.phase='paused';expect(match.startFlute()).toBe(false);
 });
 it('plays once with current animation offset, and stops on cancel, mute and pause',()=>{
  vi.stubGlobal('AudioContext',class{state='running';});vi.spyOn(OriginalCombatAudio.prototype,'load').mockResolvedValue();
  const play=vi.spyOn(OriginalCombatAudio.prototype,'playFlute').mockReturnValue(true);
  const stop=vi.spyOn(OriginalCombatAudio.prototype,'stopFlute');
  const audio=new AudioFeedback();audio.unlock();const match=setup();match.startFlute();match.time=.2;
  audio.updateMovement(match);audio.updateMovement(match);expect(play).toHaveBeenCalledTimes(1);expect(play).toHaveBeenLastCalledWith(expect.anything(),.2);
  match.time=30.2;audio.updateMovement(match);expect(play).toHaveBeenCalledTimes(1);
  match.phase='paused';audio.updateMovement(match);expect(stop).toHaveBeenCalled();
  match.phase='playing';audio.updateMovement(match);expect(play).toHaveBeenCalledTimes(2);expect(play).toHaveBeenLastCalledWith(expect.anything(),30.2);
  audio.toggle();audio.updateMovement(match);expect(play).toHaveBeenCalledTimes(2);
  audio.toggle();match.stop('blue');audio.updateMovement(match);expect(play).toHaveBeenCalledTimes(2);audio.dispose();
 });
});
