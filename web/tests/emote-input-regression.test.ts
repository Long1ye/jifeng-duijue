import {afterEach,describe,expect,it,vi} from 'vitest';
import {equipmentShortcut} from '../src/ui/EquipmentShortcuts';
import {emoteShortcut} from '../src/game/YasuoEmote';
import {AudioFeedback} from '../src/ui/AudioFeedback';
import {YasuoVoiceAudio} from '../src/ui/YasuoVoiceAudio';
import {Match} from '../src/game/Match';
import {executeCommand,matchState,applyState} from '../src/network/protocol';

afterEach(()=>vi.restoreAllMocks());
const key=(digit:string,altKey=false,code='Digit'+digit)=>({key:digit,code,altKey,ctrlKey:false,metaKey:false,shiftKey:false});
describe('emote and equipment input regression',()=>{
 it('keeps plain 1/2/4 for emotes on both the main keyboard and numpad',()=>{
  for(const digit of ['1','2','4'])for(const prefix of ['Digit','Numpad']){
   const event=key(digit,false,prefix+digit);
   expect(emoteShortcut(event)).not.toBeNull();expect(equipmentShortcut(event)).toBeNull();
   expect(emoteShortcut({...event,altKey:true})).toBeNull();
   expect(equipmentShortcut({...event,altKey:true})).toBe(digit==='1'?0:digit==='2'?1:6);
  }
 });
 it('keeps the other four equipment keys and ignores modified typing',()=>{
  for(const [index,digit] of ['5','6','7','8'].entries()){
   expect(equipmentShortcut(key(digit))).toBe(index+2);
   expect(equipmentShortcut(key(digit,true))).toBeNull();
  }
  for(const modifier of ['ctrlKey','metaKey','shiftKey'])expect(equipmentShortcut({...key('1',true),[modifier]:true})).toBeNull();
  expect(equipmentShortcut(key('3'))).toBeNull();
 });
 it('starts speech once when the server confirms an emote, and interrupts on cancellation',()=>{
  const authority=new Match({ai:false,waves:false}),client=new Match({ai:false,waves:false});authority.start();client.start();
  const audio=new AudioFeedback(),speak=vi.spyOn(audio,'emote').mockReturnValue(true);
  const interrupt=vi.spyOn(YasuoVoiceAudio.prototype,'interruptEmote');
  audio.updateMovement(client);expect(speak).not.toHaveBeenCalled();
  executeCommand(authority,'blue',{kind:'emote',action:'joke'});
  audio.updateMovement(client);expect(speak).not.toHaveBeenCalled();
  applyState(client,matchState(authority));audio.updateMovement(client);
  expect(speak).toHaveBeenCalledExactlyOnceWith('joke',client);
  audio.updateMovement(client);expect(speak).toHaveBeenCalledTimes(1);
  authority.orderMove('blue',{x:authority.hero('blue').x+60,y:authority.hero('blue').y});
  applyState(client,matchState(authority));audio.updateMovement(client);expect(interrupt).toHaveBeenCalledOnce();
  audio.dispose();
 });
 it('does not replay a looping emote after pause, mute or hidden state',()=>{
  const match=new Match({ai:false,waves:false});match.start();const audio=new AudioFeedback();
  const speak=vi.spyOn(audio,'emote').mockReturnValue(true);
  match.startEmote('laugh');audio.updateMovement(match);expect(speak).toHaveBeenCalledOnce();
  audio.stop();match.phase='paused';audio.updateMovement(match);match.phase='playing';audio.updateMovement(match);
  audio.enabled=false;audio.updateMovement(match);audio.enabled=true;audio.updateMovement(match,false);audio.updateMovement(match);
  expect(speak).toHaveBeenCalledOnce();
  match.time=6;match.startEmote('taunt');audio.updateMovement(match);expect(speak).toHaveBeenLastCalledWith('taunt',match);
  audio.dispose();
 });
});
