import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { ABILITIES, WORLD } from '../src/game/config';
import { YASUO_Q_CAST_SECONDS } from '../src/game/YasuoQ';
import { YasuoAnimator } from '../src/render/YasuoAnimation';
import { sampleYasuoQ, YASUO_Q_ASSETS } from '../src/render/YasuoQAnimation';
import { DIRECTIONS } from '../assets/hero-walk-directions/2026-10-09/v1/direction';

function setup() {
  const match = new Match({ ai: false, waves: false }); match.start();
  const hero = match.hero('blue'); hero.x = 500; hero.y = 300;
  return { match, hero, animator: new YasuoAnimator() };
}
function advance(match: Match, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / WORLD.step); i++) match.step(WORLD.step);
}
describe('Yasuo Q in the main game', () => {
  it('uses a 2.5-second Q cooldown for both Yasuo heroes', () => {
    const { match, hero } = setup();
    const aim = { x: 600, y: 300 };
    expect(ABILITIES.q.cooldown).toBe(2.5);
    expect(match.cast('blue', 'q', aim)).toBe(true);
    advance(match, 2.4);
    expect(match.cast('blue', 'q', aim)).toBe(true);
    expect(hero.abilities.q).toBeCloseTo(2.5);
    advance(match, .11);
    expect(match.bufferedOrder('blue')).toBeUndefined();
    expect(hero.abilities.q - match.time).toBeGreaterThan(2.45);
    expect(hero.abilities.q - match.time).toBeLessThanOrEqual(2.5);
    expect(match.cast('red', 'q', hero)).toBe(true);
    expect(match.hero('red').abilities.q - match.time).toBeCloseTo(2.5);
  });
  it('selects all eight approved clips from cast aim, including arbitrary angles without facing hysteresis', () => {
    for (let i = 0; i < DIRECTIONS.length; i++) {
      const { match, hero, animator } = setup(), angle = i * Math.PI / 4 + 0.15;
      expect(match.cast('blue', 'q', { x: hero.x + Math.cos(angle) * 100, y: hero.y + Math.sin(angle) * 100 })).toBe(true);
      const sample = animator.sample(hero, match.time);
      expect(sample.state).toBe('Q'); expect(sample.clip.key).toBe(`yasuo-q-${DIRECTIONS[i]}-wind`);
      expect(sample.frame).toBe(0); expect(sample.scale * 108).toBeCloseTo(26);
      expect(Math.cos(hero.qCast!.facing)).toBeCloseTo(Math.cos(angle));
      expect(Math.sin(hero.qCast!.facing)).toBeCloseTo(Math.sin(angle));
      expect(match.projectiles).toHaveLength(0);
    }
    expect(YASUO_Q_CAST_SECONDS).toBe(.72);
    expect(YASUO_Q_ASSETS.version).toBe('v29-meowa-layered-corrected-elbows');
    expect(YASUO_Q_ASSETS.clips.every(c => !c.source_pixels_preserved && c.frame_count === 31 && c.width === 480 && c.height === 430)).toBe(true);
    for (const clip of YASUO_Q_ASSETS.clips) expect(clip.anchor).toEqual([234,272]);
  });
  it('holds position and cast heading, then resumes a movement command queued during the cast', () => {
    const { match, hero, animator } = setup(); animator.sample(hero, match.time);
    match.orderMove('blue', { x: 600, y: 300 });
    match.cast('blue', 'q', { x: 500, y: 200 });
    match.orderMove('blue', { x: 400, y: 400 });
    advance(match, 0.3);
    expect([hero.x, hero.y]).toEqual([500, 300]); expect(hero.facing).toBeCloseTo(-Math.PI / 2);
    expect(animator.sample(hero, match.time).clip.key).toBe('yasuo-q-n-wind');
    advance(match, 0.45);
    expect(hero.x).toBeLessThan(500); expect(hero.y).toBeGreaterThan(300);
    expect(animator.sample(hero, match.time).state).toBe('walk'); expect(hero.qCast).toBeNull();
  });
  it('interrupts an unreleased basic attack without consuming A/B parity, then resumes the attack order', () => {
    const { match, hero, animator } = setup();
    const target = match.spawnMinion('red', 'melee', { x: 535, y: 300 }); target.speed = 0; target.damage = 0;
    match.orderAttack('blue', target.id); match.step(WORLD.step);
    expect(hero.windup).toBeGreaterThan(0);
    match.cast('blue', 'q', { x: 500, y: 200 });
    expect(hero.attackStartedAt).toBeNull(); expect(hero.windup).toBe(0);
    advance(match, 0.3); expect(hero.attacksReleased).toBe(0); expect(animator.sample(hero, match.time).state).toBe('Q');
    advance(match, 0.45); expect(animator.sample(hero, match.time).state).toBe('A');
    advance(match, 0.21); expect(hero.attacksReleased).toBe(1);
  });
  it('freezes with simulation pause, ends after recovery, and never loops during cooldown', () => {
    const { match, hero, animator } = setup();
    match.cast('blue', 'q', { x: 600, y: 300 }); advance(match, 0.2);
    const sample = animator.sample(hero, match.time); expect(sample.frame).toBeGreaterThan(0);
    match.togglePause(); advance(match, 5); expect(animator.sample(hero, match.time)).toEqual(sample);
    match.togglePause(); advance(match, 0.55); expect(animator.sample(hero, match.time).state).toBe('idle');
    advance(match, 1.4); expect(sampleYasuoQ(hero, match.time)).toBeNull();
  });
  it('does not restart on rejected input, keeps current damage/range/cost/cooldown for both teams', () => {
    const { match, hero } = setup(); const initialMana = hero.mana;
    match.cast('blue', 'q', { x: 600, y: 300 }); const cast = hero.qCast;
    expect(hero.mana).toBe(initialMana - ABILITIES.q.cost); expect(hero.abilities.q).toBe(ABILITIES.q.cooldown);
    expect(match.projectiles).toHaveLength(0);
    expect(match.cast('blue', 'q', { x: 400, y: 300 })).toBe(false); expect(hero.qCast).toBe(cast);
    match.cast('red', 'q', hero); expect(match.hero('red').qCast).not.toBeNull();
  });
  it('clears on another accepted skill, death and restart; stop clears orders without a ghost basic attack', () => {
    for (const ending of ['w', 'e', 'death', 'restart', 'stop'] as const) {
      const { match, hero, animator } = setup(); match.cast('blue', 'q', { x: 600, y: 300 });
      if(ending==='w'||ending==='e')advance(match,.5);
      if (ending === 'w') match.cast('blue', ending, { x: 600, y: 300 });
      if (ending === 'e') {
        const target=match.spawnMinion('red','melee',{x:hero.x+40,y:hero.y});
        match.cast('blue','e',target);
      }
      if (ending === 'death') match.damage(match.hero('red'), hero, 1000);
      if (ending === 'restart') { animator.reset(); expect(animator.sample(new Match().hero('blue'), 0).state).toBe('idle'); continue; }
      if (ending === 'stop') { match.stop('blue'); expect(animator.sample(hero, match.time).state).toBe('Q'); advance(match, 0.75); }
      expect(hero.qCast).toBeNull(); expect(animator.sample(hero, match.time).state).not.toBe('Q');
      expect(hero.attacksReleased).toBe(0);
    }
  });
});
