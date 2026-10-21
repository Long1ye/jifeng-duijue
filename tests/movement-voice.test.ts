import {describe,it,expect,vi,afterEach} from 'vitest';
import {MovementVoice} from '../src/ui/MovementVoice';
import {AudioFeedback} from '../src/ui/AudioFeedback';
import {OriginalCombatAudio} from '../src/ui/OriginalCombatAudio';
import {YasuoVoiceAudio} from '../src/ui/YasuoVoiceAudio';
import {Match} from '../src/game/Match';
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});
function walk(voice:MovementVoice,start:number,end:number,eligible=true){
 let result:number|null=null;
 for(let i=start;i<=end;i++)result=voice.update(i/10,{x:i*5,y:0},eligible);
 return result;
}
describe('travel voice scheduling',()=>{
 it('requires continuous actual movement; idle clicks and teleports do not count',()=>{
  const voice=new MovementVoice();
  for(let i=0;i<40;i++)expect(voice.update(i/10,{x:0,y:0},true)).toBeNull();
  expect(voice.update(4,{x:1000,y:0},true)).toBeNull();
  expect(walk(new MovementVoice(),0,15)).toBeNull();
  expect(walk(new MovementVoice(),0,23)).toBe(0);
 });
 it('alternates only after playback, waits between lines and resets on a new match',()=>{
  const voice=new MovementVoice();expect(walk(voice,0,23)).toBe(0);
  expect(walk(voice,24,25)).toBe(0); // No loaded buffer: retry the same line.
  voice.played(2.5);expect(walk(voice,26,210)).toBeNull();
  expect(walk(voice,211,216)).toBe(1);voice.played(21.6);
  expect(walk(voice,217,370)).toBeNull();expect(walk(voice,371,380)).toBe(0);
  expect(walk(voice,0,23)).toBe(0);
 });
 it('restarts the movement wait after combat or tab suspension',()=>{
  const voice=new MovementVoice();walk(voice,0,15);walk(voice,16,17,false);
  expect(walk(voice,18,30)).toBeNull();expect(walk(voice,31,40)).toBe(0);
  expect(voice.update(10,{x:300,y:0},true)).toBeNull();
 });
});
describe('travel voice combat integration',()=>{
 it('suppresses nearby enemies and stops for local combat, pause, hidden and mute',()=>{
  vi.stubGlobal('AudioContext',class{state='running';});
  vi.spyOn(OriginalCombatAudio.prototype,'load').mockResolvedValue();
  vi.spyOn(YasuoVoiceAudio.prototype,'load').mockResolvedValue();
  vi.spyOn(YasuoVoiceAudio.prototype,'play').mockImplementation(()=>{});
  const play=vi.spyOn(YasuoVoiceAudio.prototype,'speak').mockReturnValue(true);
  const stop=vi.spyOn(OriginalCombatAudio.prototype,'stopMovement');
  vi.spyOn(OriginalCombatAudio.prototype,'play').mockReturnValue(true);
  const audio=new AudioFeedback();audio.unlock();
  const match=new Match({ai:false,waves:false});match.phase='playing';
  const hero=match.hero('blue');hero.homeguardCombatAt=-Infinity;
  for(const e of match.entities)if(e.team==='red'){e.x=10000;e.y=10000;}
  const advance=(from:number,to:number,near=false)=>{for(let i=from;i<=to;i++){match.time=i/10;hero.x=i*5;if(near){match.hero('red').x=hero.x;match.hero('red').y=hero.y;}audio.updateMovement(match);}};
  advance(0,23);expect(play).toHaveBeenCalledWith('Move2DStandard',expect.anything(),'blue',1);
  audio.play({type:'cast',team:'red',ability:'q',x:0,y:0});expect(stop).not.toHaveBeenCalled();
  audio.play({type:'cast',team:'blue',ability:'q',x:0,y:0});expect(stop).toHaveBeenCalledTimes(1);
  audio.play({type:'hit',team:'red',targetId:hero.id,x:0,y:0});expect(stop).toHaveBeenCalledTimes(2);
  const enemy=match.hero('red');enemy.x=hero.x;enemy.y=hero.y;advance(24,230,true);expect(play).toHaveBeenCalledTimes(1);
  enemy.x=10000;enemy.y=10000;advance(231,254);expect(play).toHaveBeenCalledTimes(2);
  stop.mockClear();match.phase='paused';audio.updateMovement(match);expect(stop).toHaveBeenCalledTimes(1);
  match.phase='playing';audio.updateMovement(match,false);expect(stop).toHaveBeenCalledTimes(2);
  audio.toggle();advance(255,280);expect(play).toHaveBeenCalledTimes(2);audio.dispose();
 });
});
