import { describe, expect, it } from 'vitest';
import { SnapshotOutbox, SNAPSHOT_SOFT_LIMIT } from '../server/SnapshotOutbox';
import { Match } from '../src/game/Match';
import { matchState, type StateMessage } from '../src/network/protocol';
import { SnapshotBuffer } from '../src/network/SnapshotBuffer';

function message(n: number): StateMessage {
  const match = new Match({ ai: false, waves: false }); match.start(); match.time = n * .05;
  const events = [{ type: 'cast' as const, team: 'blue' as const, ability: 'q' as const, x: n, y: 0 }];
  return { type: 'state', state: matchState(match), ack: { blue: n, red: 0 }, events,
    eventBatches: [{ id: n, time: match.time, events }],
    room: { code: '123456', round: 1, phase: 'playing', players: [], countdown: 0, reconnectSeconds: 0 } };
}
function socket() {
  const sent: StateMessage[] = [];
  return { readyState: 1, bufferedAmount: SNAPSHOT_SOFT_LIMIT + 1, terminated: false, sent,
    send(data: string) { sent.push(JSON.parse(data)); }, terminate() { this.terminated = true; this.readyState = 3; } };
}

describe('bounded authoritative snapshot outbox', () => {
  it('coalesces unsent state while preserving ordered events and the latest command ack', () => {
    const peer = socket(), outbox = new SnapshotOutbox(peer);
    const first = message(1); outbox.offer(first);
    first.state.entities[0].hp = -999; // A mutable simulation cannot change the captured wire state.
    outbox.offer(message(2)); outbox.offer(message(3));
    expect(peer.sent).toHaveLength(0); expect(outbox.pending).toBe(true);
    peer.bufferedAmount = 0; outbox.flush();
    expect(peer.sent).toHaveLength(1);
    expect(peer.sent[0].state.time).toBeCloseTo(.15); expect(peer.sent[0].ack.blue).toBe(3);
    expect(peer.sent[0].events.map(event => event.x)).toEqual([1, 2, 3]);
    const buffer = new SnapshotBuffer(); const wire = peer.sent[0];
    buffer.push(wire.state, wire.events, 200, wire.eventBatches);
    expect(buffer.sample(201)!.events.map(event => event.x)).toEqual([1, 2, 3]);
    buffer.push(wire.state, wire.events, 202, wire.eventBatches);
    expect(buffer.sample(203)!.events).toEqual([]);
  });

  it('captures unsent states immutably and leaves a fast peer unaffected', () => {
    const slow = socket(), fast = socket(); fast.bufferedAmount = 0;
    const a = new SnapshotOutbox(slow), b = new SnapshotOutbox(fast);
    const original = message(1); a.offer(original); b.offer(original);
    const hp = original.state.entities[0].hp; original.state.entities[0].hp = -999;
    expect(fast.sent).toHaveLength(1);
    slow.bufferedAmount = 0; a.flush(); expect(slow.sent[0].state.entities[0].hp).toBe(hp);
  });

  it('terminates a persistently blocked link rather than accumulating history indefinitely', () => {
    const peer = socket(); let now = 0;
    const outbox = new SnapshotOutbox(peer, () => now); outbox.offer(message(1));
    now = 2001; outbox.flush(); expect(peer.terminated).toBe(true); expect(outbox.pending).toBe(false);
  });

  it('bounds event memory and clears old-round events before a rematch', () => {
    const peer = socket(), outbox = new SnapshotOutbox(peer);
    outbox.offer(message(1)); const next = message(2); next.room.round = 2;
    outbox.offer(next); peer.bufferedAmount = 0; outbox.flush();
    expect(peer.sent[0].events.map(event => event.x)).toEqual([2]);
    peer.bufferedAmount = SNAPSHOT_SOFT_LIMIT + 1;
    const huge = message(3);
    huge.eventBatches[0].events = Array.from({ length: 6000 }, () => huge.events[0]);
    outbox.offer(huge); expect(peer.terminated).toBe(true);
  });
});
