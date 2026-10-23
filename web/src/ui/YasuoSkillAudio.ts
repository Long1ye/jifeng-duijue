import type {Match} from '../game/Match';
import type {GameEvent,Point} from '../game/types';
import {W_DURATION} from '../game/WindWall';
import {yasuoSkillSound,type SkillSound} from './YasuoSkillSound';
const URLS=import.meta.glob('../../assets/audio/yasuo-client-v1/runtime/*.mp3',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
interface Voice {stop():void}
export class YasuoSkillAudio {
 private buffers=new Map<SkillSound,AudioBuffer>();
 private loading:Promise<void>|null=null;
 private voices=new Set<Voice>();
 private walls=new Map<number,Voice>();
 private last=new Map<string,number>();
 private listener:Point|null=null;
 private disposed=false;
 private time=-1;
 failed=false;
 load(context:AudioContext){
  this.loading??=Promise.all(Object.entries(URLS).map(async([path,url])=>{
   const response=await fetch(url);if(!response.ok)throw new Error('Skill audio unavailable');
   const data=await context.decodeAudioData(await response.arrayBuffer());
   if(!this.disposed)this.buffers.set(path.split('/').pop()!.replace('yasuo-client-','').replace('.mp3','') as SkillSound,data);
  })).then(()=>{}).catch(()=>{this.failed=true;});return this.loading;
 }
 private attenuation(point:Point){return this.listener?Math.max(0,Math.min(1,(900-Math.hypot(point.x-this.listener.x,point.y-this.listener.y))/450)):1;}
 play(event:GameEvent,context:AudioContext):boolean {
  const name=yasuoSkillSound(event);if(!name)return false;
  // Silence replaces the former synthetic accent even while the sample loads.
  if(this.disposed)return true;
  void this.load(context);
  const key=`${name}:${event.sourceId??event.team}`,now=context.currentTime;
  if(now-(this.last.get(key)??-Infinity)<.065)return true;
  const point=event.from??event,volume=this.attenuation(point)*(name.endsWith('hit')?.48:.75);
  if(volume<=0)return true;
  if(this.start(name,context,volume))this.last.set(key,now);
  return true;
 }
 update(match:Match,context:AudioContext|null,enabled:boolean,visible:boolean){
  if(match.time<this.time)this.stop();this.time=match.time;this.listener={...match.hero('blue')};
  if(!enabled||!visible||match.phase!=='playing'||!context||context.state!=='running'){this.stop();return;}
  void this.load(context);
  const live=new Set<number>();
  for(const wall of match.windWalls){
   const age=match.time-wall.startsAt,volume=this.attenuation(wall)*.38;
   if(age<0||age>=W_DURATION||volume<=0)continue;
   live.add(wall.id);
   if(!this.walls.has(wall.id)){
    const voice=this.start('w-loop',context,volume,age,true);
    if(voice)this.walls.set(wall.id,voice);
   }
  }
  for(const [id,voice] of this.walls)if(!live.has(id)){voice.stop();this.walls.delete(id);}
 }
 private start(name:SkillSound,context:AudioContext,volume:number,offset=0,loop=false):Voice|null {
  const buffer=this.buffers.get(name);if(!buffer||buffer.duration<=0)return null;
  // Keep two active wall beds independent from the bounded foreground effects.
  if(this.voices.size>=16){const candidate=[...this.voices].find(v=>![...this.walls.values()].includes(v));candidate?.stop();}
  const source=context.createBufferSource(),gain=context.createGain(),now=context.currentTime;
  source.buffer=buffer;source.loop=loop;gain.gain.setValueAtTime(volume,now);source.connect(gain);gain.connect(context.destination);
  let stopped=false,cleaned=false;
  const clean=()=>{if(cleaned)return;cleaned=true;source.disconnect();gain.disconnect();this.voices.delete(voice);};
  const voice:Voice={stop:()=>{
   if(stopped)return;stopped=true;this.voices.delete(voice);
   // A short release avoids a click when a wind wall disappears or the tab pauses.
   gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(volume,context.currentTime);gain.gain.linearRampToValueAtTime(.0001,context.currentTime+.025);
   try{source.stop(context.currentTime+.03);}catch{clean();}
  }};
  source.onended=clean;this.voices.add(voice);source.start(now,loop?offset%buffer.duration:0);return voice;
 }
 stop(){for(const voice of [...this.voices])voice.stop();this.walls.clear();this.last.clear();}
 dispose(){this.disposed=true;this.stop();this.buffers.clear();}
}
