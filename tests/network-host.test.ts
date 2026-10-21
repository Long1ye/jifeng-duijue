import { afterEach, describe, expect, it, vi } from 'vitest';
import { NetworkHost } from '../src/network/NetworkHost';
import { Match } from '../src/game/Match';
import { matchState, type ServerMessage } from '../src/network/protocol';

class Socket extends EventTarget {
  static OPEN = 1;
  static instances: Socket[] = [];
  readyState = 0;
  bufferedAmount = 0;
  sent: { type: string; seq?: number }[] = [];
  constructor(_url: string) { super(); Socket.instances.push(this); }
  open() { this.readyState = 1; this.dispatchEvent(new Event('open')); }
  message(value: ServerMessage) { this.dispatchEvent(new MessageEvent('message', { data: JSON.stringify(value) })); }
  send(data: string) { this.sent.push(JSON.parse(data)); }
  close() { this.readyState = 3; this.dispatchEvent(new Event('close')); }
}
let host: NetworkHost | undefined;
afterEach(() => { host?.dispose(); host = undefined; vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('network host prediction integration', () => {
  it('presents local navigation immediately, keeps combat authoritative and clears it on reconnect', () => {
    vi.useFakeTimers(); let now = 0; vi.spyOn(performance, 'now').mockImplementation(() => now);
    Socket.instances = []; vi.stubGlobal('WebSocket', Socket);
    vi.stubGlobal('location', { protocol: 'http:', host: 'game.example' });
    vi.stubGlobal('sessionStorage', { getItem: () => null, setItem() {}, removeItem() {} });
    host = new NetworkHost({ frame() {}, dispose() {} }); const socket = Socket.instances[0]; socket.open();
    host.setAssetsReady();
    socket.message({ type: 'welcome', code: '123456', token: 'test-token', team: 'blue' });
    const match = new Match({ ai: false, waves: false }); match.start();
    Object.assign(match.hero('blue'), { x: 250, y: 200, hitAt: 0, homeguardUntil: 0 });
    const state = structuredClone(matchState(match));
    socket.message({ type: 'state', state, ack: { blue: 0, red: 0 }, events: [], eventBatches: [],
      room: { code: '123456', round: 1, phase: 'playing', players: [], countdown: 0, reconnectSeconds: 0 } });
    expect(host.command({ kind: 'move', point: { x: 600, y: 200 } })).toBe(true);
    now = 16; host.update(.016);
    expect(host.match.hero('blue').x).toBeGreaterThan(250);
    expect(host.match.hero('blue').hp).toBe(match.hero('blue').hp);
    expect(host.match.hero('red').x).toBe(match.hero('red').x);
    expect(state.entities.find(e => e.kind === 'hero' && e.team === 'blue')!.x).toBe(250);
    socket.bufferedAmount = 20_000;
    expect(host.command({ kind: 'stop' })).toBe(false);
    socket.bufferedAmount = 0;
    expect(host.command({ kind: 'stop' })).toBe(true);
    expect(socket.sent.filter(message => message.type === 'command').map(message => message.seq)).toEqual([1, 2]);
    socket.close(); expect(host.command({ kind: 'move', point: { x: 300, y: 200 } })).toBe(false);
    vi.advanceTimersByTime(1000);
    const resumed = Socket.instances[1]; resumed.open();
    expect(resumed.sent.some(message => message.type === 'resume')).toBe(true);
    resumed.message({ type: 'welcome', code: '123456', token: 'test-token', team: 'blue' });
    now = 1200; resumed.message({ type: 'state', state, ack: { blue: 0, red: 0 }, events: [], eventBatches: [],
      room: { code: '123456', round: 1, phase: 'playing', players: [], countdown: 0, reconnectSeconds: 0 } });
    host.update(.016); expect(host.match.hero('blue').x).toBe(250);
  });
});
