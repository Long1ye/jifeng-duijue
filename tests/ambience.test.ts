import {describe,it,expect,vi,afterEach} from 'vitest';
import {positionalSound,loopCrossfade} from '../src/ui/EnvironmentMix';
import {EnvironmentAudio} from '../src/ui/EnvironmentAudio';
import {SnowBeast,SNOW_BEAST_HABITAT} from '../src/render/SnowBeast';
import type {Match} from '../src/game/Match';
import {BRIDGE} from '../src/game/Bridge';
import {unproject} from '../assets/map-studies/howling-abyss-v1/geometry';
import {abyssFall} from '../src/render/AbyssMotion';

describe('ravine snow',()=>{
 it('accelerates downward, shrinks into the distance, and disappears',()=>{
  const early=abyssFall(.2,2),middle=abyssFall(1,2),late=abyssFall(2,2);
  expect(middle.y).toBeGreaterThan(early.y);expect(late.y-middle.y).toBeGreaterThan(middle.y-early.y);
  expect(late.scale).toBeLessThan(middle.scale);expect(late.alpha).toBeLessThan(middle.alpha);
  expect(abyssFall(4,2).alpha).toBe(0);expect(abyssFall(-1,2).alpha).toBe(0);
 });
});

describe('environment audio mix',()=>{
 it('fades distant sources to zero and pans consistently around the listener',()=>{
  expect(positionalSound({x:0,y:0},{x:0,y:0},1000)).toEqual({gain:1,pan:0});
  expect(positionalSound({x:800,y:0},{x:0,y:0},1000).gain).toBe(0);
  expect(positionalSound({x:-100,y:0},{x:0,y:0},1000).pan).toBeLessThan(0);
  expect(positionalSound({x:100,y:0},{x:0,y:0},1000).pan).toBeGreaterThan(0);
 });
 it('makes loop wraps adjacent source samples without increasing the peak',()=>{
  const source=Float32Array.from({length:1000},(_,i)=>Math.sin(i*.02)*.5),smooth=loopCrossfade(source,100);
  expect(smooth.length).toBe(900);
  expect(smooth[0]).toBe(source[900]);expect(smooth[899]).toBe(source[899]);
  expect(Math.abs(smooth[0]-smooth[899])).toBeLessThan(.011);
  expect(Math.max(...smooth.map(Math.abs))).toBeLessThanOrEqual(.5);
 });
});
describe('environment audio lifecycle',()=>{
 afterEach(()=>vi.unstubAllGlobals());
 const state=()=>({time:1,phase:'playing',hero:()=>({id:1,x:3100,y:1700,hp:100})}) as unknown as Match;
 function context(){
  const voices:{start:ReturnType<typeof vi.fn>;stop:ReturnType<typeof vi.fn>}[]=[];
  const buffer=(n=2000)=>({numberOfChannels:1,sampleRate:1000,duration:n/1000,getChannelData:()=>new Float32Array(n),copyToChannel:vi.fn()});
  const ctx={state:'running',currentTime:0,decodeAudioData:vi.fn(async()=>buffer()),createBuffer:vi.fn((_c:number,n:number)=>buffer(n)),
   createBufferSource:vi.fn(()=>{const v={start:vi.fn(),stop:vi.fn(),connect:vi.fn(),disconnect:vi.fn(),playbackRate:{value:1}};voices.push(v);return v;}),
   createGain:()=>({gain:{value:0,setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),
   createStereoPanner:()=>({pan:{value:0,setTargetAtTime:vi.fn()},connect:vi.fn(),disconnect:vi.fn()}),destination:{}};
  return {ctx:ctx as unknown as AudioContext,voices};
 }
 it('never fetches or creates voices while the master switch is off',()=>{
  const fetch=vi.fn();vi.stubGlobal('fetch',fetch);const {ctx,voices}=context(),audio=new EnvironmentAudio();
  audio.update(state(),{x:3100,y:1700},1000,ctx,false);
  expect(fetch).not.toHaveBeenCalled();expect(voices).toHaveLength(0);audio.dispose();
 });
 it('does not start late downloads after muting, reuses loops, and stops on pause',async()=>{
  let resolve!:()=>void;const gate=new Promise<void>(r=>resolve=r);
  vi.stubGlobal('fetch',vi.fn(async()=>{await gate;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};}));
  const {ctx,voices}=context(),audio=new EnvironmentAudio(),match=state(),listener={x:3100,y:1700};
  audio.update(match,listener,1000,ctx,true);audio.update(match,listener,1000,ctx,false);resolve();
  await vi.waitFor(()=>expect(ctx.decodeAudioData).toHaveBeenCalledTimes(3));
  expect(voices).toHaveLength(0);
  audio.update(match,listener,1000,ctx,true);audio.update(match,listener,1000,ctx,true);
  expect(voices).toHaveLength(4);
  match.phase='paused';audio.update(match,listener,1000,ctx,true);
  expect(voices.every(v=>v.stop.mock.calls.length===1)).toBe(true);audio.dispose();
 });
 it('contains decode failures without creating partial looping audio',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>{throw new Error('offline');}));
  const {ctx,voices}=context(),audio=new EnvironmentAudio();audio.update(state(),{x:0,y:0},1000,ctx,true);
  await vi.waitFor(()=>expect(audio.failed).toBe(true));expect(voices).toHaveLength(0);audio.dispose();
 });
 it('loads only ambient sounds and never creates movement-triggered footsteps',async()=>{
  const fetch=vi.fn(async(_url:string)=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)}));vi.stubGlobal('fetch',fetch);
  const {ctx,voices}=context(),audio=new EnvironmentAudio(),match=state();
  // Ambient sound must not consult hero movement at all.
  match.hero=()=>{throw new Error('Footsteps must not query the hero');};
  audio.update(match,{x:3100,y:1700},1000,ctx,true);
  await vi.waitFor(()=>expect(ctx.decodeAudioData).toHaveBeenCalledTimes(3));
  expect(fetch.mock.calls.every(call=>!String(call[0]).includes('step'))).toBe(true);
  for(let i=2;i<=200;i++){match.time=i/10;audio.update(match,{x:3100+i,y:1700},1000,ctx,true);}
  expect(voices).toHaveLength(4);audio.dispose();
 });
});
describe('decorative snow beast',()=>{
 const create=()=>new SnowBeast({x:0,y:0},[{x:30,y:20},{x:-30,y:15}]);
 const advance=(animal:SnowBeast,start:number,end:number,actors:readonly {x:number;y:number}[]=[])=>{
  for(let i=Math.round(start*10);i<=Math.round(end*10);i++)animal.update(i/10,actors);
 };
 it('stays hidden most of the time, with short visits separated by long breaks',()=>{
  const animal=create();let exposed=0,visits=0,wasVisible=false;
  for(let i=0;i<=1200;i++){
   animal.update(i/10,[]);const visible=animal.exposure>0;
   if(i<90)expect(visible).toBe(false);
   if(visible)exposed++;if(visible&&!wasVisible)visits++;wasVisible=visible;
  }
  expect(visits).toBeGreaterThanOrEqual(3);expect(visits).toBeLessThanOrEqual(5);
  expect(exposed/1201).toBeLessThan(.22);
 });
 it('retreats smoothly when a unit approaches and waits for quiet without changing actors',()=>{
  const animal=create();advance(animal,0,10);expect(animal.exposure).toBeGreaterThan(0);
  const actor=Object.freeze({x:20,y:0}),before={...animal.position};animal.update(10.1,[actor]);
  expect(animal.mode).toBe('retreat');expect(animal.target).toEqual(animal.home);
  expect(Math.hypot(animal.position.x-before.x,animal.position.y-before.y)).toBeLessThanOrEqual(7.81);
  advance(animal,10.2,40,[actor]);expect(animal.exposure).toBe(0);expect(animal.mode).toBe('hidden');
  advance(animal,40.1,51,[]);expect(animal.exposure).toBe(0);
  advance(animal,51.1,54,[]);expect(animal.exposure).toBeGreaterThan(0);
  expect(actor).toEqual({x:20,y:0});
 });
 it('freezes on pause, resets on rewind, and does not instantly appear when enabled late',()=>{
  const animal=create();advance(animal,0,10);const p={...animal.position},exposure=animal.exposure;
  animal.update(10,[{x:20,y:0}]);expect(animal.position).toEqual(p);expect(animal.exposure).toBe(exposure);
  animal.update(0,[]);expect(animal.position).toEqual(animal.home);expect(animal.mode).toBe('hidden');
  animal.reset();animal.update(120,[]);animal.update(120.1,[]);expect(animal.exposure).toBe(0);
 });
 it('keeps the actual habitat and all travel inside the bridge-side brush',()=>{
  const animal=new SnowBeast(SNOW_BEAST_HABITAT.home,SNOW_BEAST_HABITAT.peeks),brush=BRIDGE.brush[1];
  for(let i=0;i<1800;i++){
   animal.update(i/10,i%400>350?[animal.position]:[]);
   const [u,v]=unproject(BRIDGE,animal.position.x,animal.position.y);
   expect(Math.abs(u-brush.u)).toBeLessThan(brush.length/2-8);
   expect(Math.abs(v-brush.v)).toBeLessThan(brush.width/2-3);
  }
 });
});
