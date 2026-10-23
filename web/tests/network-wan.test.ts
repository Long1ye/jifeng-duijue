import { describe, expect, it } from 'vitest';
import { Match } from '../src/game/Match';
import { matchState } from '../src/network/protocol';
import { SnapshotBuffer } from '../src/network/SnapshotBuffer';

describe('ordered TCP weak-network presentation', () => {
  it.each([
    { rtt: 60, jitter: 5, lossEvery: 0 },
    { rtt: 100, jitter: 30, lossEvery: 0 },
    { rtt: 150, jitter: 30, lossEvery: 100 },
  ])('keeps a moving remote clock bounded and continuous at $rtt ms RTT', profile => {
    const buffer = new SnapshotBuffer(), model = new Match({ ai: false, waves: false }); model.start();
    let delivery = 0;
    const arrivals = Array.from({ length: 320 }, (_, i) => {
      const time = i * .05; model.time = time; model.hero('red').x = 100 + time * 80;
      const jitter = [0, .8, -.6, .3, -1, .5, -.2][i % 7] * profile.jitter;
      const stall = profile.lossEvery && i > 0 && i % profile.lossEvery === 0 ? 120 : 0;
      delivery = Math.max(delivery, i * 50 + profile.rtt / 2 + jitter + stall);
      return { at: delivery, state: structuredClone(matchState(model)) };
    });
    let cursor = 0, previousTime = 0, previousX = 0, stationary = 0, frames = 0, maxStep = 0;
    for (let now = 0; now < 15_500; now += 1000 / 60) {
      while (cursor < arrivals.length && arrivals[cursor].at <= now) {
        const packet = arrivals[cursor++]; buffer.push(packet.state, [], packet.at);
      }
      const frame = buffer.sample(now); if (!frame) continue;
      expect(frame.state.time).toBeGreaterThanOrEqual(previousTime);
      expect(frame.state.time).toBeLessThanOrEqual(arrivals[cursor - 1].state.time);
      const x = frame.state.entities.find(e => e.kind === 'hero' && e.team === 'red')!.x;
      if (now > 2500) {
        frames++; if (x - previousX < .001) stationary++;
        maxStep = Math.max(maxStep, x - previousX);
      }
      previousTime = frame.state.time; previousX = x;
    }
    expect(stationary / frames).toBeLessThan(.03); expect(maxStep).toBeLessThan(2);
    expect(buffer.interpolationMs).toBeLessThanOrEqual(200);
    // An extended outage freezes at the final authority, never extrapolates indefinitely.
    const last = buffer.sample(20_000)!;
    expect(buffer.sample(21_000)!.state.time).toBe(last.state.time);
  });
});
