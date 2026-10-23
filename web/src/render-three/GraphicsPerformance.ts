import type { QualityEffect } from './QualitySettings';

export const GRAPHICS_PROFILES = {
  high: { label: '高清', width: 1920, fps: 60, environmentHz: 30, reduced: false, enhanced: true, fogSamples: 4, anisotropy: 8, effects: ['contact', 'materials', 'grading', 'glow', 'weather', 'winter'] },
  balanced: { label: '均衡', width: 1600, fps: 60, environmentHz: 15, reduced: false, enhanced: true, fogSamples: 0, anisotropy: 4, effects: ['contact', 'materials', 'grading', 'glow'] },
  low: { label: '低配', width: 1280, fps: 30, environmentHz: 10, reduced: true, enhanced: true, fogSamples: 0, anisotropy: 2, effects: ['contact', 'grading'] },
  minimum: { label: '极低配', width: 640, fps: 30, environmentHz: 8, reduced: true, enhanced: false, fogSamples: 0, anisotropy: 1, effects: [] },
} as const;
export type GraphicsRenderWidth = 640 | 960 | 1280 | 1600 | 1920;
export type GraphicsTier = keyof typeof GRAPHICS_PROFILES;
export type GraphicsMode = GraphicsTier | 'auto' | 'custom';
export const GRAPHICS_STORAGE_KEY = 'jifeng.graphics.v1';
export const GRAPHICS_EFFECTS: QualityEffect[] = ['contact', 'materials', 'grading', 'glow', 'weather', 'winter'];
/** Bound both pixel count and width, and never supersample a small CSS viewport. */
export function graphicsBufferSize(width: number, height: number, maximumWidth: number) {
  const scale = Math.min(1, maximumWidth / width, Math.sqrt(maximumWidth * maximumWidth * 9 / 16 / (width * height)));
  return { width: Math.max(1, Math.floor(width * scale)), height: Math.max(1, Math.floor(height * scale)) };
}
export interface GraphicsPreferences {
  mode: GraphicsMode;
  tier: GraphicsTier;
  custom?: { width: GraphicsRenderWidth; reduced: boolean; enhanced: boolean; effects: QualityEffect[] };
}
const isTier = (value: unknown): value is GraphicsTier => typeof value === 'string' && Object.hasOwn(GRAPHICS_PROFILES, value);

/** Hardware hints choose a conservative start; measured frame time decides later reductions. */
export function initialGraphicsTier(hints: { hardwareConcurrency?: number; deviceMemory?: number }): GraphicsTier {
  return (hints.hardwareConcurrency !== undefined && hints.hardwareConcurrency <= 4)
    || (hints.deviceMemory !== undefined && hints.deviceMemory <= 4) ? 'low' : 'balanced';
}
export function readGraphicsPreferences(raw: string | null, fallback: GraphicsTier): GraphicsPreferences {
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || !isTier(value.tier) || !(isTier(value.mode) || value.mode === 'auto' || value.mode === 'custom')) throw new Error();
    if (value.mode === 'custom') {
      const c = value.custom;
      if (!c || ![640, 960, 1280, 1600, 1920].includes(c.width) || typeof c.reduced !== 'boolean' || typeof c.enhanced !== 'boolean'
        || !Array.isArray(c.effects) || !c.effects.every((effect: QualityEffect) => GRAPHICS_EFFECTS.includes(effect))) throw new Error();
      return { mode: 'custom', tier: value.tier, custom: { width: c.width, reduced: c.reduced, enhanced: c.enhanced, effects: c.effects } };
    }
    return { mode: value.mode, tier: isTier(value.mode) ? value.mode : value.tier };
  } catch { return { mode: 'auto', tier: fallback }; }
}

/** Samples RAF availability, independently of the optional 30 FPS drawing cap.
 * Only sustained load lowers quality; a session never automatically raises it again. */
export class AdaptiveGraphics {
  private warmup = 3;
  private duration = 0;
  private frames = 0;
  private badWindows = 0;
  constructor(public mode: GraphicsMode, public tier: GraphicsTier) {}
  select(mode: GraphicsMode): void {
    this.mode = mode;
    if (isTier(mode)) this.tier = mode;
    this.reset();
  }
  reset(): void { this.warmup = 3; this.duration = 0; this.frames = 0; this.badWindows = 0; }
  sample(seconds: number, active: boolean): GraphicsTier | null {
    if (!active) { this.reset(); return null; }
    if (this.mode !== 'auto' || !Number.isFinite(seconds) || seconds <= 0 || seconds > .25) return null;
    if (this.warmup > 0) { this.warmup -= seconds; return null; }
    this.duration += seconds; this.frames++;
    if (this.duration < 2) return null;
    const slow = this.duration / this.frames > (this.tier === 'low' || this.tier === 'minimum' ? 1 / 24 : 1 / 40);
    this.badWindows = slow ? this.badWindows + 1 : 0;
    this.duration = 0; this.frames = 0;
    if (this.badWindows < 2 || this.tier === 'minimum') return null;
    this.tier = this.tier === 'high' ? 'balanced' : this.tier === 'balanced' ? 'low' : 'minimum';
    this.reset();
    return this.tier;
  }
}

/** Gate presentation only: callers must still consume events and update gameplay every RAF. */
export class PresentationCadence {
  private next = -Infinity;
  constructor(public fps = 0) {}
  reset(): void { this.next = -Infinity; }
  due(now: number): boolean {
    if (!this.fps) return true;
    if (now + .5 < this.next) return false;
    const interval = 1000 / this.fps;
    this.next = now - this.next > interval ? now + interval : this.next + interval;
    return true;
  }
}
