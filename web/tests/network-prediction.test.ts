import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { MovementPrediction } from '../src/network/MovementPrediction';
import { matchState } from '../src/network/protocol';
import { BASES, TOWERS, WORLD } from '../src/game/config';

function fixture(time = 0, x = 250) {
  const match = new Match({ ai: false, waves: false }); match.start(); match.time = time;
  const hero = match.hero('blue');
  Object.assign(hero, { x, y: 200, speed: 80, homeguardUntil: 0, homeguardCombatAt: time,
    destination: null, targetId: null, hitAt: time });
  return { match, hero, state: structuredClone(matchState(match)) };
}

describe('local navigation prediction and authority reconciliation', () => {
  it('moves before a server reply without mutating snapshots or predicting combat', () => {
    const { state } = fixture(); const original = structuredClone(state);
    const predictor = new MovementPrediction(); predictor.receive(state, 'blue', 0, 0, 100);
    predictor.command(1, { kind: 'move', point: { x: 600, y: 200 } }, 10);
    const predicted = predictor.sample(30)!;
    expect(predicted.x).toBeCloseTo(251.6, 5); expect(predicted.hp).toBe(original.entities.find(e => e.kind === 'hero' && e.team === 'blue')!.hp);
    expect(state).toEqual(original); expect(predictor.pendingCount).toBe(1);
  });

  it('discards acknowledged inputs and replays only later direction changes', () => {
    const predictor = new MovementPrediction(); predictor.receive(fixture().state, 'blue', 0, 0, 100);
    predictor.command(1, { kind: 'move', point: { x: 600, y: 200 } }, 10);
    predictor.command(2, { kind: 'move', point: { x: 100, y: 200 } }, 90);
    const { state } = fixture(.05, 254); state.entities.find(e => e.kind === 'hero' && e.team === 'blue')!.destination = { x: 600, y: 200 };
    predictor.receive(state, 'blue', 1, 100, 100);
    expect(predictor.pendingCount).toBe(1);
    // Snapshot represents local t=50; move right until t=90, then left until t=110.
    expect(predictor.sample(110)!.x).toBeCloseTo(255.6, 5);
    const stopped = fixture(.15, 256).state;
    predictor.receive(stopped, 'blue', 2, 200, 100);
    expect(predictor.pendingCount).toBe(0);
    expect(predictor.sample(500)!.x).toBeCloseTo(256, 2);
  });

  it('predicts stop and replaces a rejected move with authoritative navigation', () => {
    const predictor = new MovementPrediction(); predictor.receive(fixture().state, 'blue', 0, 0, 0);
    predictor.command(1, { kind: 'move', point: { x: 600, y: 200 } }, 0);
    predictor.command(2, { kind: 'stop' }, 40);
    expect(predictor.sample(80)!.x).toBeCloseTo(253.2, 5);
    predictor.receive(fixture(.1).state, 'blue', 2, 100, 0);
    expect(predictor.sample(400)!.x).toBeCloseTo(250, 4);
  });

  it('bounds prediction during outages and resets on pause, death and teleports', () => {
    const predictor = new MovementPrediction(); predictor.receive(fixture().state, 'blue', 0, 0, 0);
    predictor.command(1, { kind: 'move', point: { x: 600, y: 200 } }, 0);
    expect(predictor.sample(1000)!.x).toBeCloseTo(270, 5);
    expect(predictor.sample(2000)!.x).toBeCloseTo(270, 5);
    predictor.receive(fixture(.1, 500).state, 'blue', 1, 2000, 0);
    expect(predictor.sample(2001)!.x).toBe(500);
    const paused = fixture().state; paused.phase = 'paused'; predictor.receive(paused, 'blue', 1, 2100, 0);
    expect(predictor.sample(2101)).toBeNull(); expect(predictor.pendingCount).toBe(0);
    const dead = fixture().state; dead.entities.find(e => e.kind === 'hero' && e.team === 'blue')!.hp = 0; predictor.receive(dead, 'blue', 1, 2200, 0);
    expect(predictor.sample(2201)).toBeNull();
  });

  it('never speculates through control, skills or an unconfirmed attack', () => {
    for (const control of [{ airborneUntil: 1 }, { flinchUntil: 1 }, { qCast: { startedAt: 0, facing: 0 } }]) {
      const { state } = fixture(); Object.assign(state.entities.find(e => e.kind === 'hero' && e.team === 'blue')!, control);
      const predictor = new MovementPrediction(); predictor.receive(state, 'blue', 0, 0, 0);
      predictor.command(1, { kind: 'move', point: { x: 600, y: 200 } }, 0);
      expect(predictor.sample(100)).toBeNull();
    }
    const predictor = new MovementPrediction(); predictor.receive(fixture().state, 'blue', 0, 0, 0);
    predictor.command(1, { kind: 'attack', id: 2 }, 0);
    predictor.command(2, { kind: 'move', point: { x: 600, y: 200 } }, 10);
    expect(predictor.sample(100)).toBeNull();
  });

  it('uses the same slow walking rules as the simulation', () => {
    const { match, state } = fixture(); match.hero('blue').slowUntil = state.entities.find(e => e.kind === 'hero' && e.team === 'blue')!.slowUntil = 1;
    const predictor = new MovementPrediction(); predictor.receive(state, 'blue', 0, 0, 0);
    const move = { kind: 'move' as const, point: { x: 600, y: 200 } };
    predictor.command(1, move, 0); match.orderMove('blue', move.point);
    for (let i = 0; i < 6; i++) match.step(1 / 60);
    expect(predictor.sample(100)!.x).toBeCloseTo(match.hero('blue').x, 5);
  });

  it('matches fountain acceleration and keeps navigation within map bounds', () => {
    const { match } = fixture(10);
    Object.assign(match.hero('blue'), BASES.blue, { hitAt: -100, homeguardCombatAt: -100 });
    const predictor = new MovementPrediction();
    predictor.receive(structuredClone(matchState(match)), 'blue', 0, 0, 0);
    predictor.command(1, { kind: 'move', point: TOWERS.blue }, 0); match.orderMove('blue', TOWERS.blue);
    for (let i = 0; i < 6; i++) match.step(1 / 60);
    expect(predictor.sample(100)!.x).toBeCloseTo(match.hero('blue').x, 5);
    expect(predictor.sample(100)!.y).toBeCloseTo(match.hero('blue').y, 5);
    const edge = fixture(1, WORLD.width - 12).state;
    predictor.reset(); predictor.receive(edge, 'blue', 0, 0, 0);
    predictor.command(1, { kind: 'move', point: { x: 1e6, y: 200 } }, 0);
    expect(predictor.sample(250)!.x).toBeLessThanOrEqual(WORLD.width - 11);
  });

  it('suspends an overflowing input history until its last omitted command is confirmed', () => {
    const predictor = new MovementPrediction(); predictor.receive(fixture().state, 'blue', 0, 0, 0);
    for (let seq = 1; seq <= 130; seq++) predictor.command(seq, { kind: 'stop' }, seq);
    expect(predictor.pendingCount).toBe(0); expect(predictor.sample(150)).toBeNull();
    predictor.receive(fixture(.1).state, 'blue', 100, 150, 0);
    expect(predictor.sample(160)).toBeNull();
    predictor.receive(fixture(.2).state, 'blue', 130, 200, 0);
    expect(predictor.sample(210)).not.toBeNull();
  });
});

