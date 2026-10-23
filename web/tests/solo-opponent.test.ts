import { describe, expect, it } from 'vitest';
import { soloOpponent } from '../src/game/SoloOpponent';
import { Match } from '../src/game/Match';
import { NAILONG } from '../src/game/Nailong';

describe('single player opponent selection', () => {
  it('prefers an explicit match choice, validates stored choices and keeps the previous default', () => {
    expect(soloOpponent('yasuo', 'nailong')).toBe('yasuo');
    expect(soloOpponent('nailong', 'yasuo')).toBe('nailong');
    expect(soloOpponent(null, 'yasuo')).toBe('yasuo');
    expect(soloOpponent(null)).toBe('nailong');
    expect(soloOpponent('invalid', 'invalid')).toBe('nailong');
  });
  it.each(['yasuo', 'nailong'] as const)('creates and restarts a match against %s without changing the player hero', opponent => {
    for (let restart = 0; restart < 2; restart++) {
      const match = new Match({ league: true, waves: false, enemyChampion: soloOpponent(opponent) });
      expect(match.hero('blue').champion).not.toBe('nailong');
      expect(match.hero('red').champion === 'nailong').toBe(opponent === 'nailong');
      if (opponent === 'nailong') {
        expect(match.hero('red').damage).toBe(NAILONG.damage);
        expect(match.hero('red').attackInterval).toBe(NAILONG.attackInterval);
      }
      match.start(); for (let i = 0; i < 120; i++) match.step(1 / 60);
      expect(match.time).toBeCloseTo(2);
    }
  });
});
