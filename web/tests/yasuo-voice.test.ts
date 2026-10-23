import { afterEach, expect, it, vi } from 'vitest';
import { YasuoVoiceAudio } from '../src/ui/YasuoVoiceAudio';
import { Match } from '../src/game/Match';
import manifest from '../assets/audio/yasuo-voice-zh-v1/manifest.json';
afterEach(()=>vi.unstubAllGlobals());
async function setup(){
 vi.stubGlobal('fetch',vi.fn(async(url:string)=>({ok:true,arrayBuffer:async()=>new TextEncoder().encode(url).buffer})));
 const sources:{buffer?:{id:string};start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>;disconnect:ReturnType<typeof vi.fn>;onended?:()=>void}[]=[];
 const ctx={state:'running',currentTime:1,destination:{},decodeAudioData:vi.fn(async(data:ArrayBuffer)=>({duration:1,id:new TextDecoder().decode(data).match(/([0-9]+)\.mp3/)?.[1]})),
  createBufferSource:()=>{const s={buffer:null,start:vi.fn(),stop:vi.fn(),disconnect:vi.fn(),connect:vi.fn()};sources.push(s as never);return s;},
  createGain:()=>({gain:{setValueAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()})};
 const audio=new YasuoVoiceAudio(),match=new Match({ai:false,waves:false});match.start();audio.update(match,ctx as never,true,true);await audio.load(ctx as never);
 return{audio,match,ctx:ctx as unknown as AudioContext,sources,decode:ctx.decodeAudioData};
}
it('packages every source in the base Mandarin bank once and caches decoding',async()=>{
 const{audio,ctx,decode}=await setup();await audio.load(ctx);
 expect(manifest.clips).toHaveLength(91);expect(new Set(manifest.clips.map(c=>c.id)).size).toBe(91);
 expect(manifest.coverage).toEqual({bankSoundSources:91,packagedSoundSources:91,missing:[]});
 expect(new Set(Object.values(manifest.events).flat()).size).toBe(91);expect(decode).toHaveBeenCalledTimes(91);audio.dispose();
});
it('cycles through all movement variants without overlapping or consuming a suppressed variant',async()=>{
 const{audio,ctx,sources}=await setup();
 for(let i=0;i<20;i++){
  expect(audio.speak('Move2DStandard',ctx)).toBe(true);expect(audio.speak('Move2DStandard',ctx)).toBe(false);
  sources.at(-1)!.onended!();
 }
 expect(new Set(sources.map(s=>s.buffer?.id)).size).toBe(20);expect(audio.talking).toBe(false);
 expect(sources.every(s=>s.disconnect.mock.calls.length===1)).toBe(true);audio.dispose();
});
it('lets skill and death preempt speech, coalesces bursts, and respects pause/mute/hidden/restart',async()=>{
 const{audio,ctx,match,sources}=await setup(),hero=match.hero('blue');
 audio.speak('Move2DStandard',ctx);
 const q={type:'cast',team:'blue',ability:'q',sourceKind:'hero',x:hero.x,y:hero.y} as const;
 audio.play(q,ctx);expect(sources).toHaveLength(2);expect(sources[0].stop).toHaveBeenCalledOnce();audio.play(q,ctx);expect(sources).toHaveLength(2);
 audio.play({...q,ability:'r'},ctx);expect(sources).toHaveLength(3);expect(sources[1].stop).toHaveBeenCalledOnce();
 audio.play({type:'kill',team:'red',targetKind:'hero',targetId:hero.id,x:hero.x,y:hero.y},ctx);expect(sources).toHaveLength(4);
 expect(manifest.events.Death3D).toContain(sources[3].buffer!.id);audio.play(q,ctx);expect(sources).toHaveLength(4);
 match.phase='paused';audio.update(match,ctx,true,true);expect(audio.talking).toBe(false);expect(audio.emote('laugh',ctx)).toBe(false);
 match.phase='playing';match.time=10;audio.update(match,ctx,false,true);expect(audio.speak('Move2DStandard',ctx)).toBe(false);
 audio.update(match,ctx,true,false);expect(audio.speak('Move2DStandard',ctx)).toBe(false);
 match.time=0;audio.update(match,ctx,true,true);expect(audio.speak('Move2DStandard',ctx)).toBe(true);
 expect(sources.at(-1)!.buffer?.id).toBe(manifest.events.Move2DStandard[0]);audio.dispose();
});
it('retains attack speech through the next frame and limits emote spam',async()=>{
 const{audio,ctx,match,sources}=await setup(),hero=match.hero('blue');
 audio.play({type:'attack',team:'blue',sourceKind:'hero',x:hero.x,y:hero.y},ctx);
 expect(manifest.events.Attack2DGeneral).toContain(sources[0].buffer!.id);
 audio.update(match,ctx,true,true);audio.interruptMovement();expect(audio.talking).toBe(true);
 audio.stop();expect(audio.emote('joke',ctx)).toBe(true);sources.at(-1)!.onended!();expect(audio.emote('taunt',ctx)).toBe(false);
 match.time=6;audio.update(match,ctx,true,true);expect(audio.emote('taunt',ctx)).toBe(true);audio.dispose();
});
it('cannot start a decoded clip after disposal',async()=>{
 const{audio,ctx,sources}=await setup();audio.dispose();expect(audio.speak('YasuoR_cast3D',ctx)).toBe(false);expect(sources).toHaveLength(0);
});
it('uses actual Q stacks for Q2 speech and Q3 cast context for the tornado',async()=>{
 const{audio,ctx,match,sources}=await setup(),hero=match.hero('blue');hero.qStacks=1;audio.update(match,ctx,true,true);
 const event={type:'cast',team:'blue',ability:'q',sourceKind:'hero',x:hero.x,y:hero.y} as const;
 audio.play(event,ctx);expect(manifest.events.YasuoQ2_cast3D).toContain(sources.at(-1)!.buffer!.id);sources.at(-1)!.onended!();
 match.time=1;audio.update(match,ctx,true,true);audio.play({...event,impact:'q3'},ctx);expect(manifest.events.YasuoQ3Wrapper_cast3D).toContain(sources.at(-1)!.buffer!.id);audio.dispose();
});
