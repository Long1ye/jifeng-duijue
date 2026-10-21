import {describe,it,expect,vi,afterEach} from 'vitest';
import {AudioFeedback} from '../src/ui/AudioFeedback';
import type {GameEvent} from '../src/game/types';

afterEach(()=>vi.unstubAllGlobals());
function fakeContext(){
 const sources:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended?:()=>void}[]=[];
 const parameter=()=>({value:0,setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn(),exponentialRampToValueAtTime:vi.fn()});
 const source=()=>{const s={start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),frequency:parameter(),playbackRate:{value:1}};sources.push(s);return s;};
 const context={state:'running',currentTime:1,sampleRate:44100,destination:{},resume:vi.fn(async()=>{}),
  createBuffer:vi.fn((_channels:number,length:number)=>({getChannelData:()=>new Float32Array(length)})),
  createBufferSource:vi.fn(source),createOscillator:vi.fn(source),
  createGain:()=>({gain:parameter(),connect:vi.fn(),disconnect:vi.fn()}),
  createBiquadFilter:()=>({frequency:parameter(),connect:vi.fn(),disconnect:vi.fn()})};
 vi.stubGlobal('AudioContext',class{constructor(){return context;}});return {context,sources};
}
// Generic incoming minion impact still uses the compact procedural fallback.
const hit:GameEvent={type:'hit',team:'red',x:0,y:0,sourceKind:'melee',targetKind:'hero',impact:'attack'};
describe('foreground combat audio',()=>{
 it('creates no context or voices while muted, and stops both layers when muted again',()=>{
  const {sources}=fakeContext(),audio=new AudioFeedback();audio.toggle();audio.unlock();audio.play(hit);expect(sources).toHaveLength(0);expect(audio.audioContext).toBeNull();
  audio.toggle();audio.play(hit);expect(sources).toHaveLength(2);expect(sources.every(s=>s.start.mock.calls.length===1)).toBe(true);
  audio.toggle();expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
  audio.play(hit);expect(sources).toHaveLength(2);audio.dispose();
 });
 it('coalesces simultaneous cleave contacts, caches noise, and bounds active voices',()=>{
  const {context,sources}=fakeContext(),audio=new AudioFeedback();audio.unlock();audio.play(hit);audio.play(hit);
  expect(sources).toHaveLength(2);
  for(let i=0;i<12;i++){context.currentTime+=.05;audio.play(hit);}
  expect(context.createBuffer).toHaveBeenCalledTimes(1);
  expect(sources.filter(s=>!s.disconnect.mock.calls.length).length).toBeLessThanOrEqual(16);
  audio.dispose();expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
 });
 it('disconnects finished voices and stays silent for ordinary minion battles and movement',()=>{
  const {sources}=fakeContext(),audio=new AudioFeedback();audio.unlock();
  audio.play({...hit,sourceKind:'melee',targetKind:'ranged'});audio.play({...hit,type:'move'});expect(sources).toHaveLength(0);
  audio.play(hit);sources[0].onended!();audio.dispose();expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);
 });
 it('defaults to enabled but waits for interaction, and reuses the unlocked context',()=>{
  const {sources}=fakeContext(),audio=new AudioFeedback();expect(audio.enabled).toBe(true);expect(audio.audioContext).toBeNull();
  audio.play(hit);expect(sources).toHaveLength(0);audio.unlock();const context=audio.audioContext;audio.unlock();expect(audio.audioContext).toBe(context);
  audio.play(hit);expect(sources).toHaveLength(2);audio.dispose();
 });
});
