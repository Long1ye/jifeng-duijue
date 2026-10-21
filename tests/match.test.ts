import { describe, expect, it } from 'vitest';
import { ABILITIES, BALANCE, BASES, WORLD } from '../src/game/config';
import { Match } from '../src/game/Match';

function match(): Match {
  const state = new Match({ ai: false, waves: false });
  state.start();
  return state;
}
function advance(state: Match, seconds: number): void {
  for (let i = 0; i < Math.ceil(seconds / WORLD.step); i++) state.step(WORLD.step);
}
function centerHero(state: Match): void {
  state.hero('blue').x = 220;
  state.hero('blue').y = 140;
}

describe('solo victory rules', () => {
  it('ends on first blood caused by the opposing hero', () => {
    const state = match();
    state.damage(state.hero('blue'), state.hero('red'), 1000);
    state.step(WORLD.step);
    expect(state.result).toMatchObject({ winner: 'blue', reason: 'first-blood' });
    expect(state.phase).toBe('ended');
  });

  it('counts tower execution as first blood for the other team', () => {
    const state = match();
    state.damage(state.tower('red'), state.hero('blue'), 1000);
    state.step(WORLD.step);
    expect(state.result).toMatchObject({ winner: 'red', reason: 'first-blood' });
  });

  it('ends when a tower is destroyed', () => {
    const state = match();
    state.damage(state.hero('blue'), state.tower('red'), 2000);
    state.step(WORLD.step);
    expect(state.result).toMatchObject({ winner: 'blue', reason: 'first-tower' });
  });

  it('counts only hero last hits and ends exactly at 100 CS', () => {
    const state = match();
    state.cs.blue = 99;
    const enemy = state.spawnMinion('red', 'melee', { x: 220, y: 140 });
    state.damage(state.hero('blue'), enemy, 10);
    expect(state.cs.blue).toBe(99);
    state.damage(state.hero('blue'), enemy, 500);
    state.damage(state.hero('blue'), enemy, 500);
    expect(state.cs.blue).toBe(100);
    state.step(WORLD.step);
    expect(state.result).toMatchObject({ winner: 'blue', reason: '100-cs' });
  });

  it('does not count minion or tower kills as CS', () => {
    const state = match();
    const ally = state.spawnMinion('blue', 'melee', { x: 180, y: 140 });
    for (const source of [ally, state.tower('blue')]) {
      const enemy = state.spawnMinion('red', 'melee', { x: 190, y: 140 });
      state.damage(source, enemy, 1000);
    }
    expect(state.cs.blue).toBe(0);
  });

  it('draws when both heroes die in the same logic tick', () => {
    const state = match();
    state.damage(state.hero('blue'), state.hero('red'), 1000);
    state.damage(state.hero('red'), state.hero('blue'), 1000);
    state.step(WORLD.step);
    expect(state.result).toMatchObject({ winner: null, reason: 'draw' });
  });

  it('prioritizes first blood if one side also reaches 100 CS in that tick', () => {
    const state = match();
    state.cs.blue = 99;
    state.damage(state.hero('blue'), state.spawnMinion('red', 'melee', { x: 200, y: 130 }), 1000);
    state.damage(state.hero('blue'), state.hero('red'), 1000);
    state.step(WORLD.step);
    expect(state.result?.reason).toBe('first-blood');
  });

  it('freezes time, damage, waves and commands after the result', () => {
    const state = match();
    state.damage(state.hero('blue'), state.hero('red'), 1000);
    state.step(WORLD.step);
    const time = state.time, hp = state.tower('red').hp, count = state.entities.length;
    state.damage(state.hero('blue'), state.tower('red'), 1000);
    state.orderMove('blue', { x: 10, y: 10 });
    expect(state.cast('blue', 'q', { x: 100, y: 100 })).toBe(false);
    advance(state, 20);
    expect(state.time).toBe(time);
    expect(state.tower('red').hp).toBe(hp);
    expect(state.entities).toHaveLength(count);
    expect(state.hero('blue').destination).toBeNull();
  });
});

