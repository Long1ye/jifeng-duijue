export type SoloOpponent = 'yasuo' | 'nailong';
export const SOLO_OPPONENT_KEY = 'jifeng.solo-opponent.v1';
/** Validate both menu preferences and direct match links without importing the simulation. */
export function soloOpponent(requested: string | null, saved: string | null = null): SoloOpponent {
  if (requested === 'yasuo' || requested === 'nailong') return requested;
  return saved === 'yasuo' ? 'yasuo' : 'nailong';
}
