import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket, WebSocketServer } from 'ws';
import { BattleRooms } from '../server/rooms';
import { Match } from '../src/game/Match';
import { WORLD } from '../src/game/config';
import { applyState, matchState, PROTOCOL_VERSION, validCommand, type ServerMessage } from '../src/network/protocol';
import type { AddressInfo } from 'node:net';

class Peer {
  readonly messages: ServerMessage[] = [];
  constructor(readonly socket: WebSocket, autoLoad = true) { socket.on('message', data => { const message = JSON.parse(data.toString()); this.messages.push(message); if (message.type === 'welcome' && autoLoad) this.send({ type: 'assets-ready' }); }); }
  send(message: object) { this.socket.send(JSON.stringify(message)); }
  async wait<T extends ServerMessage['type']>(type: T, predicate: (m: Extract<ServerMessage, { type: T }>) => boolean = () => true) {
    const start = Date.now();
    while (Date.now() - start < 3000) {
      const index = this.messages.findIndex(m => m.type === type && predicate(m as Extract<ServerMessage, { type: T }>));
      if (index >= 0) return this.messages.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(`Timed out waiting for ${type}`);
  }
}
let service: BattleRooms | undefined;
afterEach(() => { service?.dispose(); service = undefined; });

describe('authoritative room transport', () => {
  it('requires both clients to finish loading before countdown or reconnect resume', async () => {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 }); service = new BattleRooms(wss);
    await new Promise<void>(resolve => wss.once('listening', resolve));
    const connect = async () => {
      const socket = new WebSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`), peer = new Peer(socket, false);
      await new Promise<void>(resolve => socket.once('open', resolve)); return peer;
    };
    const a = await connect(), b = await connect();
    a.send({ type: 'create', version: PROTOCOL_VERSION }); const blue = await a.wait('welcome');
    a.send({ type: 'assets-ready' }); a.send({ type: 'ready' });
    b.send({ type: 'join', code: blue.code, version: PROTOCOL_VERSION }); const red = await b.wait('welcome');
    const room = service.rooms.get(blue.code)!;
    b.send({ type: 'ready' }); await b.wait('error', message => message.message.includes('资源'));
    expect(room.match.phase).toBe('ready'); expect(room.match.time).toBe(0); expect(room.countdownAt).toBe(0);
    expect(room.players[0].ready).toBe(true); expect(room.players[1].ready).toBe(false);
    b.send({ type: 'assets-ready' }); b.send({ type: 'ready' }); await b.wait('state', message => message.room.phase === 'countdown');
    room.countdownAt = Date.now() - 1; await a.wait('state', message => message.room.phase === 'playing');
    b.socket.close(); await a.wait('state', message => message.room.phase === 'reconnecting');
    const resumed = await connect(); resumed.send({ type: 'resume', code: red.code, token: red.token, version: PROTOCOL_VERSION }); await resumed.wait('welcome');
    await resumed.wait('state', message => message.room.phase === 'loading');
    const time = room.match.time; expect(room.match.phase).toBe('paused');
    resumed.send({ type: 'command', seq: 1, command: { kind: 'move', point: { x: 100, y: 100 } } });
    await a.wait('state', message => message.room.phase === 'loading'); expect(room.match.time).toBe(time);
    resumed.send({ type: 'assets-ready' }); await resumed.wait('state', message => message.state.time > time);
    expect(room.match.phase).toBe('playing');
  });
  it('assigns teams, waits for both players, runs shared combat, reconnects and rematches', async () => {
    const wss = new WebSocketServer({ host: '127.0.0.1', port: 0 }); service = new BattleRooms(wss);
    await new Promise<void>(resolve => wss.once('listening', resolve));
    const connect = async () => {
      const socket = new WebSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`), peer = new Peer(socket);
      await new Promise<void>(resolve => socket.once('open', resolve)); return peer;
    };
    const a = await connect(), b = await connect(), outsider = await connect();
    outsider.send({ type: 'create', version: -1 }); await outsider.wait('error', m => !!m.reset);
    outsider.send({ type: 'join', code: 'missing', version: PROTOCOL_VERSION }); await outsider.wait('error');
    a.send({ type: 'create', version: PROTOCOL_VERSION });
    const welcomeA = await a.wait('welcome'); expect(welcomeA.team).toBe('blue'); expect(welcomeA.code).toMatch(/^\d{6}$/);
    b.send({ type: 'join', code: welcomeA.code, version: PROTOCOL_VERSION });
    const welcomeB = await b.wait('welcome'); expect(welcomeB.team).toBe('red');
    outsider.send({ type: 'join', code: welcomeA.code, version: PROTOCOL_VERSION }); await outsider.wait('error');
    a.send({ type: 'ready' });
    await a.wait('state', m => m.room.players[0].ready);
    const room = service.rooms.get(welcomeA.code)!;
    expect(room.match.phase).toBe('ready'); expect(room.match.time).toBe(0);
    b.send({ type: 'ready' }); await b.wait('state', m => m.room.phase === 'countdown');
    room.countdownAt = Date.now() - 1;
    await b.wait('state', m => m.room.phase === 'playing');
    const redStart = { ...room.match.hero('red') };
    // Extra fields cannot give the blue socket authority over the red hero or HP.
    a.send({ type: 'command', seq: 1, team: 'red', command: { kind: 'move', point: { x: 300, y: 200 }, hp: 99999 } });
    await a.wait('state', m => !!m.state.entities.find(e => e.kind === 'hero' && e.team === 'blue')?.destination);
    expect(room.match.hero('red').destination).toBeNull(); expect(room.match.hero('red').x).toBe(redStart.x);
    expect(room.match.hero('blue').hp).toBe(room.match.hero('blue').maxHp);
    b.send({ type: 'command', seq: 1, command: { kind: 'upgrade', ability: 'q' } });
    await b.wait('state',m=>m.state.entities.some(e=>e.kind==='hero'&&e.team==='red'&&e.skillRanks?.q===1));
    expect(room.match.hero('blue').skillRanks?.q).toBe(0);
    b.send({ type: 'command', seq: 2, command: { kind: 'cast', ability: 'q', point: { x: 300, y: 200 } } });
    const cast = await a.wait('state', m => m.events.some(e => e.team === 'red' && e.type === 'cast'));
    expect(cast.state.entities.find(e => e.team === 'red' && e.kind === 'hero')!.abilities.q).toBeGreaterThan(0);
    a.send({ type: 'command', seq: 1, command: { kind: 'stop' } }); // Replay ignored.
    a.send({ type: 'command', seq: 2, command: { kind: 'move', point: { x: null, y: 0 } } });
    await a.wait('state', m => m.state.time > cast.state.time + .1);
    expect(room.match.hero('blue').destination).not.toBeNull();
    room.match.time = 2.1;
    const wave = await a.wait('state', m => m.state.wave >= 1);
    expect(wave.state.entities.filter(e => e.kind === 'melee' || e.kind === 'ranged')).toHaveLength(12);
    const aWave = wave.state.entities.map(e => [e.id, e.hp]);
    const bWave = await b.wait('state', m => m.state.time === wave.state.time);
    expect(bWave.state.entities.map(e => [e.id, e.hp])).toEqual(aWave);
    b.socket.close(); await a.wait('state', m => m.room.phase === 'reconnecting');
    const pausedTime = room.match.time;
    await a.wait('state', m => m.room.phase === 'reconnecting' && m.state.time === pausedTime);
    expect(room.match.phase).toBe('paused');
    outsider.send({ type: 'resume', code: welcomeB.code, token: 'invalid', version: PROTOCOL_VERSION });
    await outsider.wait('error', m => !!m.reset); expect(room.match.phase).toBe('paused');
    const resumed = await connect(); resumed.send({ type: 'resume', code: welcomeB.code, token: welcomeB.token, version: PROTOCOL_VERSION });
    expect((await resumed.wait('welcome')).team).toBe('red'); await a.wait('state', m => m.state.time > pausedTime);
    room.match.damage(room.match.hero('red'), room.match.hero('blue'), 9999);
    const ended = await a.wait('state', m => m.state.phase === 'ended');
    expect(ended.state.result).toMatchObject({ winner: 'red', reason: 'first-blood' });
    expect((await resumed.wait('state', m => m.state.phase === 'ended')).state.result).toEqual(ended.state.result);
    a.send({ type: 'ready' }); resumed.send({ type: 'ready' });
    const rematch = await a.wait('state', m => m.room.round === 2);
    expect(rematch.room.phase).toBe('countdown'); expect(rematch.state.time).toBe(0); expect(rematch.state.result).toBeNull();
    expect(rematch.state.entities.filter(e => e.kind === 'hero').every(e => e.hp === e.maxHp)).toBe(true);
    room.countdownAt = Date.now() - 1; await a.wait('state', m => m.room.round === 2 && m.room.phase === 'playing');
    room.match.damage(room.match.hero('blue'), room.match.tower('red'), 1e9);
    expect((await a.wait('state', m => m.state.phase === 'ended' && m.room.round === 2)).state.result).toMatchObject({ winner: 'blue', reason: 'first-tower' });
    a.send({ type: 'leave' }); await resumed.wait('error', m => !!m.reset); await a.wait('error', m => !!m.reset); expect(service.rooms.size).toBe(0);
    a.send({ type: 'create', version: PROTOCOL_VERSION });
    const next = await a.wait('welcome');
    resumed.send({ type: 'join', code: next.code, version: PROTOCOL_VERSION }); await resumed.wait('welcome');
    resumed.socket.close(); await a.wait('state', m => m.room.code === next.code && m.room.phase === 'reconnecting');
    service.rooms.get(next.code)!.players[1].disconnectedAt = Date.now() - 31_000;
    await a.wait('error', m => !!m.reset); expect(service.rooms.size).toBe(0);
  }, 15000);

  it('retains 100-CS victory and serializes a usable render replica', () => {
    const match = new Match({ ai: false, waves: false }); match.start(); match.cs.red = 99;
    const minion = match.spawnMinion('blue', 'melee', { x: 300, y: 200 });
    match.damage(match.hero('red'), minion, 9999, true); match.step(WORLD.step);
    expect(match.result).toMatchObject({ winner: 'red', reason: '100-cs' });
    match.eTargetLocks.set(1, 5); match.redETargetLocks.set(2, 9);
    const replica = new Match({ ai: false }); applyState(replica, JSON.parse(JSON.stringify(matchState(match))));
    expect(replica.hero('red').hp).toBe(match.hero('red').hp); expect(replica.result).toEqual(match.result);
    expect(replica.targetLocks('red').get(2)).toBe(9); expect(replica.targetLocks('blue').get(1)).toBe(5);
  });

  it('isolates E target locks for each caster', () => {
    const match = new Match({ ai: false, waves: false }); match.start();
    const red = match.hero('red'), blue = match.hero('blue');
    Object.assign(blue, { x: 250, y: 200 }); Object.assign(red, { x: 300, y: 200 });
    match.targetLocks('red').set(red.id, match.time + 10);
    expect(match.dashError(red, 'blue', red.id)).toBeNull();
    match.targetLocks('blue').set(red.id, match.time + 10);
    expect(match.dashError(red, 'blue', red.id)).toContain('暂时不能');
  });

  it('rejects malformed or unknown commands', () => {
    for (const command of [null, { kind: 'damage', amount: 1000 }, { kind: 'cast', ability: 'x', point: { x: 0, y: 0 } },
      { kind: 'move', point: { x: Infinity, y: 0 } }, { kind: 'attack', id: -1 }, { kind: 'emote', action: 'x' }]) expect(validCommand(command)).toBe(false);
  });
});
