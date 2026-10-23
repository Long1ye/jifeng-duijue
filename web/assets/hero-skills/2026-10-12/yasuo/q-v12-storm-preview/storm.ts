/** Screen-space ground direction; upright artwork is never rotated. */
export const RELEASE_MS = 300;
export const FLIGHT_MS = 1150;
export function direction(degrees: number) {
  const radians = degrees * Math.PI / 180;
  return { x: Math.cos(radians), y: Math.sin(radians) };
}
export function stormPosition(degrees: number, age: number, origin = { x: 280, y: 300 }) {
  const d = direction(degrees);
  const progress = Math.max(0, Math.min(1, age / FLIGHT_MS));
  const distance = 34 + progress * 145;
  return { x: origin.x + d.x * distance, y: origin.y + d.y * distance, progress, rotation: 0 };
}
