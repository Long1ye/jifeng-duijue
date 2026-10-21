import type { Match } from '../game/Match';
import type { Point } from '../game/types';

type Sound = 'flash' | 'ignite-cast' | 'ignite-burn';
const URLS = import.meta.glob('../../assets/audio/summoners-client-v2/runtime/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
interface Voice { stop(): void }

/** Summoners have no hero cast event: follow their authoritative effect instances. */
export class SummonerAudio {
 private buffers = new Map<Sound, AudioBuffer>();
 private loading: Promise<void> | null = null;
 private voices = new Set<Voice>();
 private burns = new Map<string, Voice>();
 private casts = new Map<string, Voice>();
 private seen = new Set<string>();
 private match: Match | null = null;
 private disposed = false;
 failed = false;
 load(context: AudioContext) {
  this.loading ??= Promise.all(Object.entries(URLS).map(async ([path, url]) => {
   const response = await fetch(url); if (!response.ok) throw new Error('Summoner audio unavailable');
   const buffer = await context.decodeAudioData(await response.arrayBuffer());
   if (!this.disposed) this.buffers.set(path.split('/').pop()!.replace('.mp3', '') as Sound, buffer);
  })).then(() => {}).catch(() => { this.failed = true; });
  return this.loading;
 }
 update(match: Match, context: AudioContext | null, enabled: boolean, visible: boolean) {
  if (match !== this.match) { this.stop(); this.seen.clear(); this.match = match; }
  const active = new Set<string>(), listener = match.hero('blue');
  const audible = enabled && visible && match.phase === 'playing' && context?.state === 'running';
  if (context && audible) void this.load(context);
  for (const effect of match.summonerEffects) {
   const age = match.time - effect.startedAt, key = `${effect.kind}:${effect.sourceId}:${effect.startedAt}`;
   if (age < 0 || match.time >= effect.endsAt) continue;
   const target = effect.kind === 'ignite' ? match.entity(effect.targetId ?? null) : null;
   if (effect.kind === 'ignite' && (!target || target.hp <= 0)) continue;
   active.add(key);
   const point: Point = target ?? effect.to, distance = Math.hypot(point.x - listener.x, point.y - listener.y);
   const volume = Math.max(0, Math.min(1, (900 - distance) / 450));
   if (!audible || !context || volume <= 0) continue;
   if (!this.seen.has(key)) {
    if (age > .2) this.seen.add(key);
    else {
     const voice = this.start(effect.kind === 'flash' ? 'flash' : 'ignite-cast', context, volume * .7, age);
     if (voice) { this.seen.add(key); if (effect.kind === 'ignite') this.casts.set(key, voice); }
    }
   }
   if (effect.kind === 'ignite' && !this.burns.has(key)) {
    const voice = this.start('ignite-burn', context, volume * .3, age, true);
    if (voice) this.burns.set(key, voice);
   }
  }
  if (!audible) this.stop();
  for (const [key, voice] of this.burns) if (!active.has(key)) { voice.stop(); this.burns.delete(key); }
  for (const [key, voice] of this.casts) if (!active.has(key)) { voice.stop(); this.casts.delete(key); }
  for (const key of this.seen) if (!active.has(key)) this.seen.delete(key);
 }
 private start(name: Sound, context: AudioContext, volume: number, offset = 0, loop = false): Voice | null {
  const buffer = this.buffers.get(name); if (!buffer || this.disposed || buffer.duration <= 0 || !loop && offset >= buffer.duration) return null;
  if (this.voices.size >= 8) [...this.voices].find(v => ![...this.burns.values()].includes(v))?.stop();
  const source = context.createBufferSource(), gain = context.createGain(), now = context.currentTime;
  source.buffer = buffer; source.loop = loop;
  gain.gain.setValueAtTime(0, now); gain.gain.linearRampToValueAtTime(volume, now + .006);
  source.connect(gain); gain.connect(context.destination);
  let stopped = false;
  const clean = () => { source.disconnect(); gain.disconnect(); this.voices.delete(voice); };
  const voice = { stop: () => {
   if (stopped) return; stopped = true;
   gain.gain.cancelScheduledValues(context.currentTime); gain.gain.setValueAtTime(gain.gain.value, context.currentTime); gain.gain.linearRampToValueAtTime(0, context.currentTime + .025);
   try { source.stop(context.currentTime + .03); } catch { clean(); }
   this.voices.delete(voice);
  } };
  source.onended = clean; this.voices.add(voice); source.start(now, loop ? offset % buffer.duration : offset); return voice;
 }
 stop() { for (const voice of [...this.voices]) voice.stop(); this.burns.clear(); this.casts.clear(); }
 dispose() { this.disposed = true; this.stop(); this.seen.clear(); this.buffers.clear(); }
}
