import type { Point } from '../game/types';

/** Screen-space strokes in world units. Rear strokes pass behind the character. */
export interface SpellBrush {
  stroke(a: Point, b: Point, color: number, alpha: number, width: number, front: boolean): void;
}
const TAU = Math.PI * 2;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

function ribbon(brush: SpellBrush, points: Point[], color: number, alpha: number, width: number, front = true) {
  for (let i = 1; i < points.length; i++) {
    const taper = Math.sin((i - .5) / (points.length - 1) * Math.PI);
    brush.stroke(points[i - 1], points[i], color, alpha * taper, Math.max(.25, width * taper), front);
  }
}

/** Three low, revolving wind ribbons, rather than upright fire or a full tornado. */
export function drawClassicReady(brush: SpellBrush, age: number, fade: number) {
  for (let band = 0; band < 3; band++) {
    const phase = age * 4.8 + band * TAU / 3;
    for (let i = 0; i < 30; i++) {
      const t = i / 30, a = phase + t * 4.1, b = phase + (t + 1 / 30) * 4.1;
      const radius = 26 + band * 2, y = -9 - band * 16 - t * 12;
      const p = { x: Math.cos(a) * radius, y: y + Math.sin(a) * 7 };
      const q = { x: Math.cos(b) * radius, y: y - .4 + Math.sin(b) * 7 };
      const alpha = fade * Math.sin(t * Math.PI) * .68, front = Math.sin(a) > 0;
      brush.stroke(p, q, 0x76adaf, alpha * .2, 5, front);
      brush.stroke(p, q, 0xb9ded7, alpha, 1.6 * Math.sin(t * Math.PI), front);
      if (t > .35 && t < .75) brush.stroke(p, q, 0xe2eee0, alpha * .6, .55, front);
    }
  }
  for (let i = 0; i < 5; i++) {
    const t = (age * .65 + i / 5) % 1, a = age * 2 + i * 2.4;
    const x = Math.cos(a) * (26 + t * 5), y = -t * 62;
    brush.stroke({ x, y }, { x: x - 1, y: y + 3 }, 0xd5e8de, Math.sin(t * Math.PI) * fade * .45, .65, Math.sin(a) > 0);
  }
}

/** Compact blue defensive shell and an outward wind release on break/expiry. */
export function drawClassicShield(brush: SpellBrush, age: number, releaseAge: number | null, strength: number) {
  if (releaseAge !== null) {
    if (releaseAge < 0 || releaseAge >= .3) return;
    const t = releaseAge / .3;
    for (let i = 0; i < 11; i++) {
      const angle = i * TAU / 11 + .2, radius = 25 + t * 21;
      const points = Array.from({ length: 7 }, (_, j) => {
        const a = angle + j * .055;
        return { x: Math.cos(a) * radius, y: -37 + Math.sin(a) * radius * 1.35 + t * 7 };
      });
      ribbon(brush, points, i % 3 ? 0xb9e3e9 : 0xf3f3dd, (1 - t) ** 2 * .85, 2 * (1 - t));
    }
    return;
  }
  const enter = clamp(age / .08), alpha = enter * strength;
  for (let side = 0; side < 2; side++) {
    const points = Array.from({ length: 31 }, (_, i) => {
      const a = -.5 * Math.PI + i / 30 * Math.PI;
      return { x: (side ? 1 : -1) * Math.cos(a) * 27 * (.9 + .1 * enter), y: -39 + Math.sin(a) * 43 };
    });
    ribbon(brush, points, 0x35899f, alpha * .16, 9, false);
    ribbon(brush, points, 0x79cbd9, alpha * .6, 2.2);
    ribbon(brush, points, 0xe0eee8, alpha * .5, .7);
  }
  for (let i = 0; i < 2; i++) {
    const points = Array.from({ length: 30 }, (_, j) => {
      const a = age * 3 + i * Math.PI + j / 30 * 3.9;
      return { x: Math.cos(a) * 27, y: -32 + Math.sin(a) * 13 - j / 30 * 8 };
    });
    ribbon(brush, points, 0x9bd4d9, alpha * .45, 1.6, i === 0);
  }
}

