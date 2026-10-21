// Screen-space ellipses fitted to this effect's three wind rings.
// Assign every texel to exactly one depth layer without changing its color/alpha.
const rings = [
  { x: 88, y: 24, rx: 64, ry: 25 },
  { x: 88, y: 55, rx: 71, ry: 25 },
  { x: 88, y: 86, rx: 77, ry: 29 },
];
export function isFrontArc(x: number, y: number): boolean {
  let nearest = rings[0], error = Infinity;
  for (const ring of rings) {
    const distance = Math.abs(Math.hypot((x-ring.x)/ring.rx, (y-ring.y)/ring.ry)-1);
    if (distance < error) { error = distance; nearest = ring; }
  }
  return y >= nearest.y;
}
