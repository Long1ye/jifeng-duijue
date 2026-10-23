import { describe, it, expect } from 'vitest';
import { basis, makeWall, endpoints, groundPoint, project, unproject, stateAt, DEFAULT, LIFE } from '../assets/hero-skills/2026-10-12/yasuo/w-v4-free-angle/wall';

describe('free-angle world-space wind wall', () => {
  it('supports every degree without snapping, with wall perpendicular to cast direction', () => {
    for (let angle = 0; angle < 360; angle += 0.5) {
      const caster = { x: 7, y: -11 }, wall = makeWall(caster, angle), { normal, tangent } = basis(angle);
      expect(wall.angle).toBe(angle);
      expect(normal.x * tangent.x + normal.y * tangent.y).toBeCloseTo(0);
      expect(Math.hypot(wall.center.x - caster.x, wall.center.y - caster.y)).toBeCloseTo(DEFAULT.distance);
      const [a, b] = endpoints(wall);
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(DEFAULT.width);
    }
  });
  it('keeps height upright and gives the volume thickness at all angles', () => {
    const camera = { origin: { x: 144, y: 150 }, groundScale: 0.58 };
    for (let angle = 0; angle < 360; angle++) {
      const wall = makeWall({ x: 0, y: 0 }, angle);
      const p = groundPoint(wall, 12), low = project(p, 0, camera), high = project(p, 57, camera);
      expect(high.x).toBe(low.x); expect(low.y - high.y).toBeCloseTo(57);
      const front = groundPoint(wall, 0, 5), back = groundPoint(wall, 0, -5);
      expect(Math.hypot(front.x - back.x, front.y - back.y)).toBeCloseTo(10);
    }
  });
  it('round-trips placement coordinates and normalizes angles', () => {
    const camera = { origin: { x: 144, y: 150 }, groundScale: 0.58 }, p = { x: -18, y: 23 };
    const roundtrip = unproject(project(p, 0, camera), camera);
    expect(roundtrip.x).toBeCloseTo(p.x); expect(roundtrip.y).toBeCloseTo(p.y);
    expect(makeWall(p, -45).angle).toBe(315); expect(makeWall(p, 405).angle).toBe(45);
  });
  it('rises from the middle, persists then disappears cleanly', () => {
    expect(stateAt(-1).active).toBe(false); expect(stateAt(0).grow).toBe(0);
    expect(stateAt(150, 0).grow).toBeGreaterThan(stateAt(150, 1).grow);
    expect(stateAt(LIFE.rise, 1).grow).toBe(1);
    expect(stateAt(2000).opacity).toBe(1); expect(stateAt(LIFE.end).opacity).toBe(0);
    expect(stateAt(LIFE.end).active).toBe(false);
  });
  it('placed wall is a snapshot independent of later caster movement', () => {
    const caster = { x: 10, y: 20 }, wall = makeWall(caster, 137), oldCenter = { ...wall.center };
    caster.x = 90; caster.y = 100;
    expect(wall.center).toEqual(oldCenter); expect(wall.angle).toBe(137);
  });
});
