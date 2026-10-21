import {describe,it,expect,vi,afterEach} from 'vitest';
import {MapMusic} from '../src/ui/MapMusic';
import {OriginalCombatAudio} from '../src/ui/OriginalCombatAudio';
import {originalSound} from '../src/ui/OriginalSoundMap';
import type {GameEvent} from '../src/game/types';
import validation from '../assets/audio/riot-original/validation.json';
import userAudio from '../assets/audio/yasuo-user-v1/manifest.json';
afterEach(()=>vi.unstubAllGlobals());
const event=(extra:Partial<GameEvent>={}):GameEvent=>({type:'hit',team:'blue',x:0,y:0,sourceKind:'hero',targetKind:'hero',impact:'q',...extra});
describe('original source routing and validation',()=>{
 it('routes both Yasuo teams consistently while keeping cast samples separate from hit accents',()=>{
  expect(originalSound(event({type:'cast',ability:'q'}))).toBe('yasuo-q-user-v1');
  expect(originalSound(event({type:'cast',ability:'q',impact:'q3'}))).toBe('yasuo-q3-user');
  expect(originalSound(event({impact:'r'}))).toBeNull();
  expect(originalSound(event({impact:'e'}))).toBeNull();
  expect(originalSound(event({team:'red'}))).toBeNull();
  expect(originalSound(event({team:'red',type:'cast',ability:'e'}))).toBeNull();
  expect(originalSound(event({sourceKind:'melee'}))).toBeNull();
 });
 it('uses user-named Q variants and extracted R without the former overlapping hit sounds',()=>{
  expect(originalSound(event({type:'cast',ability:'q'}),1)).toBe('yasuo-q-user-v2');
  expect(originalSound(event({type:'cast',ability:'q'}),2)).toBe('yasuo-q-user-v1');
  expect(originalSound(event({type:'cast',ability:'r'}))).toBe('yasuo-r-user');
  expect(originalSound(event({type:'cast',ability:'q',impact:'eq3'}))).toBe('yasuo-q3-user');
  expect(originalSound(event({impact:'q3'}))).toBeNull();
  expect(originalSound(event({impact:'eq3'}))).toBeNull();
  expect(userAudio.find(f=>f.file==='yasuo-q3-user.mp3')?.duration).toBeGreaterThan(1);
  expect(originalSound(event())).toBeNull();
  for(const record of userAudio){expect(record.peak).toBeLessThan(1);expect(record.rms).toBeGreaterThan(.02);expect(record.source_sha256).toHaveLength(64);}
 });
 it('contains a full BGM and sixteen non-silent decodable effect clips without clipping',()=>{
  expect(validation).toHaveLength(17);expect(validation.find(f=>f.file==='howling-abyss-early.mp3')!.seconds).toBeGreaterThan(300);
  for(const record of validation){expect(record.rms).toBeGreaterThan(.005);expect(record.peak).toBeLessThanOrEqual(1);expect(record.sha256).toHaveLength(64);}
 });
});
describe('streamed map music lifecycle',()=>{
 function setup(){
  const media={preload:'',loop:false,volume:0,currentTime:0,play:vi.fn(async()=>{}),pause:vi.fn(),removeAttribute:vi.fn(),load:vi.fn()};
  const ctor=vi.fn(function(){return media;});vi.stubGlobal('Audio',ctor);return {media,ctor,music:new MapMusic()};
 }
 it('does not request music while muted; reuses it and pauses for pause, hidden or ended',async()=>{
  const {media,ctor,music}=setup();music.update(0,'playing',false);expect(ctor).not.toHaveBeenCalled();
  music.update(1,'playing',true);await Promise.resolve();music.update(2,'playing',true);expect(ctor).toHaveBeenCalledTimes(1);expect(media.play).toHaveBeenCalledTimes(1);expect(media.loop).toBe(true);
  music.update(2,'paused',true);expect(media.pause).toHaveBeenCalled();music.update(2,'playing',true);music.update(3,'playing',true,false);expect(media.pause).toHaveBeenCalledTimes(2);
  music.update(3,'playing',true);music.update(4,'ended',true);expect(media.pause).toHaveBeenCalledTimes(3);music.dispose();
 });
 it('ducks for combat and resets the playhead on a new match',()=>{
  const {media,music}=setup();music.update(10,'playing',true);const normal=media.volume;
  music.noticeCombat(10);music.update(10.5,'playing',true);expect(media.volume).toBeLessThan(normal);
  music.update(12,'playing',true);expect(media.volume).toBe(normal);media.currentTime=20;music.update(0,'playing',true);expect(media.currentTime).toBe(0);music.dispose();
 });
 it('contains autoplay failure without retrying every HUD frame',async()=>{
  const {media,music}=setup();media.play.mockRejectedValue(new Error('blocked'));
  music.update(0,'playing',true);await vi.waitFor(()=>expect(music.failed).toBe(true));music.update(1,'playing',true);expect(media.play).toHaveBeenCalledTimes(1);
  music.update(1,'playing',false);music.update(1,'playing',true);expect(media.play).toHaveBeenCalledTimes(2);music.dispose();
 });
 it('never leaves a late play request running after mute',async()=>{
  const {media,music}=setup();let resolve!:()=>void;media.play.mockImplementation(()=>new Promise<void>(r=>resolve=r));
  music.update(0,'playing',true);music.update(.1,'playing',false);resolve();await Promise.resolve();expect(media.pause).toHaveBeenCalledTimes(2);music.dispose();
 });
});
describe('sample voice lifecycle',()=>{
 it('caches decoding, coalesces cleaves, and disconnects voices on mute',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})));
  const sources:{buffer?:unknown;loop?:boolean;onended?:()=>void;start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>}[]=[];
  const context={currentTime:1,decodeAudioData:vi.fn(async()=>({duration:.4})),destination:{},
   createBufferSource:()=>{const source={buffer:null as unknown,start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),connect:vi.fn()};sources.push(source);return source;},
   createGain:()=>({gain:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()})};
  const ctx=context as unknown as AudioContext,audio=new OriginalCombatAudio();await audio.load(ctx);await audio.load(ctx);
  expect(context.decodeAudioData).toHaveBeenCalledTimes(17);audio.play(event({impact:'attack'}),ctx);audio.play(event({impact:'attack'}),ctx);expect(sources).toHaveLength(1);
  context.currentTime=2;audio.play(event({impact:'attack'}),ctx);expect(sources).toHaveLength(2);
  for(let i=3;i<=5;i++){context.currentTime=i;audio.play(event({type:'cast',ability:'q'}),ctx);}
  expect(sources[2].buffer).not.toBe(sources[3].buffer);expect(sources[4].buffer).toBe(sources[2].buffer);
  context.currentTime=6;audio.play(event({type:'cast',ability:'r'}),ctx);const count=sources.length;
  audio.play(event({impact:'r'}),ctx);expect(sources).toHaveLength(count);
  expect(audio.playMovement(0,ctx)).toBe(true);const walk=sources.at(-1)!;expect(audio.movementPlaying).toBe(true);
  expect(audio.playMovement(1,ctx)).toBe(false);audio.stopMovement();expect(walk.disconnect).toHaveBeenCalledTimes(1);expect(audio.movementPlaying).toBe(false);
  expect(sources[0].disconnect).not.toHaveBeenCalled();expect(audio.playMovement(1,ctx)).toBe(true);expect(sources.at(-1)!.buffer).not.toBe(walk.buffer);
  sources.at(-1)!.onended!();expect(audio.movementPlaying).toBe(false);
  expect(audio.playFlute(ctx,.2)).toBe(true);expect(sources.at(-1)!.start).toHaveBeenCalledWith(context.currentTime,.2);
  expect(audio.playFlute(ctx,.2)).toBe(false);audio.stopFlute();expect(audio.flutePlaying).toBe(false);
  expect(audio.playFlute(ctx,20.2)).toBe(true);expect(sources.at(-1)!.loop).toBe(true);
  expect(sources.at(-1)!.start.mock.calls[0][1]).toBeCloseTo(.2);audio.stopFlute();
  audio.stop();expect(sources.every(v=>v.disconnect.mock.calls.length===1)).toBe(true);audio.dispose();
 });
});
