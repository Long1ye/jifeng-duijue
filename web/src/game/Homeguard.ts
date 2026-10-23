import { BALANCE, BASES, TOWERS } from './config';
import { distance, direction } from './geometry';
import type { Entity } from './types';

export const HOMEGUARD = { multiplier: 1.6, duration: 45, combatLock: 8 } as const;

export function updateHomeguard(hero: Entity, time: number): void {
  if (hero.kind !== 'hero') return;
  const base = BASES[hero.team], tower = TOWERS[hero.team];
  const dir = direction(base, tower);
  const progress = (hero.x-base.x)*dir.x+(hero.y-base.y)*dir.y;
  const fighting = hero.targetId !== null || hero.windup > 0 || hero.qCast || hero.q3Cast || hero.wCast || hero.eCast || hero.rCast;
  const recentHit = time-hero.hitAt < HOMEGUARD.combatLock;
  if (fighting || recentHit || hero.hp <= 0) {
    if (fighting) hero.homeguardCombatAt = time;
    hero.homeguardUntil = 0;
    return;
  }
  if (time-(hero.homeguardCombatAt ?? -Infinity) < HOMEGUARD.combatLock) {
    hero.homeguardUntil = 0;
    return;
  }
  if (distance(hero,base) < BALANCE.fountainRadius) hero.homeguardUntil = time+HOMEGUARD.duration;
  // Stop slightly before the outer tower, independent of map length or team.
  if (progress >= Math.max(BALANCE.fountainRadius, distance(base,tower)-70)) hero.homeguardUntil = 0;
}

export function homeguardActive(hero: Entity, time: number): boolean {
  return hero.kind === 'hero' && hero.hp > 0 && (hero.homeguardUntil ?? 0) > time;
}
