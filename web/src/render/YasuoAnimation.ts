import fluteClip from '../../assets/heroes/yasuo/flute-user/animation.json';
import {fluteActive} from '../game/YasuoFlute';
import emoteRegistry from '../../assets/heroes/yasuo/emotes-v3-2026-10-19/animations.json';
import {emoteActive} from '../game/YasuoEmote';
export const YASUO_EMOTES=emoteRegistry.clips;
export const YASUO_FLUTE=fluteClip;
import originalRegistry from '../../assets/heroes/yasuo/selected-2026-10-10/animations.json';
import attackRegistry from '../../assets/heroes/yasuo/attacks-v2-2026-10-13/animations.json';
import locomotionRegistry from '../../assets/heroes/yasuo/locomotion16-2026-10-15/animations.json';
const registry={...originalRegistry,attacks:attackRegistry.attacks,locomotion:locomotionRegistry.locomotion};

export function flipYasuoAttack(facing:number):boolean {return Math.cos(facing)<-0.001;}
import { headingToDirection, type SpriteDirection } from '../../assets/hero-walk-directions/2026-10-09/v1/direction';
import { BALANCE } from '../game/config';
import { HOMEGUARD, homeguardActive } from '../game/Homeguard';
import type { Entity } from '../game/types';
import { sampleYasuoQ, type YasuoQClip } from './YasuoQAnimation';
import { sampleYasuoE, type YasuoEClip } from './YasuoEAnimation';

export const YASUO_ASSETS = registry;
export type YasuoClip = typeof YASUO_EMOTES[number] | typeof fluteClip | typeof registry.attacks[number] | typeof registry.locomotion[number] | YasuoQClip | YasuoEClip;
export interface YasuoSample { clip: YasuoClip; frame: number; state: 'idle' | 'walk' | 'A' | 'B' | 'Q' | 'E' | 'flute' | 'joke' | 'taunt' | 'laugh'; scale: number }

/** A quicker stride for the faster hero, while keeping ordinary steps measured. */
export const NORMAL_WALK_CYCLE_SECONDS=1.04;
export function yasuoWalkPlaybackRate(entity:Entity,now:number):number {
  return entity.speed/BALANCE.hero.speed * (.8/NORMAL_WALK_CYCLE_SECONDS) * (homeguardActive(entity,now)?HOMEGUARD.multiplier:1)
    * (entity.slowUntil>now?.7:1);
}

/** Original frame timings, sampled without reversing, deleting or interpolating art. */
export function spriteFrameAt(milliseconds: number, durations: readonly number[], loop: boolean): number {
  const total = durations.reduce((sum, duration) => sum + duration, 0);
  if (!Number.isFinite(milliseconds) || milliseconds < 0 || !durations.length || durations.some(d => !Number.isFinite(d) || d <= 0)) {
    throw new RangeError('Invalid sprite timing');
  }
  let remaining = loop ? milliseconds % total : Math.min(milliseconds, total);
  for (let frame = 0; frame < durations.length; frame++) {
    if (remaining < durations[frame]) return frame;
    remaining -= durations[frame];
  }
  return durations.length - 1;
}

export function attackClipFor(entity: Pick<Entity, 'attackReleasedAt' | 'attacksReleased'>): typeof registry.attacks[number] {
  const committed = entity.attacksReleased - (entity.attackReleasedAt === null ? 0 : 1);
  return registry.attacks[Math.max(0, committed) % 2];
}

/** Align each clip's impact pose with the existing simulation's attack release. */
export function attackFrameAt(entity: Entity, now: number, clip = attackClipFor(entity)): number {
  const impact = clip.durations_ms.slice(0, clip.impact_frame).reduce((sum, ms) => sum + ms, 0);
  const sourceTime = entity.attackReleasedAt === null
    ? Math.min(1, Math.max(0, (now - (entity.attackStartedAt ?? now)) / BALANCE.hero.windup)) * impact
    : impact + Math.min(1, Math.max(0, (now - entity.attackReleasedAt) / entity.attackInterval)) * (clip.duration_ms - impact);
  return spriteFrameAt(sourceTime, clip.durations_ms, false);
}

/** Simulation time, not wall time: pause, restart and cancelled windups stay exact. */
export class YasuoAnimator {
  private previous: { x: number; y: number; time: number } | null = null;
  private moving = false;
  private direction: SpriteDirection | undefined;
  private locomotionMs = 0;
  private locomotionAt = 0;
  private locomotionState: 'idle' | 'walk' | null = null;

  reset(): void {
    this.previous = null; this.moving = false; this.direction = undefined;
    this.locomotionMs = 0; this.locomotionAt = 0;
    this.locomotionState = null;
  }

  sample(entity: Entity, now: number): YasuoSample {
    if (this.previous && this.previous.time !== now) this.moving = Math.hypot(entity.x - this.previous.x, entity.y - this.previous.y) > 0.01;
    this.previous = { x: entity.x, y: entity.y, time: now };
    this.direction = headingToDirection(entity.facing, this.direction);
    if(emoteActive(entity,now)){
      const emote=entity.emote!,clip=YASUO_EMOTES.find(c=>c.action===emote.action)!;
      this.locomotionState=null;
      const ms=(now-emote.startedAt)*1000;
      return {clip,frame:spriteFrameAt(ms,clip.durations_ms,true),state:emote.action,scale:clip.scale_in_world};
    }
    if(fluteActive(entity,now)){this.locomotionState=null;return {clip:fluteClip,frame:spriteFrameAt((now-entity.fluteAt!)*1000,fluteClip.durations_ms,true),state:'flute',scale:fluteClip.scale_in_world};}
    const e = sampleYasuoE(entity, now);
    if (e) { this.locomotionState = null; return e; }
    const q = sampleYasuoQ(entity, now);
    if (q) { this.locomotionState = null; return q; }
    const attacking = entity.hp > 0 && entity.attackStartedAt !== null &&
      (entity.windup > 0 || (!this.moving && entity.attackReleasedAt !== null && now - entity.attackReleasedAt <= entity.attackInterval));
    if (attacking) {
      const clip = attackClipFor(entity);
      this.locomotionState = null;
      return { clip, frame: attackFrameAt(entity, now, clip), state: clip.id as 'A' | 'B', scale: registry.scale_in_world };
    }
    const state = this.moving && entity.hp > 0 ? 'walk' : 'idle';
    const clip = registry.locomotion.find(c => c.state === state && c.direction === this.direction)!;
    // Turning changes the view, not the footstep clock. Actions still restart locomotion.
    if (this.locomotionState !== state || now<this.locomotionAt) this.locomotionMs=0;
    else this.locomotionMs+=Math.max(0,now-this.locomotionAt)*1000*(state==='walk'?yasuoWalkPlaybackRate(entity,now):1);
    this.locomotionAt=now;
    this.locomotionState = state;
    return { clip, frame: spriteFrameAt(this.locomotionMs, clip.durations_ms, true), state, scale: registry.scale_in_world };
  }
}
