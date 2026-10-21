import {describe,it,expect,vi,afterEach} from 'vitest';
import {Match} from '../src/game/Match';
import type {GameEvent} from '../src/game/types';
import {W_DURATION} from '../src/game/WindWall';
import {YasuoSkillAudio} from '../src/ui/YasuoSkillAudio';
import {yasuoSkillSound} from '../src/ui/YasuoSkillSound';
import manifest from '../assets/audio/yasuo-client-v1/manifest.json';
afterEach(()=>vi.unstubAllGlobals());
const event=(extra:Partial<GameEvent>={}):GameEvent=>({type:'cast',team:'blue',x:0,y:0,ability:'q',sourceKind:'hero',...extra});
function setup(){
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
 const sources:{loop:boolean;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended?:()=>void}[]=[];
 const parameter=()=>({cancelScheduledValues:vi.fn(),setValueAtTime:vi.fn(),linearRampToValueAtTime:vi.fn()});
 const ctx={currentTime:1,state:'running',destination:{},decodeAudioData:vi.fn(async()=>({duration:10.5})),
  createBufferSource:()=>{const s={buffer:null,loop:false,start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn()};sources.push(s);return s;},
  createGain:()=>({gain:parameter(),connect:vi.fn(),disconnect:vi.fn()})};
 const audio=new YasuoSkillAudio(),match=new Match({ai:false,waves:false});match.phase='playing';
 const hero=match.hero('blue');match.windWalls=[{id:100,team:'blue',x:hero.x,y:hero.y,angle:0,startsAt:.3}];
 return {audio,match,ctx:ctx as unknown as AudioContext,sources,decode:ctx.decodeAudioData};
}
describe('original Yasuo skill routing',()=>{
 it('separates ability casts and actual contact sounds for both teams',()=>{
  expect(yasuoSkillSound(event())).toBe('q-cast');expect(yasuoSkillSound(event({impact:'eq3'}))).toBe('q3-cast');
  expect(yasuoSkillSound(event({ability:'w'}))).toBe('w-cast');expect(yasuoSkillSound(event({ability:'e'}))).toBe('e-cast');
  expect(yasuoSkillSound(event({ability:'r'}))).toBe('r-slash');
  for(const team of ['blue','red'] as const){
   expect(yasuoSkillSound(event({type:'hit',team,impact:'q'}))).toBe('q-hit');
   expect(yasuoSkillSound(event({type:'hit',team,impact:'e'}))).toBe('e-hit');
   expect(yasuoSkillSound(event({type:'hit',team,impact:'r'}))).toBe('r-hit');
  }
  expect(yasuoSkillSound(event({type:'hit',sourceKind:'melee',impact:'attack'}))).toBeNull();
  expect(manifest.clips).toHaveLength(10);
  for(const clip of manifest.clips){expect(clip.peak).toBeLessThan(1);expect(clip.rms).toBeGreaterThan(.01);expect(clip.event).toContain('Play_sfx_Yasuo_');}
 });
 it('caches ten samples and coalesces multi-target contacts without procedural fallback',async()=>{
  const {audio,ctx,sources,decode}=setup();await audio.load(ctx);await audio.load(ctx);expect(decode).toHaveBeenCalledTimes(10);
  expect(audio.play(event({type:'hit',impact:'q'}),ctx)).toBe(true);audio.play(event({type:'hit',impact:'q'}),ctx);expect(sources).toHaveLength(1);
  audio.play(event({ability:'e'}),ctx);audio.play(event({ability:'r'}),ctx);expect(sources).toHaveLength(3);
  audio.stop();expect(sources.every(s=>s.stop.mock.calls.length===1)).toBe(true);
  for(const source of sources)source.onended!();expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);audio.dispose();
 });
});
describe('wind wall audio lifetime',()=>{
 it('starts only at activation, maintains one loop, and stops at exact simulation expiry',async()=>{
  const {audio,match,ctx,sources}=setup();await audio.load(ctx);
  match.time=.29;audio.update(match,ctx,true,true);expect(sources).toHaveLength(0);
  match.time=.3;audio.update(match,ctx,true,true);expect(sources).toHaveLength(1);expect(sources[0].loop).toBe(true);
  match.time=1.3;audio.update(match,ctx,true,true);expect(sources).toHaveLength(1);expect(sources[0].stop).not.toHaveBeenCalled();
  match.time=.3+W_DURATION;audio.update(match,ctx,true,true);expect(sources[0].stop).toHaveBeenCalledTimes(1);audio.dispose();
 });
 it('stops for pause, mute or hidden and resumes at the current wall age',async()=>{
  const {audio,match,ctx,sources}=setup();await audio.load(ctx);match.time=1.3;audio.update(match,ctx,true,true);
  match.phase='paused';audio.update(match,ctx,true,true);expect(sources[0].stop).toHaveBeenCalledTimes(1);
  match.phase='playing';audio.update(match,ctx,true,true);expect(sources[1].start).toHaveBeenCalledWith(ctx.currentTime,1);
  audio.update(match,ctx,false,true);expect(sources[1].stop).toHaveBeenCalledTimes(1);
  audio.update(match,ctx,true,true);audio.update(match,ctx,true,false);expect(sources[2].stop).toHaveBeenCalledTimes(1);audio.dispose();
 });
 it('cleans removed walls and resets even if the new match reuses wall ids',async()=>{
  const {audio,match,ctx,sources}=setup();await audio.load(ctx);match.time=2;audio.update(match,ctx,true,true);
  match.time=.4;audio.update(match,ctx,true,true);expect(sources[0].stop).toHaveBeenCalledTimes(1);expect(sources).toHaveLength(2);
  match.windWalls=[];audio.update(match,ctx,true,true);expect(sources[1].stop).toHaveBeenCalledTimes(1);audio.dispose();
 });
});