/** Flash is an asymmetric golden snap, with no connecting beam across teleport. */
export function drawClassicFlash(brush: SpellBrush, age: number, arrival: boolean) {
  if (age < 0 || age >= .32) return;
  const t = age / .32, alpha = (1 - t) ** 2, size = arrival ? 1 : .78;
  const x = (arrival ? -1 : 1) * t * 5;
  const top = { x: x - 2, y: -69 * size - t * 8 }, bottom = { x: x + 2, y: -4 };
  ribbon(brush, [top, { x, y: -40 }, { x: x + 1, y: -22 }, bottom], 0xf9b52d, alpha * .2, 18 * (1 - t));
  ribbon(brush, [top, { x, y: -40 }, { x: x + 1, y: -22 }, bottom], 0xffdb65, alpha * .85, 5 * (1 - t));
  ribbon(brush, [{ x, y: -58 * size }, { x, y: -29 }, { x, y: -9 }], 0xfff5cb, alpha, 1.7 * (1 - t));
  for (let i = 0; i < 5; i++) {
    const a = i * 2.4 + .5, length = (19 + i % 3 * 5) * size * (1 - t * .5);
    ribbon(brush, [{ x: 0, y: -29 }, { x: Math.cos(a) * length * .4, y: -29 + Math.sin(a) * length * .4 }, { x: Math.cos(a) * length, y: -29 + Math.sin(a) * length }], 0xffe9a4, alpha * .8, (3 + i % 2) * (1 - t));
  }
  for (let i = 0; i < 7; i++) {
    const a = i * 2.4 + (arrival ? .3 : 1), r = (9 + t * 29) * size;
    const p = { x: Math.cos(a) * r, y: -29 + Math.sin(a) * r * .75 };
    const q = { x: p.x + Math.cos(a) * (4 + (1 - t) * 7), y: p.y + Math.sin(a) * 7 };
    brush.stroke(p, q, i % 2 ? 0xffe791 : 0xe8b541, alpha * .8, 1.3 * (1 - t), true);
  }
  if (age < .09) {
    const a = 1 - age / .09;
    brush.stroke({ x: -13 * size, y: -29 }, { x: 13 * size, y: -29 }, 0xfff5ce, a * .9, 2 * a, true);
  }
}

/** Small, separated fire tongues cling to the victim throughout the actual DoT. */
export function drawClassicIgnite(brush: SpellBrush, age: number, remaining: number, scale = 1) {
  const fade = Math.min(clamp(age / .06), clamp(remaining / .25));
  for (let i = 0; i < 6; i++) {
    const t = (age * (1.8 + i * .07) + i * .163) % 1;
    const x = (i % 3 - 1) * 12 + Math.sin(i * 7) * 3, y = -5 - Math.floor(i / 3) * 19;
    const points = Array.from({ length: 13 }, (_, j) => {
      const p = j / 12;
      return { x: (x + Math.sin(p * 6 - t * 5 + i) * (2 + p * 3)) * scale, y: (y - p * (16 + Math.sin(t * Math.PI) * 10)) * scale };
    });
    const alpha = fade * (.55 + .45 * Math.sin(t * Math.PI));
    ribbon(brush, points, 0xb43613, alpha * .35, 7 * scale, i > 2);
    ribbon(brush, points, 0xf36c18, alpha * .85, 3.5 * scale, i > 2);
    ribbon(brush, points.slice(0, 8), 0xffce67, alpha * .9, 1.3 * scale, i > 2);
  }
  for (let i = 0; i < 7; i++) {
    const t = (age * .8 + i / 7) % 1, x = (Math.sin(i * 7 + t * 3) * 17) * scale, y = (-18 - t * 44) * scale;
    brush.stroke({ x, y }, { x: x + .8 * scale, y: y + 2 * scale }, 0xffba53, fade * Math.sin(t * Math.PI), .9 * scale, true);
  }
}
