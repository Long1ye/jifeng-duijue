/** Candidate art contract, separate from simulation/collision data. Coordinates are local bridge u/v. */
export const CENTRAL_BRIDGE = {
  minU: -88, maxU: 80, halfWidth: 112, focusU: -4,
  edgeMinU: -172, edgeMaxU: 164,
  groundY: 0.50, snowY: 0.54, cameraElevation: 45,
  // Structural dimensions: architecture is solid and no longer fitted to facade images.
  archHeight: 380, deckBottom: -16,
} as const;
export const CENTRAL_RAILS = [-1, 1].flatMap(side => Array.from({ length: 8 }, (_, i) => ({
  startU: -172 + i * 42, endU: -172 + (i + 1) * 42, v: side * 110, foreground: side === 1,
})));
export const CENTRAL_ARCHES = [-1, 1].flatMap(side => Array.from({ length: 4 }, (_, i) => ({
  startU: -172 + i * 84, endU: -172 + (i + 1) * 84, v: side * 111,
})));
