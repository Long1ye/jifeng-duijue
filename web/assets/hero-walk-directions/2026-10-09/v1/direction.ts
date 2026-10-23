/** Screen/world coordinates: +X east, +Y south, positive angles clockwise. */
export const DIRECTIONS = ['e', 'se', 's', 'sw', 'w', 'nw', 'n', 'ne'] as const;
export type SpriteDirection = typeof DIRECTIONS[number];

const TAU = Math.PI * 2;
const SECTOR = TAU / DIRECTIONS.length;

/** Quantize only artwork, never the velocity or target position. */
export function headingToDirection(angle: number, previous?: SpriteDirection, hysteresisDegrees = 4): SpriteDirection {
  if (!Number.isFinite(angle)) throw new RangeError('Heading must be finite');
  if (!Number.isFinite(hysteresisDegrees) || hysteresisDegrees < 0 || hysteresisDegrees >= 22.5) {
    throw new RangeError('Hysteresis must be between 0 and 22.5 degrees');
  }
  const normalized = ((angle % TAU) + TAU) % TAU;
  if (previous !== undefined) {
    const center = DIRECTIONS.indexOf(previous) * SECTOR;
    const difference = Math.atan2(Math.sin(normalized - center), Math.cos(normalized - center));
    if (Math.abs(difference) <= SECTOR / 2 + hysteresisDegrees * Math.PI / 180) return previous;
  }
  return DIRECTIONS[Math.floor((normalized + SECTOR / 2) / SECTOR) % DIRECTIONS.length];
}

/** A stopped unit retains its last facing instead of snapping east. */
export function velocityToDirection(dx: number, dy: number, previous: SpriteDirection = 's'): SpriteDirection {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) throw new RangeError('Velocity must be finite');
  if (dx === 0 && dy === 0) return previous;
  return headingToDirection(Math.atan2(dy, dx), previous);
}
