import manifest from '../../assets/audio/yasuo-voice-zh-v1/manifest.json';
import type { GameEvent, Team } from '../game/types';
import type { Match } from '../game/Match';
export type YasuoVoiceEvent = keyof typeof manifest.events;
import type {YasuoEmote} from '../game/YasuoEmote';
export type {YasuoEmote} from '../game/YasuoEmote';
const URLS = import.meta.glob('../../assets/audio/yasuo-voice-zh-v1/runtime/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string,string>;
type Voice = { stop():void; priority:number; group:YasuoVoiceEvent };
/** One speech channel per hero. Never replay a delayed event after async decoding. */
export class YasuoVoiceAudio {
 localTeam: Team = 'blue';
 private buffers = new Map<string,AudioBuffer>();
 private loading:Promise<void>|null=null;
 private active=new Map<Team,Voice>();
 private cursors=new Map<string,number>();
 private cooldown=new Map<string,number>();
 private heroes=new Map<number,Team>();
 private qStages=new Map<Team,number>();
 private audible=false;
 private dead=new Set<Team>();
 private time=-1;
 private listener={x:0,y:0};
 private disposed=false;
 failed=false;
 get talking(){return this.active.size>0;}
 load(context:AudioContext):Promise<void>{
  this.loading??=(async()=>{
   const entries=Object.entries(URLS);let index=0;
   await Promise.all(Array.from({length:4},async()=>{
    while(index<entries.length){
     const [path,url]=entries[index++],response=await fetch(url);if(!response.ok)throw new Error('Yasuo voice unavailable');
     const buffer=await context.decodeAudioData(await response.arrayBuffer());
     if(!this.disposed)this.buffers.set(path.split('/').pop()!.replace('.mp3',''),buffer);
    }
   }));
  })().catch(()=>{this.failed=true;});return this.loading;
 }
 update(match:Match,context:AudioContext|null,enabled:boolean,visible:boolean){
  if(match.time<this.time){this.stop();this.cursors.clear();this.cooldown.clear();}
  this.time=match.time;this.listener={...match.hero(this.localTeam)};this.heroes.clear();this.dead.clear();
  for(const team of ['blue','red'] as const){const hero=match.hero(team);this.heroes.set(hero.id,team);this.qStages.set(team,hero.qStacks??0);if(hero.hp<=0)this.dead.add(team);}
  this.audible=enabled&&visible&&!!context&&context.state==='running'&&(match.phase==='playing'||match.phase==='ended');
  if(!this.audible)this.stop();
 }
 speak(group:YasuoVoiceEvent,context:AudioContext,team:Team=this.localTeam,priority=1,cooldown=0,volume=1):boolean{
  if(this.disposed||!this.audible||context.state!=='running')return false;
  const key=`${team}:${group}`,old=this.active.get(team);
  if(this.time<(this.cooldown.get(key)??-Infinity)||old&&old.priority>=priority)return false;
  const pool=manifest.events[group],cursor=this.cursors.get(key)??0,id=pool[cursor%pool.length],buffer=this.buffers.get(id);
  if(!buffer){void this.load(context);return false;}
  old?.stop();const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer;
  gain.gain.setValueAtTime(.68*volume,context.currentTime);source.connect(gain);gain.connect(context.destination);
  let stopped=false;
  const voice:Voice={priority,group,stop:()=>{if(stopped)return;stopped=true;try{source.stop();}catch{/* Already ended. */}source.disconnect();gain.disconnect();if(this.active.get(team)===voice)this.active.delete(team);}};
  source.onended=()=>voice.stop();this.active.set(team,voice);source.start(context.currentTime);
  this.cursors.set(key,cursor+1);this.cooldown.set(key,this.time+cooldown);return true;
 }
 interruptTalk(team:Team=this.localTeam){const voice=this.active.get(team);if(voice&&voice.priority<=1)voice.stop();}
 interruptMovement(){const voice=this.active.get(this.localTeam);if(voice?.group==='Move2DStandard')voice.stop();}
 interruptEmote(){const voice=this.active.get(this.localTeam);if(voice&&['Joke3DGeneral','Taunt3DGeneral','Laugh3DGeneral'].includes(voice.group))voice.stop();}
 emote(action:YasuoEmote,context:AudioContext){
  if(this.dead.has(this.localTeam)||this.time<(this.cooldown.get('emote')??-Infinity))return false;
  const group=({joke:'Joke3DGeneral',taunt:'Taunt3DGeneral',laugh:'Laugh3DGeneral'} as const)[action];
  const played=this.speak(group,context,this.localTeam,1);if(played)this.cooldown.set('emote',this.time+5);return played;
 }
 play(event:GameEvent,context:AudioContext){
  if(!this.audible)return;
  if(event.type==='kill'&&event.targetKind==='hero'){
   const team=this.heroes.get(event.targetId??-1),volume=team===this.localTeam?1:Math.max(0,Math.min(.7,(700-Math.hypot(event.x-this.listener.x,event.y-this.listener.y))/500));
   if(team&&volume>0)this.speak('Death3D',context,team,5,1,volume);return;
  }
  if(event.type!=='cast'&&event.type!=='attack')return;
  if(event.type==='attack'&&event.sourceKind!=='hero'||this.dead.has(event.team))return;
  const volume=event.team===this.localTeam?1:Math.max(0,Math.min(.7,(700-Math.hypot(event.x-this.listener.x,event.y-this.listener.y))/500));
  if(volume<=0)return;
  if(event.type==='cast'){
   const group=event.ability==='q'?(event.impact==='q3'||event.impact==='eq3'?'YasuoQ3Wrapper_cast3D':(this.qStages.get(event.team)??0)>0?'YasuoQ2_cast3D':'YasuoQ1_cast3D')
    :event.ability==='w'?'YasuoW_cast3D':event.ability==='e'?'YasuoEDash_cast3D':event.ability==='r'?'YasuoR_cast3D':null;
   if(group)this.speak(group,context,event.team,event.ability==='r'?4:3,.35,volume);
  }else{
   const key=`${event.team}:attack`;
   if(this.time<(this.cooldown.get(key)??-Infinity))return;
   this.interruptTalk(event.team);
   const general=event.team===this.localTeam&&this.time>=(this.cooldown.get('attackTalk')??0);
   const group=general?'Attack2DGeneral':event.critical?'YasuoCritAttack_cast3D':'YasuoBasicAttack_cast3D';
   if(this.speak(group,context,event.team,general?1:2,0,volume)){
    this.cooldown.set(key,this.time+(general?4:1.5));if(general)this.cooldown.set('attackTalk',this.time+16);
   }
  }
 }
 stop(){for(const voice of [...this.active.values()])voice.stop();}
 dispose(){this.disposed=true;this.stop();this.buffers.clear();}
}
