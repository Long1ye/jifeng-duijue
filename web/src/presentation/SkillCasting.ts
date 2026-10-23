import type { AbilityKey } from '../game/types';

export type CastMode = 'instant' | 'release';

/** All previews are local input state. Only confirmed casts reach the simulation. */
export class SkillCasting {
  mode: CastMode = 'instant';
  active: AbilityKey | null = null;
  source: 'keyboard' | 'ui' | null = null;
  constructor(private readonly cast: (key: AbilityKey) => void, private readonly changed: (key: AbilityKey | null) => void) {}
  setMode(mode: CastMode): void { this.cancel(); this.mode = mode; }
  keyDown(key: AbilityKey): void {
    this.cancel();
    if (this.mode === 'instant') this.cast(key);
    else this.select(key, 'keyboard');
  }
  keyUp(key: AbilityKey): void {
    if (this.active === key && this.source === 'keyboard') this.confirm();
  }
  select(key: AbilityKey, source: 'keyboard' | 'ui' = 'ui'): void {
    this.active = key; this.source = source; this.changed(key);
  }
  confirm(): boolean {
    if (!this.active) return false;
    const key = this.active; this.cancel(); this.cast(key); return true;
  }
  cancel(): boolean {
    const had = this.active !== null;
    this.active = null; this.source = null; this.changed(null); return had;
  }
}