describe('combat and abilities', () => {
  it('allows movement to cancel an unfinished attack windup', () => {
    const state = match(); centerHero(state);
    const enemy = state.spawnMinion('red', 'melee', { x: 250, y: 140 });
    state.orderAttack('blue', enemy.id);
    state.step(WORLD.step);
    expect(state.hero('blue').windup).toBeGreaterThan(0);
    state.orderMove('blue', { x: 180, y: 180 });
    advance(state, 0.25);
    expect(enemy.hp).toBe(enemy.maxHp);
    expect(state.projectiles.filter(p => p.sourceId === state.hero('blue').id)).toHaveLength(0);
  });

  it('releases a homing basic attack after windup', () => {
    const state = match(); centerHero(state);
    const enemy = state.spawnMinion('red', 'melee', { x: 253, y: 140 });
    state.orderAttack('blue', enemy.id);
    advance(state, 0.5);
    expect(enemy.hp).toBeLessThan(enemy.maxHp);
    expect(state.hero('blue').cooldown).toBeGreaterThan(0);
  });

  it('Q pierces both enemies and counts its last hit once', () => {
    const state = match(); centerHero(state);
    const first = state.spawnMinion('red', 'melee', { x: 251, y: 140 });
    const second = state.spawnMinion('red', 'melee', { x: 290, y: 140 });
    first.hp = 20; first.speed = 0; second.speed = 0;
    expect(state.cast('blue', 'q', { x: 370, y: 140 })).toBe(true);
    advance(state, 0.8);
    expect(first.hp).toBe(0);
    expect(second.hp).toBe(second.maxHp - ABILITIES.q.damage);
    expect(state.cs.blue).toBe(1);
    expect(state.projectiles.filter(p => p.kind === 'q')).toHaveLength(0);
  });

  it('Q applies its entire thrust at contact without a travelling projectile', () => {
    const state = match(); centerHero(state);
    const enemy = state.spawnMinion('red', 'melee', { x: 270, y: 140 });
    enemy.speed = 0;
    state.cast('blue', 'q', { x: 370, y: 140 });
    expect(state.projectiles).toHaveLength(0);
    state.step(0.5);
    expect(enemy.hp).toBe(enemy.maxHp - ABILITIES.q.damage);
  });

  it('E crosses the selected target and counts only its last hit', () => {
    const state = match(); centerHero(state);
    const enemies = [250, 264].map(x => state.spawnMinion('red', 'melee', { x, y: 140 }));
    enemies.forEach(e => { e.hp = 40; e.speed = 0; });
    state.cast('blue', 'e', { x: 250, y: 140 });
    advance(state, 0.02);
    expect(state.cs.blue).toBe(0);
    advance(state, 0.3);
    expect(state.cs.blue).toBe(1);
    expect(state.zones).toHaveLength(0);
    advance(state, 0.5);
    expect(state.cs.blue).toBe(1);
  });

  it('enforces cooldown and target eligibility without spending a resource', () => {
    const state = match(); centerHero(state);
    const hero = state.hero('blue');
    state.cast('blue', 'q', { x: 300, y: 140 });
    const mana = hero.mana;
    expect(state.cast('blue', 'q', { x: 300, y: 140 })).toBe(false);
    expect(hero.mana).toBe(mana);
    hero.mana = 0;
    expect(state.cast('blue', 'e', { x: 300, y: 140 })).toBe(false);
    expect(state.zones).toHaveLength(0);
  });

  it('W places a wall without teleporting or granting direct damage reduction', () => {
    const state = match();
    const hero = state.hero('blue'); hero.x = 10; hero.y = 10;
    state.cast('blue', 'w', { x: -100, y: -100 });
    expect(hero.x).toBeGreaterThanOrEqual(8);
    const hp = hero.hp;
    state.damage(state.hero('red'), hero, 100);
    expect(hero.hp).toBeCloseTo(hp - 100);
    expect(hero.x).toBe(10); expect(hero.y).toBe(10);
    expect(state.windWalls).toHaveLength(1);
    advance(state, 0.7);
    const nextHp = hero.hp;
    state.damage(state.hero('red'), hero, 100);
    expect(hero.hp).toBeCloseTo(nextHp - 100);
  });
});

