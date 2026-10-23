import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { matchState, type MatchState } from '../src/network/protocol';
import { SnapshotBuffer } from '../src/network/SnapshotBuffer';
import type { GameEvent } from '../src/game/types';

function state(time: number, x = 100 + time * 80): MatchState {
  const match = new Match({ ai: false, waves: false }); match.start(); match.time = time;
  Object.assign(match.hero('blue'), { x, y: 200, destination: { x: 1000, y: 200 } });
  return matchState(match);
}

describe('buffered network presentation', () => {
  it('keeps moving continuously through variable 50–80 ms delivery intervals', () => {
    const buffer = new SnapshotBuffer();
    const arrivals = Array.from({ length: 120 }, (_, i) => ({ at: i * 50 + [0, 12, 30, 0, 18][i % 5], state: state(i * .05) }));
    let cursor = 0, previous = 0, previousTime = 0, stationary = 0, measured = 0, largestStep = 0;
    for (let now = 0; now < 5900; now += 1000 / 120) {
      while (cursor < arrivals.length && arrivals[cursor].at <= now) {
        buffer.push(arrivals[cursor].state, [], now); cursor++;
      }
      const frame = buffer.sample(now); if (!frame) continue;
      const hero = frame.state.entities.find(e => e.team === 'blue' && e.kind === 'hero')!;
      expect(frame.state.time).toBeGreaterThanOrEqual(previousTime);
      expect(hero.x).toBeCloseTo(100 + frame.state.time * 80, 6);
      if (now > 500) {
        const distance = hero.x - previous;
        if (distance < .001) stationary++;
        measured++; largestStep = Math.max(largestStep, distance);
      }
      previous = hero.x; previousTime = frame.state.time;
    }
    expect(measured).toBeGreaterThan(500); expect(stationary).toBe(0);
    expect(largestStep).toBeLessThan(.8);
  });

  it('does not interpolate through teleports or invent future positions during outages', () => {
    const buffer = new SnapshotBuffer(); buffer.push(state(0, 100), [], 0); buffer.push(state(.05, 300), [], 50);
    expect(buffer.sample(100)!.state.entities.find(e => e.team === 'blue' && e.kind === 'hero')!.x).toBe(100);
    expect(buffer.sample(500)!.state.entities.find(e => e.team === 'blue' && e.kind === 'hero')!.x).toBe(300);
    expect(buffer.sample(1000)!.state.time).toBe(.05);
  });

  it('delivers events exactly once on the same delayed clock, including the final result', () => {
    const buffer = new SnapshotBuffer(); const event: GameEvent = { type: 'cast', team: 'blue', ability: 'q', x: 100, y: 200 };
    buffer.push(state(0), [], 0); buffer.sample(0);
    buffer.push(state(.05), [event], 50);
    expect(buffer.sample(60)!.events).toEqual([]);
    expect(buffer.sample(140)!.events).toEqual([event]);
    expect(buffer.sample(145)!.events).toEqual([]);
    const end = state(.1); end.phase = 'ended'; end.result = { winner: 'red', reason: 'first-blood', time: .1 };
    buffer.push(end, [{ type: 'end', team: 'red', x: 0, y: 0 }], 150);
    expect(buffer.sample(151)!.state.result?.winner).toBe('red');
    expect(buffer.sample(152)!.events).toEqual([]);
    buffer.reset(); expect(buffer.sample(153)).toBeNull();
  });

  it('freezes on pause and resets the wall clock when play resumes', () => {
    const buffer = new SnapshotBuffer(); buffer.push(state(1), [], 0); buffer.sample(0);
    const paused = state(1); paused.phase = 'paused'; buffer.push(paused, [], 50);
    expect(buffer.sample(10_000)!.state.time).toBe(1);
    buffer.push(state(1.01), [], 10_100); buffer.push(state(1.06), [], 10_150);
    const frame = buffer.sample(10_200)!;
    expect(frame.state.time).toBeGreaterThanOrEqual(1.01); expect(frame.state.time).toBeLessThanOrEqual(1.06);
  });
  it('does not replay old combat sounds after a long background stall', () => {
    const buffer = new SnapshotBuffer(); buffer.push(state(0), [], 0); buffer.sample(0);
    for (let i = 1; i <= 200; i++) buffer.push(state(i * .05), [{ type: 'cast', team: 'blue', ability: 'q', x: i, y: 0 }], i * 50);
    const frame = buffer.sample(10_000)!;
    expect(frame.events.length).toBeLessThanOrEqual(3);
    expect(frame.events.every(event => event.x >= 196)).toBe(true);
    expect(buffer.sample(10_001)!.events).toEqual([]);
  });

  it('increases jitter protection within a bound, then slowly recovers on a stable link', () => {
    const buffer = new SnapshotBuffer(); let lastTime = 0;
    // Ordered TCP delivery: a stalled packet also blocks messages behind it.
    let delivery = 0;
    for (let i = 0; i < 140; i++) {
      delivery = Math.max(delivery, i * 50 + (i % 9 === 0 ? 110 : 0));
      buffer.push(state(i * .05), [], delivery);
      const time = buffer.sample(delivery)!.state.time;
      expect(time).toBeGreaterThanOrEqual(lastTime); lastTime = time;
    }
    const expanded = buffer.interpolationMs;
    expect(expanded).toBeGreaterThan(130); expect(expanded).toBeLessThanOrEqual(200);
    for (let i = 140; i < 440; i++) buffer.push(state(i * .05), [], i * 50);
    expect(buffer.interpolationMs).toBeLessThan(expanded - 30);
    expect(buffer.interpolationMs).toBeGreaterThanOrEqual(60);
  });
});

