import { AudioFeedback } from '../ui/AudioFeedback';
import { EnvironmentAudio } from '../ui/EnvironmentAudio';
import { MapMusic } from '../ui/MapMusic';
import { ART_BRAZIERS, artBrazierMount } from '../render-three/PaintedMapLayout';
import { bridgePoint } from '../game/Bridge';
import type { PrototypeFrame } from './PrototypeHost';
import type { Point } from '../game/types';

/** Reuses the existing audio engine and the host's single drained event batch. */
export class ThreeAudio {
  readonly combat = new AudioFeedback();
  readonly music = new MapMusic();
  readonly environment = new EnvironmentAudio(ART_BRAZIERS.map(({ u, v }) => { const p = artBrazierMount(u, v); return bridgePoint(p.u, p.v); }));
  private match: PrototypeFrame['match'] | null = null;
  private playing = false;
  private unlocked = false;
  constructor() { this.environment.enabled = false; }
  unlock() { this.unlocked = true; this.combat.unlock(); this.music.failed = false; }
  update(frame: PrototypeFrame, listener: Point, width: number, visible = true) {
    const { match } = frame;
    this.combat.localTeam = frame.localTeam ?? 'blue';
    if (this.match !== match) { this.stop(); this.music.reset(); this.environment.reset(); this.match = match; }
    const playing = match.phase === 'playing' && visible && this.unlocked;
    if (this.playing && !playing) this.combat.stop(); this.playing = playing;
    this.combat.updateMovement(match, visible && this.unlocked);
    if (this.combat.movementPlaying) this.music.noticeCombat(match.time);
    if (playing) for (const event of frame.events) {
      this.combat.play(event);
      if (event.type === 'hit' || event.type === 'cast') { this.environment.noticeCombat(match.time); this.music.noticeCombat(match.time); }
    }
    // End stingers are delivered even though the last simulation tick ended the match.
    if (visible && this.unlocked && match.phase === 'ended') for (const event of frame.events) if (event.type === 'end'||event.type==='kill') this.combat.play(event);
    this.music.update(match.time, match.phase, this.combat.enabled && this.unlocked, visible);
    this.environment.update(match, listener, width, this.combat.audioContext, this.combat.enabled && this.unlocked, visible);
  }
  stop() {
    this.combat.stop(); this.playing = false;
    this.music.update(this.match?.time ?? 0, this.match?.phase ?? 'paused', false, false); this.environment.reset();
  }
  dispose() {
    this.combat.dispose(); this.environment.dispose(); this.music.dispose();
    const context = this.combat.audioContext; if (context && context.state !== 'closed') void context.close().catch(() => {});
  }
}
