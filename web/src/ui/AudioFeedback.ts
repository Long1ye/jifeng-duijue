import {YasuoSkillAudio} from './YasuoSkillAudio';
import {SummonerAudio} from './SummonerAudio';
import {fluteActive} from '../game/YasuoFlute';
import {emoteActive} from '../game/YasuoEmote';
import type { GameEvent, Team } from '../game/types';
import {combatSound} from './CombatSound';
import type {Match} from '../game/Match';
import {MovementVoice} from './MovementVoice';
import {OriginalCombatAudio} from './OriginalCombatAudio';
import {YasuoVoiceAudio,type YasuoEmote} from './YasuoVoiceAudio';

export class AudioFeedback {
  localTeam: Team = 'blue';
  enabled = true;
  private context: AudioContext | null = null;
  private noise:AudioBuffer|null=null;
  private voices=new Set<{stop:()=>void}>();
  private lastHit=-Infinity;
  private original=new OriginalCombatAudio();
  private skills=new YasuoSkillAudio();
  private summoners=new SummonerAudio();
  private movement=new MovementVoice();
  private speech=new YasuoVoiceAudio();
  private fluteStarted:number|null=null;
  private emoteStarted:string|null=null;
  private heroId:number|null=null;
  get movementPlaying(){return this.speech.talking||this.original.movementPlaying||this.original.flutePlaying;}
  get failed(){return this.speech.failed||this.original.failed||this.skills.failed||this.summoners.failed;}
  updateMovement(match:Match,visible=true){
    const hero=match.hero(this.localTeam);this.heroId=hero.id;
    const emote=emoteActive(hero,match.time)?hero.emote!:null;
    const emoteKey=emote?`${emote.action}:${emote.startedAt}`:null;
    const newEmote=!!emote&&this.emoteStarted!==emoteKey;
    if(this.emoteStarted&&this.emoteStarted!==emoteKey)this.speech.interruptEmote();
    this.emoteStarted=emoteKey;
    this.speech.localTeam=this.localTeam;
    this.speech.update(match,this.context,this.enabled,visible);
    if(newEmote&&visible)this.emote(emote!.action,match);
    this.skills.update(match,this.context,this.enabled,visible);
    this.summoners.update(match,this.context,this.enabled,visible);
    const flute=fluteActive(hero,match.time);
    if(flute)this.speech.stop();
    const audible=this.enabled&&visible&&match.phase==='playing'&&this.context?.state==='running';
    if(!flute||!audible){this.original.stopFlute();this.fluteStarted=null;}
    else if(this.fluteStarted!==hero.fluteAt){
      this.original.stopFlute();
      if(this.context&&this.original.playFlute(this.context,match.time-hero.fluteAt!))this.fluteStarted=hero.fluteAt!;
    }
    const calm=!flute&&!emote&&hero.hp>0&&match.time-(hero.homeguardCombatAt??-Infinity)>5
      &&hero.windup<=0&&!hero.qCast&&!hero.q3Cast&&!hero.wCast&&!hero.eCast&&!hero.rCast&&!hero.eqCast
      &&(hero.airborneUntil??0)<=match.time&&(hero.flinchUntil??0)<=match.time
      &&!match.entities.some(e=>e.team!==hero.team&&e.hp>0&&Math.hypot(e.x-hero.x,e.y-hero.y)<260);
    const eligible=this.enabled&&visible&&match.phase==='playing'&&this.context?.state==='running'&&calm;
    const variant=this.movement.update(match.time,hero,eligible);
    if(!eligible){this.original.stopMovement();this.speech.interruptMovement();}
    if(variant!==null&&this.context&&this.speech.speak('Move2DStandard',this.context,this.localTeam,1))this.movement.played(match.time);
  }
  emote(action:YasuoEmote,match:Match){
    if(!this.enabled||!this.context||match.phase!=='playing'||match.hero(this.localTeam).hp<=0||fluteActive(match.hero(this.localTeam),match.time))return false;
    const emote=match.hero(this.localTeam).emote;
    this.emoteStarted=emote?`${emote.action}:${emote.startedAt}`:null;
    this.speech.interruptTalk();
    return this.speech.emote(action,this.context);
  }
  get audioContext(){return this.context;}
  async preload(): Promise<void> {
    this.context ??= new AudioContext();
    await Promise.all([this.original.load(this.context), this.skills.load(this.context), this.summoners.load(this.context), this.speech.load(this.context)]);
    if (this.failed) throw new Error('战斗音频加载失败，请刷新重试。');
  }
  /** Called from a real input gesture; constructing the app itself stays silent. */
  unlock():void {
    if(!this.enabled)return;
    this.context ??= new AudioContext();
    if(this.context.state!=='running')void this.context.resume().catch(()=>{});
    void this.original.load(this.context);
    void this.skills.load(this.context);
    void this.summoners.load(this.context);
    void this.speech.load(this.context);
  }
  toggle(): boolean {
    this.enabled = !this.enabled;
    if(!this.enabled)this.stop();
    if (this.enabled)this.unlock();
    return this.enabled;
  }
  play(event: GameEvent): void {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    if(event.type==='end'||event.type==='hit'&&event.targetId===this.heroId
      ||event.team===this.localTeam&&(event.type==='cast'||event.sourceKind==='hero'&&(event.type==='attack'||event.type==='hit'))){
      this.original.stopMovement();
      if(event.type==='end'||event.type==='hit'&&event.targetId===this.heroId)this.speech.interruptTalk();
      else this.speech.interruptMovement();
    }
    this.speech.play(event,this.context);
    const skill=this.skills.play(event,this.context),original=this.original.play(event,this.context,true);
    if(skill||original)return;
    const plan=combatSound(event);if(!plan)return;
    const context=this.context,now=context.currentTime;
    // One cleave can hit several targets in the same simulation tick.
    if(event.type==='hit'&&now-this.lastHit<.028)return;
    if(event.type==='hit')this.lastHit=now;
    if(!this.noise){
      this.noise=context.createBuffer(1,Math.ceil(context.sampleRate*.35),context.sampleRate);
      const data=this.noise.getChannelData(0);let seed=19;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=seed/2147483648;}
    }
    if(this.voices.size>=8)this.voices.values().next().value?.stop();
    const gain=context.createGain(),high=context.createBiquadFilter(),low=context.createBiquadFilter();
    const noise=context.createBufferSource(),oscillator=context.createOscillator(),tone=context.createGain();
    high.type='highpass';high.frequency.value=plan.low;low.type='lowpass';low.frequency.value=plan.high;
    noise.buffer=this.noise;noise.playbackRate.value=event.type==='hit'? .96+(event.targetId??0)%4*.025:1;
    gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(Math.max(.0001,plan.noise),now+.002);
    gain.gain.exponentialRampToValueAtTime(.0001,now+plan.duration);
    noise.connect(high);high.connect(low);low.connect(gain);gain.connect(context.destination);
    oscillator.type=event.type==='last-hit'?'sine':'triangle';
    oscillator.frequency.setValueAtTime(plan.pitch,now);oscillator.frequency.exponentialRampToValueAtTime(plan.sweep,now+plan.duration);
    tone.gain.setValueAtTime(.0001,now);tone.gain.linearRampToValueAtTime(Math.max(.0001,plan.tone),now+.003);
    tone.gain.exponentialRampToValueAtTime(.0001,now+plan.duration);
    oscillator.connect(tone);tone.connect(context.destination);
    let stopped=false;
    const voice={stop:()=>{
      if(stopped)return;stopped=true;
      try{noise.stop();oscillator.stop();}catch{/* Sources already ended. */}
      for(const node of [noise,oscillator,gain,tone,high,low])node.disconnect();this.voices.delete(voice);
    }};
    this.voices.add(voice);noise.onended=()=>voice.stop();
    noise.start(now);oscillator.start(now);noise.stop(now+plan.duration+.01);oscillator.stop(now+plan.duration+.01);
  }
  stop(){this.fluteStarted=null;this.movement.reset();this.speech.stop();this.original.stop();this.skills.stop();this.summoners.stop();for(const voice of [...this.voices])voice.stop();this.lastHit=-Infinity;}
  dispose(){this.stop();this.speech.dispose();this.original.dispose();this.skills.dispose();this.summoners.dispose();this.noise=null;}
}
