import type {Match} from '../game/Match';
import type {Point} from '../game/types';
import {BRIDGE} from '../game/Bridge';
import {unproject,halfWidth} from '../../assets/map-studies/howling-abyss-v1/geometry';
import {BRIDGE_LIGHTS,bridgeLightPoint} from '../render/BridgeLights';
import {environmentWind} from '../render/EnvironmentWind';
import {loopCrossfade,positionalSound} from './EnvironmentMix';
const URLS=import.meta.glob('../../assets/audio/ice-bridge-v1/runtime/{wind,fire,ice-crack}.mp3',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
type Sound='wind'|'fire'|'ice-crack';
interface Voice {source:AudioBufferSourceNode;gain:GainNode;pan:StereoPannerNode}
const fires=BRIDGE_LIGHTS.filter(f=>f.lit).map(bridgeLightPoint);
/** Uses the existing, gesture-unlocked AudioContext. No autoplay or separate master toggle. */
export class EnvironmentAudio {
 constructor(private readonly firePositions:readonly Point[]=fires){}
 enabled=true;
 failed=false;
 private context:AudioContext|null=null;
 private buffers:Partial<Record<Sound,AudioBuffer>>={};
 private loading:Promise<void>|null=null;
 private wind?:Voice;
 private fireVoices:Voice[]=[];
 private shots=new Set<Voice>();
 private clock=-1;
 private nextIce=24;
 private combatUntil=0;
 private active=false;
 private disposed=false;
 noticeCombat(time:number){this.combatUntil=time+1.5;}
 async preload(context:AudioContext):Promise<void>{
  this.context=context;this.loading??=this.load(context);await this.loading;
  if(this.failed)throw new Error('环境音频加载失败，请刷新重试。');
 }
 private async load(context:AudioContext){
  try{
   const names:Sound[]=['wind','fire','ice-crack'];
   const decoded=await Promise.all(names.map(async name=>{
    const url=Object.entries(URLS).find(([path])=>path.endsWith(`/${name}.mp3`))?.[1];
    if(!url)throw new Error(`Missing environment audio ${name}`);
    const response=await fetch(url);if(!response.ok)throw new Error('Environment audio unavailable');
    let buffer=await context.decodeAudioData(await response.arrayBuffer());
    if(name==='wind'||name==='fire'){
     const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>loopCrossfade(buffer.getChannelData(i),buffer.sampleRate*.22));
     const smooth=context.createBuffer(channels.length,channels[0].length,buffer.sampleRate);
     channels.forEach((data,i)=>smooth.copyToChannel(data,i));buffer=smooth;
    }
    return {name,buffer};
   }));
   if(this.disposed)return;
   for(const {name,buffer} of decoded)this.buffers[name]=buffer;
  }catch{this.failed=true;}
 }
 private voice(name:Sound,loop:boolean,gain=0,pan=0,rate=1,offset=0):Voice|undefined{
  const context=this.context,buffer=this.buffers[name];if(!context||!buffer)return;
  const source=context.createBufferSource(),level=context.createGain(),panner=context.createStereoPanner();
  source.buffer=buffer;source.loop=loop;source.playbackRate.value=rate;level.gain.value=gain;panner.pan.value=pan;
  source.connect(level);level.connect(panner);panner.connect(context.destination);
  const voice={source,gain:level,pan:panner};
  if(!loop){
   if(this.shots.size>=8){const oldest=this.shots.values().next().value;if(oldest)this.stopVoice(oldest);}
   this.shots.add(voice);source.onended=()=>this.disconnect(voice);
  }
  source.start(0,offset%buffer.duration);return voice;
 }
 private disconnect(voice:Voice){voice.source.disconnect();voice.gain.disconnect();voice.pan.disconnect();this.shots.delete(voice);}
 private stopVoice(voice:Voice){try{voice.source.stop();}catch{/* Already ended. */}this.disconnect(voice);}
 private stop(){
  if(this.wind)this.stopVoice(this.wind);this.wind=undefined;
  this.fireVoices.forEach(v=>this.stopVoice(v));this.fireVoices=[];
  for(const shot of [...this.shots])this.stopVoice(shot);
  this.active=false;
 }
 update(match:Match,listener:Point,width:number,context:AudioContext|null,masterEnabled:boolean,visible=true){
  if(this.disposed)return;
  const time=match.time;
  if(time<this.clock){this.stop();this.nextIce=24;this.combatUntil=0;}
  this.clock=time;
  const enabled=masterEnabled&&this.enabled&&visible&&match.phase==='playing'&&context?.state==='running';
  if(!enabled){if(this.active)this.stop();return;}
  if(!this.active&&this.failed){this.failed=false;this.loading=null;}
  this.context=context;this.active=true;
  if(!this.loading)this.loading=this.load(context);
  if(!this.buffers.wind||this.failed)return;
  if(!this.wind)this.wind=this.voice('wind',true);
  if(!this.fireVoices.length)for(let i=0;i<3;i++){const v=this.voice('fire',true,0,0,1,i*1.3);if(v)this.fireVoices.push(v);}
  const wind=environmentWind(time,listener.x,listener.y),[u,v]=unproject(BRIDGE,listener.x,listener.y);
  const edge=Math.min(1,Math.abs(v)/Math.max(1,halfWidth(BRIDGE,u)));
  const duck=time<this.combatUntil?.62:1,now=context.currentTime;
  this.wind?.gain.gain.setTargetAtTime((.055+wind.gust*.055+edge*.025)*duck,now,.2);
  const nearby=this.firePositions.map(p=>({...p,mix:positionalSound(p,listener,width,450)})).sort((a,b)=>b.mix.gain-a.mix.gain);
  this.fireVoices.forEach((voice,i)=>{
   const mix=nearby[i]?.mix??{gain:0,pan:0};
   voice.gain.gain.setTargetAtTime(mix.gain*.5*duck,now,.15);voice.pan.pan.setTargetAtTime(mix.pan,now,.12);
  });
  if(time>=this.nextIce){
   this.voice('ice-crack',false,.055*duck,Math.sin(time*.31)*.7,.9);
   this.nextIce=time+26+(Math.sin(time*1.7)*.5+.5)*19;
  }
 }
 reset(){this.stop();this.clock=-1;this.nextIce=24;this.combatUntil=0;}
 dispose(){this.disposed=true;this.stop();}
}
