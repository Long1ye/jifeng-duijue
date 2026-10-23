import type { Point } from '../game/types';
import type { SpellBrush } from './ClassicSpellVfx';
import { YASUO_Q_HIT_SECONDS } from '../game/YasuoQ';
import { HERO_EFFECT_SCALE } from './Presentation';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
export const CLASSIC_Q_DURATION = .18;

/** The approved body mirrors the hand; the wind and point follow the actual aim. */
export function classicQPose(age: number, facing: number) {
 const elapsed = age - YASUO_Q_HIT_SECONDS;
 const extend = clamp(elapsed / .025), fade = clamp((CLASSIC_Q_DURATION - elapsed) / .085);
 return { visible: elapsed >= 0 && elapsed < CLASSIC_Q_DURATION, elapsed,
  hand: { x: (Math.cos(facing) < -.001 ? -1 : 1) * 16 * HERO_EFFECT_SCALE, y: -30 * HERO_EFFECT_SCALE },
  reach: 89 + extend * 18, alpha: fade, wind: Math.sin(clamp(elapsed / CLASSIC_Q_DURATION) * Math.PI) };
}

/** Silver needle and open, desaturated wind envelope; no broad energy projectile. */
export function drawClassicQThrust(brush: SpellBrush, age: number, facing: number) {
 const pose = classicQPose(age, facing); if (!pose.visible) return;
 const c = Math.cos(facing), s = Math.sin(facing), alpha = pose.alpha;
 const point = (x: number, y: number): Point => ({ x: pose.hand.x + c * x - s * y, y: pose.hand.y + s * x + c * y });
 const line = (x: number, y: number, bx: number, by: number, color: number, a: number, width: number) => brush.stroke(point(x, y), point(bx, by), color, a, width, true);
 // A narrow steel edge remains legible against the pale bridge under the wind.
 for (let i = 0; i < 24; i++) {
  const t = i / 24, next = (i + 1) / 24, taper = Math.sin((.16 + t * .84) * Math.PI);
  const a = 3 + t * pose.reach, b = 3 + next * pose.reach;
  line(a, .6, b, .6, 0x344850, alpha * .65, (1.7 - t) * .9);
  line(a, 0, b, 0, 0xd5ded9, alpha * (.65 + taper * .35), 1.35 * (1 - t * .8));
  line(a, -.45, b, -.45, 0xfff9e0, alpha * .82 * taper, .5);
 }
 // Two long, broken air trails converge to a single sharp tip.
 for (const side of [-1, 1]) for (let i = 0; i < 30; i++) {
  const t = i / 30, next = (i + 1) / 30;
  const wave = (v: number) => side * Math.sin(v * Math.PI) * (5.5 + pose.wind * 2) + Math.sin(v * 8 - pose.elapsed * 18 + side) * 1.1 * Math.sin(v * Math.PI);
  const a = alpha * Math.sin(t * Math.PI) * (.28 + pose.wind * .38);
  line(8 + t * pose.reach, wave(t), 8 + next * pose.reach, wave(next), 0xc6d4cb, a * .24, 3.2 * Math.sin(t * Math.PI));
  if (!(i > 8 && i < 12 && side < 0)) line(8 + t * pose.reach, wave(t), 8 + next * pose.reach, wave(next), 0xe0e5d3, a, .65 + .4 * Math.sin(t * Math.PI));
 }
 // Faint air motes travel outward and disperse rather than sparkle at the hand.
 for (let i = 0; i < 4; i++) {
  const t = clamp(pose.elapsed / CLASSIC_Q_DURATION), x = 24 + i * 20 + t * 16, y = (i % 2 ? 1 : -1) * (5 + t * 5);
  line(x, y, x + 3, y - .4, 0xd1d5c7, alpha * pose.wind * .4, .55);
 }
}

/** Only emitted by real Q hit events. A small axial flash and two curling air wisps. */
export function drawClassicQContact(brush: SpellBrush, age: number, heading: number) {
 if (age < 0 || age >= .2) return;
 const t = age / .2, fade = (1 - t) ** 2, c = Math.cos(heading), s = Math.sin(heading);
 const point = (x: number, y: number): Point => ({ x: x * c - y * s, y: x * s + y * c });
 if (age < .065) {
  brush.stroke(point(-12, 0), point(19, 0), 0xf7f4df, (1 - age / .065) * .95, 1.4, true);
  brush.stroke(point(-2, -5), point(2, 5), 0xe2e6d6, (1 - age / .065) * .65, .8, true);
 }
 for (const side of [-1, 1]) for (let i = 0; i < 15; i++) {
  const a = i / 15 * 2.6 + .35, b = (i + 1) / 15 * 2.6 + .35, r = 4 + t * 10;
  brush.stroke(point(Math.cos(a) * r + t * 5, Math.sin(a) * r * side * .6), point(Math.cos(b) * r + t * 5, Math.sin(b) * r * side * .6), 0xd5dfd2, fade * Math.sin(i / 15 * Math.PI) * .6, .9, true);
 }
 for (let i = 0; i < 4; i++) {
  const angle = i * 2.4, x = Math.cos(angle) * (4 + t * 19) + t * 7, y = Math.sin(angle) * (3 + t * 10);
  brush.stroke(point(x, y), point(x + 2, y - 1), 0xc9c9b0, fade * .6, .7, true);
 }
}