describe('towers and lifecycle', () => {
  it('towers prioritize a minion over an unprovoking hero', () => {
    const state = match(), tower = state.tower('red'), hero = state.hero('blue');
    hero.x = tower.x - 35; hero.y = tower.y;
    const minion = state.spawnMinion('blue', 'melee', { x: tower.x - 45, y: tower.y });
    state.step(WORLD.step);
    expect(tower.targetId).toBe(minion.id);
  });

  it('towers switch aggro when an enemy hero attacks their allied hero', () => {
    const state = match(), tower = state.tower('red'), hero = state.hero('blue');
    hero.x = tower.x - 45; hero.y = tower.y;
    state.hero('red').x = tower.x - 20; state.hero('red').y = tower.y;
    const minion = state.spawnMinion('blue', 'melee', { x: tower.x - 15, y: tower.y + 5 });
    state.step(WORLD.step);
    expect(tower.targetId).toBe(minion.id);
    state.damage(hero, state.hero('red'), 1);
    state.step(WORLD.step);
    expect(tower.targetId).toBe(hero.id);
    hero.x = 200;
    state.step(WORLD.step);
    expect(tower.targetId).toBe(minion.id);
  });

  it('pausing freezes waves, time, cooldowns and movement', () => {
    const state = new Match(); state.start();
    state.orderMove('blue', { x: 240, y: 135 });
    state.cast('blue', 'q', { x: 300, y: 135 });
    state.togglePause();
    const x = state.hero('blue').x, cooldown = state.hero('blue').abilities.q;
    advance(state, 30);
    expect(state.time).toBe(0);
    expect(state.wave).toBe(0);
    expect(state.hero('blue').x).toBe(x);
    expect(state.hero('blue').abilities.q).toBe(cooldown);
    state.togglePause();
    advance(state, 0.1);
    expect(state.time).toBeGreaterThan(0);
  });

  it('spawns both teams in the expected formation and interval', () => {
    const state = new Match({ ai: false }); state.start();
    advance(state, BALANCE.firstWaveAt + 0.02);
    expect(state.wave).toBe(1);
    expect(state.entities.filter(e => e.kind === 'melee')).toHaveLength(6);
    expect(state.entities.filter(e => e.kind === 'ranged')).toHaveLength(6);
    advance(state, BALANCE.waveInterval);
    expect(state.wave).toBe(2);
  });

  it('a new match has no previous CS, result, projectiles, zones or timer state', () => {
    const old = match(); old.cs.blue = 99;
    old.cast('blue', 'q', { x: 300, y: 135 });
    old.cast('blue', 'e', { x: 250, y: 135 });
    advance(old, 0.2);
    const fresh = new Match();
    expect(fresh.phase).toBe('ready');
    expect(fresh.time).toBe(0);
    expect(fresh.wave).toBe(0);
    expect(fresh.cs).toEqual({ blue: 0, red: 0 });
    expect(fresh.entities).toHaveLength(4);
    expect(fresh.projectiles).toHaveLength(0);
    expect(fresh.zones).toHaveLength(0);
    expect(fresh.result).toBeNull();
    expect(fresh.hero('blue').abilities).toEqual({ q: 0, w: 0, e: 0, r: 0 });
  });

  it('survives a deterministic multi-wave simulation without unbounded entities', () => {
    const state = new Match(); state.start();
    advance(state, 180);
    expect(Number.isFinite(state.time)).toBe(true);
    expect(state.entities.length).toBeLessThan(100);
    expect(state.entities.every(e => Number.isFinite(e.x) && Number.isFinite(e.y) && e.hp >= 0)).toBe(true);
    expect(state.cs.red).toBeGreaterThan(0);
    expect(state.wave).toBeGreaterThan(1);
  });

  it('AI retreats towards its fountain when low on health', () => {
    const state = new Match({ waves: false }); state.start();
    const hero = state.hero('red'); hero.x = 300; hero.y = 100; hero.hp = 100;
    advance(state, 1.1);
    expect(hero.destination).toEqual(BASES.red);
    expect(hero.targetId).toBeNull();
    expect(hero.x).toBeGreaterThan(300);
  });

  it('AI uses its Q when the opposing hero enters pressure range', () => {
    const state = new Match({ waves: false }); state.start();
    state.hero('blue').x = 220; state.hero('blue').y = 140;
    state.hero('red').x = 285; state.hero('red').y = 140;
    advance(state, 1.5);
    expect(state.hero('red').abilities.q).toBeGreaterThan(state.time);
    expect(state.hero('blue').hp).toBeLessThan(state.hero('blue').maxHp);
  });
});
