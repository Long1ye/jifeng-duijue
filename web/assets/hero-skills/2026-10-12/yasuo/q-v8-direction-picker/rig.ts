import { BINDINGS as ORIGINAL_BINDINGS, sampleLinkedThrust as sampleOriginal, type BodyBinding, type Direction } from '../q-v7-user-linked/rig';
export { DIRECTIONS, LABELS, RIG, headingForDirection } from '../q-v7-user-linked/rig';
export type { Direction };

// The visible braced/free hand is baked into the body at the near-side shoulder.
// The sword arm belongs on the opposite, far-side shoulder in these two views.
// Frontal arms are visible; downward views use an independent outward elbow pole.
// Original body images and the rear-view corrections stay intact.
export const BINDINGS: Record<Direction, BodyBinding> = {
  ...ORIGINAL_BINDINGS,
  e: { ...ORIGINAL_BINDINGS.e, ready: { x: 20, y: 8 }, pulled: { x: 18, y: 6 }, upperInFront: true },
  // A fixed outward elbow pole throughout the cast, not a mid-animation sign flip.
  se: { ...ORIGINAL_BINDINGS.se, ready: { x: 8, y: 18 }, pulled: { x: 5, y: 15 }, extended: { x: 23, y: 25 }, elbowBend: -1, upperInFront: true },
  s: { ...ORIGINAL_BINDINGS.s, ready: { x: 7, y: 23 }, pulled: { x: 5, y: 20 }, extended: { x: 0, y: 35 }, elbowBend: -1, upperInFront: true },
  sw: { ...ORIGINAL_BINDINGS.sw, ready: { x: -8, y: 18 }, pulled: { x: -5, y: 15 }, extended: { x: -23, y: 25 }, elbowBend: 1, upperInFront: true },
  w: { ...ORIGINAL_BINDINGS.w, ready: { x: -20, y: 8 }, pulled: { x: -18, y: 6 }, upperInFront: true },
  nw: { ...ORIGINAL_BINDINGS.nw, shoulder: { x: 29, y: 59 } },
  ne: { ...ORIGINAL_BINDINGS.ne, shoulder: { x: 98, y: 59 } },
};

export function sampleLinkedThrust(angle: number, milliseconds: number, linked = true, repeat = false) {
  return sampleOriginal(angle, milliseconds, linked, repeat, BINDINGS);
}
