import { Match } from './Match';
export const E_PRACTICE_CENTER = { x: 500, y: 350 };
export function createEPractice(): Match {
  const m = new Match({ ai: false, waves: false });
  Object.assign(m.hero('blue'), E_PRACTICE_CENTER);
  for (let i = 0; i < 8; i++) {
    const angle = i * Math.PI / 4;
    const target = m.spawnMinion('red', 'melee', {
      x: E_PRACTICE_CENTER.x + Math.cos(angle) * 58,
      y: E_PRACTICE_CENTER.y + Math.sin(angle) * 58,
    });
    target.speed = 0; target.damage = 0; target.maxHp = target.hp = 2000;
  }
  return m;
}
