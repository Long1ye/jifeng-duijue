import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { EQ } from '../src/game/YasuoE';
import { grantStorm } from '../src/game/YasuoStorm';
import { meowaEQPose, MEOWA_EQ_RIM } from '../src/render/MeowaEQPresentation';

describe('wider circular EQ and EQ3', () => {
  for (const empowered of [false, true]) for (let direction = 0; direction < 8; direction++) {
    it(`${empowered ? 'EQ3' : 'EQ'} hits the added annulus in direction ${direction} only once`, () => {
      const m = new Match({ ai: false, waves: false }); m.start();
      const h = m.hero('blue'), target = m.hero('red');
      Object.assign(h, { x: 500, y: 350 });
      Object.assign(target, { x: 559, y: 350, speed: 0, damage: 0, hp: 2000, maxHp: 2000 });
      if (empowered) { grantStorm(h, 0); grantStorm(h, 0); }
      expect(m.cast('blue', 'e', target)).toBe(true);
      const end = h.eCast!.end, angle = direction * Math.PI / 4;
      const inside = m.spawnMinion('red', 'melee', end), outside = m.spawnMinion('red', 'melee', end);
      const ally = m.spawnMinion('blue', 'melee', end);
      for (const [unit, distance] of [[inside, 52], [outside, EQ.radius + outside.radius + .05], [ally, 52]] as const) {
        Object.assign(unit, { x: end.x + Math.cos(angle) * distance, y: end.y + Math.sin(angle) * distance,
          speed: 0, damage: 0, hp: 2000, maxHp: 2000 });
      }
      expect(52).toBeGreaterThan(38 + inside.radius);
      expect(m.cast('blue', 'q', target)).toBe(true);
      for (let i = 0; i < 110; i++) m.step(1 / 120);
      const hits = m.drainEvents().filter(e => e.type === 'hit' && e.impact === (empowered ? 'eq3' : 'eq'));
      expect(hits.filter(e => e.targetId === inside.id)).toHaveLength(1);
      expect(hits.some(e => e.targetId === outside.id || e.targetId === ally.id)).toBe(false);
      expect((inside.airborneUntil ?? 0) > m.time).toBe(empowered);
      expect(outside.airborneStartedAt).toBeUndefined(); expect(m.projectiles).toHaveLength(0);
    });
  }
  it('reaches the full generated cutting rim exactly on contact and releases at recovery', () => {
    const cast = { startedAt: .42, triggerAt: .52, endsAt: .82, eStartedAt: 0, facing: 0, hit: false, empowered: true, critical: false };
    expect(meowaEQPose(cast, .43).visible).toBe(false);
    expect(meowaEQPose(cast, .50).frame).toBe(1);
    const contact = meowaEQPose(cast, .52);
    expect(contact).toMatchObject({ visible: true, frame: 2, alpha: 1 });
    expect(contact.width * MEOWA_EQ_RIM / 256).toBeCloseTo(EQ.radius);
    expect(meowaEQPose(cast, .819).frame).toBe(7);
    expect(meowaEQPose(cast, .82)).toMatchObject({ visible: false, alpha: 0 });
  });
});
