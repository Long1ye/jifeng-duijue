import { describe, expect, it } from 'vitest';
import { DIRECTIONS, headingToDirection, velocityToDirection } from '../assets/hero-walk-directions/2026-10-09/v1/direction';
import { WORLD } from '../src/game/config';
import { Match } from '../src/game/Match';

const radians = (degrees: number) => degrees * Math.PI / 180;

describe('continuous movement and eight-direction artwork', () => {
  it('maps clockwise screen-space headings to the eight sprite directions', () => {
    for (let i = 0; i < DIRECTIONS.length; i++) {
      expect(headingToDirection(radians(i * 45))).toBe(DIRECTIONS[i]);
    }
  });

  it('wraps negative angles and complete turns without losing the north-east direction', () => {
    expect(headingToDirection(radians(-45))).toBe('ne');
    expect(headingToDirection(radians(360))).toBe('e');
    expect(headingToDirection(radians(720 + 90))).toBe('s');
    expect(headingToDirection(radians(-360 - 90))).toBe('n');
  });

  it('selects the nearest heading when there is no previous direction', () => {
    expect(headingToDirection(radians(22))).toBe('e');
    expect(headingToDirection(radians(23))).toBe('se');
    expect(headingToDirection(radians(-22))).toBe('e');
    expect(headingToDirection(radians(-23))).toBe('ne');
  });

  it('uses hysteresis to prevent flicker around adjacent direction boundaries', () => {
    expect(headingToDirection(radians(23), 'e')).toBe('e');
    expect(headingToDirection(radians(26), 'e')).toBe('e');
    expect(headingToDirection(radians(27), 'e')).toBe('se');
    expect(headingToDirection(radians(22), 'se')).toBe('se');
    expect(headingToDirection(radians(18), 'se')).toBe('e');
    expect(headingToDirection(radians(-23), 'e')).toBe('e');
    expect(headingToDirection(radians(-27), 'e')).toBe('ne');
  });

  it('retains facing at rest and supports large turns immediately', () => {
    expect(velocityToDirection(0, 0, 'nw')).toBe('nw');
    expect(velocityToDirection(1, 0, 'w')).toBe('e');
    expect(velocityToDirection(0, -1, 's')).toBe('n');
  });

  it('rejects invalid numerical input', () => {
    expect(() => headingToDirection(NaN)).toThrow(RangeError);
    expect(() => headingToDirection(Infinity)).toThrow(RangeError);
    expect(() => headingToDirection(0, 'e', 22.5)).toThrow(RangeError);
    expect(() => headingToDirection(0, 'e', -1)).toThrow(RangeError);
    expect(() => velocityToDirection(NaN, 0)).toThrow(RangeError);
  });

  it('keeps actual movement at arbitrary angles rather than snapping movement to eight headings', () => {
    for (const degrees of [17, 73, 140]) {
      const match = new Match({ ai: false, waves: false }); match.start();
      const hero = match.hero('blue'); hero.x = WORLD.width / 2; hero.y = WORLD.height / 2;
      const origin = { x: hero.x, y: hero.y }, angle = radians(degrees);
      match.orderMove('blue', { x: origin.x + Math.cos(angle) * 120, y: origin.y + Math.sin(angle) * 120 });
      for (let i = 0; i < 60; i++) match.step(WORLD.step);
      expect(hero.x - origin.x).toBeCloseTo(Math.cos(angle) * hero.speed, 7);
      expect(hero.y - origin.y).toBeCloseTo(Math.sin(angle) * hero.speed, 7);
      expect(Math.hypot(hero.x - origin.x, hero.y - origin.y)).toBeCloseTo(hero.speed, 7);
      expect(hero.facing).toBeCloseTo(angle, 7);
      expect(headingToDirection(hero.facing)).not.toBeUndefined();
    }
  });
});
