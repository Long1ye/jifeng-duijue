import type { Entity } from './types';
export const STORM = { stackDuration: 6, castDuration: .8, releaseDelay: .3, speed: 250, range: 290, radius: 14, knockup: 1 } as const;
export function stormReady(hero: Entity, now: number): boolean {
  return hero.hp > 0 && (hero.qStacks ?? 0) === 2 && (hero.qStacksUntil ?? 0) > now;
}
export function clearStorm(hero: Entity): void { hero.qStacks = 0; hero.qStacksUntil = 0; hero.qReadyAt = undefined; }
export function grantStorm(hero: Entity, now: number): void {
  if (hero.kind !== 'hero' || hero.hp <= 0 || hero.rCast) return;
  if ((hero.qStacksUntil ?? 0) <= now) clearStorm(hero);
  const previous = hero.qStacks ?? 0;
  hero.qStacks = Math.min(2, previous + 1); hero.qStacksUntil = now + STORM.stackDuration;
  if (previous < 2 && hero.qStacks === 2) hero.qReadyAt = now;
}
