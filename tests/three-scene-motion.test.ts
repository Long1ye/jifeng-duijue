import { describe, expect, it } from 'vitest';
import { fireFlicker } from '../src/render-three/EnvironmentMotion';
import { wallDetailGeometry } from '../src/render-three/PaintedSmallDetails';
import { BRIDGE } from '../src/game/Bridge';

describe('scene ambient motion foundations', () => {
  it('has continuous, bounded light variation, independent phases and no accumulated state', () => {
    const samples = Array.from({ length: 300 }, (_, i) => fireFlicker(i / 60));
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(.25);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(.83); expect(samples[i]).toBeLessThan(1.17);
      expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(.03);
    }
    expect(fireFlicker(2, 0)).not.toBe(fireFlicker(2, 1));
    const paused = fireFlicker(2); fireFlicker(500);
    expect(fireFlicker(2)).toBe(paused);
    expect(fireFlicker(0)).toBe(1);
  });
  it('subdivides flags without changing the wall attachment or source projection', () => {
    const geometry = wallDetailGeometry(196, 335, 28, 8);
    try {
      const positions = geometry.getAttribute('position'), uv = geometry.getAttribute('uv');
      expect(positions.count).toBe(153);
      let pinned = 0, middle = 0;
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
        expect(z).toBeCloseTo(x * BRIDGE.projection.along[1] / BRIDGE.projection.along[0], 5);
        expect(y - z).toBeCloseTo(-(1 - uv.getY(i)) * 335 * 28 / 196 * Math.SQRT2, 5);
        if (uv.getY(i) === 1) { expect(y).toBeCloseTo(z, 5); pinned++; }
        if (uv.getY(i) > 0 && uv.getY(i) < 1) middle++;
      }
      expect(pinned).toBe(9); expect(middle).toBeGreaterThan(100);
    } finally { geometry.dispose(); }
  });
});
