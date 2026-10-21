import type {GameEvent} from '../game/types';
import {originalSound,originalHeroEvent,type OriginalSound} from './OriginalSoundMap';
const URLS=import.meta.glob([
 '../../assets/audio/riot-original/runtime/{yasuo,tf}-*.mp3',
 '!../../assets/audio/riot-original/runtime/yasuo-{q-cast,q-hit,q3-cast,q3-hit,r-cast,r-hit}.mp3',
 '../../assets/audio/yasuo-user-v1/runtime/*.mp3',
],{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export class OriginalCombatAudio {
 private buffers=new Map<OriginalSound,AudioBuffer>();
 private loading:Promise<void>|null=null;
 private voices=new Set<{stop:()=>void}>();
 private last=new Map<OriginalSound,number>();
 private fluteVoice:{stop:()=>void}|null=null;
 get flutePlaying(){return this.fluteVoice!==null;}
 playFlute(context:AudioContext,offset:number){
  if(this.fluteVoice||this.disposed)return false;
  void this.load(context);
  this.fluteVoice=this.start('yasuo-flute-user',context,.9,offset,true);
  return this.fluteVoice!==null;
 }
 stopFlute(){this.fluteVoice?.stop();}
 private movementVoice:{stop:()=>void}|null=null;
 get movementPlaying(){return this.movementVoice!==null;}
 private disposed=false;
 private qVariant=0;
 failed=false;
 volume=.65;
 load(context:AudioContext){
  if(!this.loading)this.loading=Promise.all(Object.entries(URLS).map(async([path,url])=>{
   const response=await fetch(url);if(!response.ok)throw new Error('Original audio unavailable');
   const buffer=await context.decodeAudioData(await response.arrayBuffer());
   if(!this.disposed)this.buffers.set(path.split('/').pop()!.replace('.mp3','') as OriginalSound,buffer);
  })).then(()=>{}).catch(()=>{this.failed=true;});
  return this.loading;
 }
 play(event:GameEvent,context:AudioContext,speechHandled=false):boolean{
  // The old user Q/R recordings contain speech; the new VO bank owns that lane.
  if(speechHandled&&event.type==='cast'&&(event.ability==='q'||event.ability==='r'))return true;
  if(!originalHeroEvent(event))return false;
  const name=originalSound(event,this.qVariant);
  // Cast recordings are retained; actual skill contacts get a short procedural accent.
  if(!name||this.disposed)return this.disposed||event.type!=='hit'||event.impact==='r';
  void this.load(context);
  if(!this.buffers.has(name))return false;
  const now=context.currentTime;
  if(now-(this.last.get(name)??-Infinity)<.05)return true;
  this.last.set(name,now);
  if(name==='yasuo-q-user-v1'||name==='yasuo-q-user-v2')this.qVariant++;
  this.start(name,context);return true;
 }
 playMovement(variant:number,context:AudioContext):boolean{
  if(this.movementVoice||this.disposed)return false;
  void this.load(context);
  this.movementVoice=this.start(variant%2?'yasuo-walk-user-v2':'yasuo-walk-user-v1',context,.8);
  return this.movementVoice!==null;
 }
 stopMovement(){this.movementVoice?.stop();}
 private start(name:OriginalSound,context:AudioContext,scale=1,offset=0,loop=false){
  const buffer=this.buffers.get(name);if(!buffer||buffer.duration<=0||!loop&&offset>=buffer.duration)return null;
  const now=context.currentTime;
  if(this.voices.size>=8)this.voices.values().next().value?.stop();
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;source.loop=loop;
  const volume=this.volume*scale*(name==='yasuo-swing'?.55:1);
  gain.gain.setValueAtTime(volume,now);source.connect(gain);gain.connect(context.destination);
  let stopped=false;
  const voice={stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{/* Ended. */}source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.movementVoice===voice)this.movementVoice=null;if(this.fluteVoice===voice)this.fluteVoice=null;}};
  source.onended=()=>voice.stop();this.voices.add(voice);source.start(now,loop?offset%buffer.duration:offset);return voice;
 }
 stop(){for(const voice of [...this.voices])voice.stop();this.last.clear();}
 dispose(){this.disposed=true;this.stop();this.buffers.clear();}
}
