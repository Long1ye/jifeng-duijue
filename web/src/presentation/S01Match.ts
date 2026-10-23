import { Match } from '../game/Match';
import { bridgePoint } from '../game/Bridge';

/** A repeatable art-review fixture at S01; normal matches remain a separate option. */
export function createS01Match(anchorU = -145): Match {
  const match = new Match({ ai: false, waves: false, random: () => 0.99 });
  const p = bridgePoint(anchorU, 0);
  Object.assign(match.hero('blue'), p, { facing: 0.2 });
  Object.assign(match.hero('red'), { x: p.x + 64, y: p.y + 24, speed: 0, damage: 0, hp: 2000, maxHp: 2000, facing: Math.PI });
  for (const [dx, dy] of [[106, -32], [112, 38]]) Object.assign(match.spawnMinion('red', 'melee', { x: p.x + dx, y: p.y + dy }), { speed: 0, damage: 0 });
  return match;
}
