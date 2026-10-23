import { randomBytes, randomInt } from 'node:crypto';
import { WebSocket, WebSocketServer } from 'ws';
import { Match } from '../src/game/Match';
import { WORLD } from '../src/game/config';
import type { Team } from '../src/game/types';
import { executeCommand, matchState, PROTOCOL_VERSION, RECONNECT_MS, SNAPSHOT_MS, validCommand, type ClientMessage, type RoomInfo, type ServerMessage } from '../src/network/protocol';
import { SnapshotOutbox } from './SnapshotOutbox';

interface Player { team: Team; token: string; socket: WebSocket | null; ready: boolean; loaded: boolean; disconnectedAt: number; seq: number }
interface Room { code: string; match: Match; players: Player[]; countdownAt: number; round: number; accumulator: number; emptyAt: number; eventSeq: number }
interface Connection { room?: Room; player?: Player; count: number; windowAt: number; alive: boolean; outbox: SnapshotOutbox }

/** One authority per room; sockets can issue orders only for their assigned player. */
export class BattleRooms {
  readonly rooms = new Map<string, Room>();
  private readonly connections = new Map<WebSocket, Connection>();
  private readonly timer: ReturnType<typeof setInterval>;
  private previous = performance.now();
  private lastBroadcast = 0;
  private lastHeartbeat = 0;
  constructor(private readonly wss: WebSocketServer) {
    wss.on('connection', socket => {
      const connection: Connection = { count: 0, windowAt: Date.now(), alive: true, outbox: new SnapshotOutbox(socket) };
      this.connections.set(socket, connection);
      socket.on('pong', () => { connection.alive = true; });
      socket.on('message', (data, binary) => {
        if (binary) return;
        const now = Date.now();
        if (now - connection.windowAt >= 1000) { connection.count = 0; connection.windowAt = now; }
        if (++connection.count > 120) { socket.close(1008, 'Too many messages'); return; }
        try { this.message(socket, connection, JSON.parse(data.toString())); }
        catch { this.send(socket, { type: 'error', message: '无效的对战消息。' }); }
      });
      socket.on('close', () => this.disconnect(socket, connection));
      socket.on('error', () => socket.terminate());
    });
    this.timer = setInterval(() => this.tick(), 1000 / 60);
  }
  private send(socket: WebSocket | null, message: ServerMessage | string): void {
    if (socket?.readyState === WebSocket.OPEN) {
      if (socket.bufferedAmount > 2_000_000) { socket.terminate(); return; }
      socket.send(typeof message === 'string' ? message : JSON.stringify(message));
    }
  }
  private info(room: Room): RoomInfo {
    const missing = room.players.find(p => !p.socket);
    return { code: room.code, round: room.round,
      phase: missing ? 'reconnecting' : room.players.length === 2 && room.players.some(p => !p.loaded) ? 'loading' : room.countdownAt ? 'countdown' : room.match.phase === 'playing' ? 'playing' : room.match.phase === 'ended' ? 'ended' : 'waiting',
      players: room.players.map(p => ({ team: p.team, connected: !!p.socket, ready: p.ready, loaded: p.loaded })),
      countdown: Math.max(0, Math.ceil((room.countdownAt - Date.now()) / 1000)),
      reconnectSeconds: missing ? Math.max(0, Math.ceil((missing.disconnectedAt + RECONNECT_MS - Date.now()) / 1000)) : 0 };
  }
  private broadcast(room: Room): void {
    const ack = { blue: 0, red: 0 };
    for (const player of room.players) ack[player.team] = player.seq;
    const events = room.match.drainEvents();
    const message: Extract<ServerMessage, { type: 'state' }> = { type: 'state', room: this.info(room), state: matchState(room.match), events, ack,
      eventBatches: events.length ? [{ id: ++room.eventSeq, time: room.match.time, events }] : [] };
    const encoded = JSON.stringify(message);
    for (const player of room.players) if (player.socket) this.connections.get(player.socket)?.outbox.offer(message, encoded);
  }
  private attach(socket: WebSocket, connection: Connection, room: Room, player: Player): void {
    connection.outbox.reset();
    player.socket = socket; player.disconnectedAt = 0; player.seq = 0; player.loaded = false;
    connection.room = room; connection.player = player;
    this.send(socket, { type: 'welcome', code: room.code, token: player.token, team: player.team });
    this.broadcast(room);
  }
  private message(socket: WebSocket, connection: Connection, raw: unknown): void {
    if (!raw || typeof raw !== 'object') return;
    const message = raw as ClientMessage;
    if (message.type === 'ping' && Number.isFinite(message.at)) { this.send(socket, { type: 'pong', at: message.at }); return; }
    if (message.type === 'leave') { this.leave(connection); return; }
    if (message.type === 'create' || message.type === 'join' || message.type === 'resume') {
      if (message.version !== PROTOCOL_VERSION) { this.send(socket, { type: 'error', message: '游戏版本不一致，请刷新页面。', reset: true }); return; }
      if (connection.room) return;
      if (message.type === 'create') {
        if (this.rooms.size >= 100) { this.send(socket, { type: 'error', message: '房间已满，请稍后重试。' }); return; }
        let code: string;
        do { code = String(randomInt(100000, 1000000)); } while (this.rooms.has(code));
        const player = this.player('blue');
        const room: Room = { code, match: new Match({ ai: false, league:true }), players: [player], countdownAt: 0, round: 0, accumulator: 0, emptyAt: Date.now(), eventSeq: 0 };
        this.rooms.set(code, room); this.attach(socket, connection, room, player); return;
      }
      const code = typeof message.code === 'string' ? message.code.trim() : '';
      const room = this.rooms.get(code);
      if (!room) { this.send(socket, { type: 'error', message: '房间不存在或已关闭。', reset: message.type === 'resume' }); return; }
      if (message.type === 'resume') {
        const player = room.players.find(p => p.token === message.token && !p.socket && Date.now() - p.disconnectedAt < RECONNECT_MS);
        if (!player) { this.send(socket, { type: 'error', message: '重连凭证已失效，请重新加入房间。', reset: true }); return; }
        this.attach(socket, connection, room, player); return;
      }
      if (room.players.length >= 2 || room.match.phase !== 'ready') { this.send(socket, { type: 'error', message: '房间已有两名玩家或正在比赛。' }); return; }
      const player = this.player('red'); room.players.push(player); this.attach(socket, connection, room, player); return;
    }
    const { room, player } = connection;
    if (!room || !player || player.socket !== socket) return;
    if (message.type === 'assets-ready') {
      player.loaded = true;
      if (room.players.length === 2 && room.players.every(p => p.socket && p.loaded) && room.match.phase === 'paused') room.match.togglePause();
      this.broadcast(room); return;
    }
    if (message.type === 'ready' && !room.countdownAt && (room.match.phase === 'ready' || room.match.phase === 'ended')) {
      if (!player.loaded) { this.send(socket, { type: 'error', message: '请等待游戏资源加载完成后再准备。' }); return; }
      player.ready = true;
      if (room.players.length === 2 && room.players.every(p => p.socket && p.ready && p.loaded)) {
        room.match = new Match({ ai: false, league:true }); room.round++; room.countdownAt = Date.now() + 3000; room.accumulator = 0;
      }
      this.broadcast(room);
    } else if (message.type === 'command' && player.loaded && room.match.phase === 'playing' && !room.countdownAt
      && Number.isSafeInteger(message.seq) && message.seq > player.seq && validCommand(message.command)) {
      player.seq = message.seq;
      executeCommand(room.match, player.team, message.command);
    }
  }
  private player(team: Team): Player { return { team, token: randomBytes(24).toString('hex'), socket: null, ready: false, loaded: false, disconnectedAt: 0, seq: 0 }; }
  private disconnect(socket: WebSocket, connection: Connection): void {
    this.connections.delete(socket);
    const { room, player } = connection;
    if (!room || !player || player.socket !== socket) return;
    player.socket = null; player.disconnectedAt = Date.now(); player.loaded = false;
    if (room.match.phase === 'playing') room.match.togglePause();
    if (room.countdownAt) { room.countdownAt = 0; for (const p of room.players) p.ready = false; }
    room.accumulator = 0; this.broadcast(room);
  }
  private leave(connection: Connection): void {
    const room = connection.room;
    if (room) this.closeRoom(room, '有玩家离开，房间已关闭。');
  }
  private closeRoom(room: Room, message: string): void {
    for (const player of room.players) {
      this.send(player.socket, { type: 'error', message, reset: true });
      const c = player.socket && this.connections.get(player.socket);
      if (c) { c.outbox.reset(); delete c.room; delete c.player; }
    }
    this.rooms.delete(room.code);
  }
  private tick(): void {
    const now = performance.now(), dt = Math.min(.25, Math.max(0, (now - this.previous) / 1000)); this.previous = now;
    const broadcast = now - this.lastBroadcast >= SNAPSHOT_MS;
    if (broadcast) this.lastBroadcast += Math.floor((now - this.lastBroadcast) / SNAPSHOT_MS) * SNAPSHOT_MS;
    if (now - this.lastHeartbeat > 5000) {
      this.lastHeartbeat = now;
      for (const [socket, connection] of this.connections) {
        if (!connection.alive) socket.terminate();
        else { connection.alive = false; socket.ping(); }
      }
    }
    for (const room of this.rooms.values()) {
      if (room.players.some(p => !p.socket && Date.now() - p.disconnectedAt >= RECONNECT_MS)) { this.closeRoom(room, '重连等待超时，房间已关闭。'); continue; }
      if (room.players.length === 1 && Date.now() - room.emptyAt > 30 * 60_000) { this.closeRoom(room, '等待时间过长，房间已关闭。'); continue; }
      if (room.countdownAt && Date.now() >= room.countdownAt) { room.countdownAt = 0; room.match.start(); for (const p of room.players) p.ready = false; }
      if (room.match.phase === 'playing') {
        room.accumulator += dt;
        while (room.accumulator >= WORLD.step) { room.match.step(WORLD.step); room.accumulator -= WORLD.step; }
      }
      if (broadcast) this.broadcast(room);
    }
    for (const connection of this.connections.values()) connection.outbox.flush();
  }
  dispose(): void { clearInterval(this.timer); for (const socket of this.connections.keys()) socket.terminate(); this.wss.close(); this.rooms.clear(); }
}
