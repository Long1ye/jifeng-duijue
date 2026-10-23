import { Match } from '../game/Match';
import { RenderPositions } from '../render/RenderPositions';
import type { Team } from '../game/types';
import type { PrototypeCommand, PrototypeView } from '../presentation/PrototypeHost';
import { applyState, PROTOCOL_VERSION, type ClientMessage, type RoomInfo, type ServerMessage } from './protocol';
import { SnapshotBuffer } from './SnapshotBuffer';
import { MovementPrediction } from './MovementPrediction';

const SESSION_KEY = 'midline-room-v1';

/** Authority owns combat; the local replica predicts navigation for presentation only. */
export class NetworkHost {
  match = new Match({ ai: false, league:true });
  team: Team = 'blue';
  room: RoomInfo | null = null;
  connected = false;
  latency = 0;
  fps = 0;
  assetsReady = false;
  setAssetsReady(): void { this.assetsReady = true; this.send({ type: 'assets-ready' }); this.onChange(); }
  get snapshotAgeMs(): number { return this.snapshots.snapshotAgeMs; }
  message = '正在连接对战服务…';
  onChange: () => void = () => {};
  onRound: () => void = () => {};
  private socket: WebSocket | null = null;
  private readonly positions = new RenderPositions();
  private readonly snapshots = new SnapshotBuffer();
  private readonly prediction = new MovementPrediction();
  private seq = 0;
  private predictionRtt = 0;
  private round = -1;
  private frameSeconds = 0;
  private frameCount = 0;
  private disposed = false;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private readonly heartbeat: ReturnType<typeof setInterval>;
  private session: { code: string; token: string } | null = null;
  constructor(private view: PrototypeView) {
    try { this.session = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { /* A new session remains usable. */ }
    this.connect();
    this.heartbeat = setInterval(() => this.send({ type: 'ping', at: performance.now() }), 2000);
  }
  attachView(view: PrototypeView): void { this.view = view; }
  private saveSession(): void {
    try { if (this.session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(this.session)); else sessionStorage.removeItem(SESSION_KEY); } catch { /* Storage may be disabled. */ }
  }
  private connect(): void {
    if (this.disposed) return;
    const socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/battle`);
    this.socket = socket;
    const timeout = setTimeout(() => { if (!this.connected) socket.close(); }, 5000);
    socket.addEventListener('open', () => {
      clearTimeout(timeout); this.connected = true; this.seq = 0; this.latency = 0; this.predictionRtt = 0; this.prediction.reset();
      this.send({ type: 'ping', at: performance.now() });
      this.message = '已连接。创建房间，或输入好友的房间码。';
      if (this.session) { this.message = '正在恢复房间…'; this.send({ type: 'resume', ...this.session, version: PROTOCOL_VERSION }); }
      this.onChange();
    });
    socket.addEventListener('message', event => {
      let message: ServerMessage;
      try { message = JSON.parse(String(event.data)) as ServerMessage; } catch { return; }
      switch (message.type) {
        case 'welcome':
          this.prediction.reset();
          this.session = { code: message.code, token: message.token }; this.team = message.team; this.saveSession();
          if (this.assetsReady) this.send({ type: 'assets-ready' });
          this.message = `已加入房间 ${message.code}，你是${this.team === 'blue' ? '蓝' : '红'}方。`; break;
        case 'state': {
          const fresh = this.round !== message.room.round;
          if (fresh) { this.match = new Match({ ai: false, league:true }); this.positions.reset(); this.snapshots.reset(); this.prediction.reset(); this.round = message.room.round; applyState(this.match, message.state); }
          const now = performance.now();
          this.snapshots.push(message.state, message.events, now, message.eventBatches); this.room = message.room;
          this.prediction.receive(message.state, this.team, message.ack[this.team], now, this.predictionRtt);
          if (fresh) this.onRound();
          break;
        }
        case 'error':
          this.message = message.message;
          if (message.reset) { this.session = null; this.room = null; this.round = -1; this.snapshots.reset(); this.prediction.reset(); this.match.phase = 'ready'; this.saveSession(); }
          break;
        case 'pong':
          this.latency = Math.round(Math.max(0, performance.now() - message.at));
          // A single delayed heartbeat must not abruptly shift predicted position.
          this.predictionRtt = this.predictionRtt ? this.predictionRtt + (this.latency - this.predictionRtt)
            * (this.latency < this.predictionRtt ? .25 : .05) : this.latency;
          break;
      }
      this.onChange();
    });
    socket.addEventListener('close', () => {
      clearTimeout(timeout); this.connected = false; this.snapshots.reset(); this.prediction.reset();
      this.message = '连接已断开，正在重试…请确认主机仍在主持、两台电脑处于同一局域网，且防火墙允许专用网络。'; this.onChange();
      if (!this.disposed) this.retry = setTimeout(() => this.connect(), 1000);
    });
    socket.addEventListener('error', () => { socket.close(); });
  }
  private send(message: ClientMessage): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) return false;
    // Do not enqueue stale user actions behind a congested uplink.
    if (message.type === 'command' && this.socket.bufferedAmount > 16_384) return false;
    this.socket.send(JSON.stringify(message)); return true;
  }
  create(): void { this.send({ type: 'create', version: PROTOCOL_VERSION }); }
  join(code: string): void { this.send({ type: 'join', code: code.trim(), version: PROTOCOL_VERSION }); }
  ready(): void { if (this.assetsReady) this.send({ type: 'ready' }); }
  leave(): void { this.send({ type: 'leave' }); this.session = null; this.room = null; this.round = -1; this.match.phase = 'ready'; this.snapshots.reset(); this.prediction.reset(); this.saveSession(); this.onChange(); }
  command(command: PrototypeCommand): boolean {
    if (!this.assetsReady || !this.connected || this.room?.phase !== 'playing') return false;
    const seq = this.seq + 1;
    if (!this.send({ type: 'command', seq, command })) return false;
    this.seq = seq; this.prediction.command(seq, command, performance.now()); return true;
  }
  pause(): void { /* A player cannot pause the shared authority. */ }
  restart(): void { this.ready(); }
  update(seconds: number): void {
    const now = performance.now();
    const frame = this.snapshots.sample(now);
    if (frame) applyState(this.match, frame.state);
    const local = this.prediction.sample(now);
    if (local && this.room?.phase === 'playing') {
      // Copy only navigation presentation. Never write predicted HP, damage or cooldowns.
      this.match.entities = this.match.entities.map(entity => entity.id === local.id ? { ...entity,
        x: local.x, y: local.y, facing: local.facing, destination: local.destination,
        targetId: local.targetId, attackTargetId: local.attackTargetId, windup: local.windup,
        attackStartedAt: local.attackStartedAt, attackReleasedAt: local.attackReleasedAt,
        fluteAt: local.fluteAt, emote: local.emote } : entity);
    }
    this.view.frame({ match: this.match, positions: this.positions, alpha: 1, events: frame?.events ?? [], localTeam: this.team });
    this.frameSeconds += seconds; this.frameCount++;
    if (this.frameSeconds >= .5) {
      this.fps = Math.round(this.frameCount / this.frameSeconds); this.frameSeconds = 0; this.frameCount = 0; this.onChange();
    }
  }
  dispose(): void { this.disposed = true; clearTimeout(this.retry); clearInterval(this.heartbeat); this.socket?.close(); this.view.dispose(); }
}
