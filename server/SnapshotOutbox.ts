import type { EventBatch, StateMessage } from '../src/network/protocol';

interface Socket {
  readyState: number;
  bufferedAmount: number;
  send(data: string): void;
  terminate(): void;
}
export const SNAPSHOT_SOFT_LIMIT = 32_768;
const HARD_LIMIT = 262_144;
const MAX_WAIT_MS = 2000;

/** One replaceable unsent snapshot per peer. Combat events remain ordered and bounded. */
export class SnapshotOutbox {
  private latest: string | null = null;
  private batches: EventBatch[] = [];
  private since = 0;
  private eventBytes = 0;
  private roomKey = '';
  constructor(private readonly socket: Socket, private readonly clock = () => performance.now()) {}
  get pending(): boolean { return this.latest !== null; }

  offer(message: StateMessage, encoded = JSON.stringify(message)): void {
    const roomKey = `${message.room.code}:${message.room.round}`;
    if (this.roomKey !== roomKey) { this.clear(); this.roomKey = roomKey; }
    if (this.socket.readyState !== 1) { this.clear(); return; }
    if (!this.latest && this.socket.bufferedAmount <= SNAPSHOT_SOFT_LIMIT) {
      this.socket.send(encoded); return;
    }
    if (!this.latest) this.since = this.clock();
    this.latest = encoded; // Immutable capture: Match entities continue changing after this call.
    for (const batch of message.eventBatches) {
      const captured = JSON.stringify(batch);
      this.batches.push(JSON.parse(captured) as EventBatch);
      this.eventBytes += new TextEncoder().encode(captured).byteLength;
    }
    this.flush();
  }

  reset(): void { this.clear(); this.roomKey = ''; }

  flush(): void {
    if (!this.latest) return;
    if (this.socket.readyState !== 1) { this.clear(); return; }
    if (this.socket.bufferedAmount > HARD_LIMIT || this.eventBytes > HARD_LIMIT
      || this.clock() - this.since > MAX_WAIT_MS) {
      this.clear(); this.socket.terminate(); return;
    }
    if (this.socket.bufferedAmount > SNAPSHOT_SOFT_LIMIT) return;
    const message = JSON.parse(this.latest) as StateMessage;
    message.eventBatches = this.batches;
    message.events = this.batches.flatMap(batch => batch.events);
    const encoded = JSON.stringify(message);
    this.clear(); this.socket.send(encoded);
  }

  private clear(): void { this.latest = null; this.batches = []; this.eventBytes = 0; this.since = 0; }
}
