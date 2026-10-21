import { DIRECTIONS, RIG, type Direction } from '../q-v7-user-linked/rig';

/** Presentation controls only; the existing V7 motion and assets stay unchanged. */
export class DirectionPlayer {
  direction: Direction = 'e';
  elapsed = 0;
  playing = true;
  repeating = true;
  speed = 1;

  select(direction: Direction): void {
    if (!DIRECTIONS.includes(direction)) throw new RangeError('Invalid Q direction');
    this.direction = direction;
    this.start(this.repeating);
  }

  start(repeat: boolean): void {
    this.elapsed = 0;
    this.repeating = repeat;
    this.playing = true;
  }

  togglePause(): void {
    if (!this.playing && !this.repeating && this.elapsed >= RIG.duration) this.elapsed = 0;
    this.playing = !this.playing;
  }

  seek(milliseconds: number): void {
    if (!Number.isFinite(milliseconds)) throw new RangeError('Invalid Q time');
    this.elapsed = Math.max(0, Math.min(milliseconds, RIG.duration));
    this.repeating = false;
    this.playing = false;
  }

  setSpeed(speed: number): void {
    if (![0.25, 0.5, 1].includes(speed)) throw new RangeError('Invalid playback speed');
    this.speed = speed;
  }

  advance(delta: number): void {
    if (!Number.isFinite(delta) || delta < 0) throw new RangeError('Invalid frame delta');
    if (!this.playing) return;
    this.elapsed += Math.min(delta, 100) * this.speed;
    if (this.repeating) this.elapsed %= RIG.repeatPeriod;
    else if (this.elapsed >= RIG.duration) {
      this.elapsed = RIG.duration;
      this.playing = false;
    }
  }
}
