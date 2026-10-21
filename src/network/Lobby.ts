import type { NetworkHost } from './NetworkHost';
import './lobby.css';

export function mountLobby(host: NetworkHost, signal: AbortSignal, shell = document.querySelector<HTMLElement>('.match-shell')!): void {
  const panel = document.createElement('section'); panel.className = 'battle-lobby'; panel.setAttribute('aria-label', '双人对战房间');
  panel.innerHTML = `<div class="battle-card"><small>HOWLING ABYSS · 1V1</small><h2>双人对战</h2>
    <p class="battle-message" role="status"></p><div class="battle-entry">
    <button type="button" data-create>创建房间</button><form><label>房间码<input aria-label="房间码" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" placeholder="输入六位房间码" required autocomplete="off"></label><button type="submit">加入房间</button></form></div>
    <div class="battle-room" hidden><p>房间码 <strong data-code></strong> · <span data-team></span></p><p data-players></p><p data-phase></p>
    <button type="button" data-ready>准备</button><button type="button" data-leave>离开房间</button></div>
    <p class="battle-help">同一局域网的两台电脑打开主机显示的同一个地址。双方准备后开始；一血、首塔或补满 100 刀获胜。</p>
    <a href="/three.html?map=howling&scene=match">返回主菜单</a></div>`;
  const badge = document.createElement('div'); badge.className = 'battle-badge';
  badge.innerHTML = '<span></span><button type="button">离开房间</button>';
  shell.append(panel, badge);
  signal.addEventListener('abort', () => { panel.remove(); badge.remove(); host.onChange = () => {}; }, { once: true });
  const get = <T extends HTMLElement>(selector: string) => panel.querySelector<T>(selector)!;
  get<HTMLButtonElement>('[data-create]').addEventListener('click', () => host.create(), { signal });
  get<HTMLFormElement>('form').addEventListener('submit', event => { event.preventDefault(); host.join(get<HTMLInputElement>('input').value); }, { signal });
  get<HTMLButtonElement>('[data-ready]').addEventListener('click', () => host.ready(), { signal });
  get<HTMLButtonElement>('[data-leave]').addEventListener('click', () => host.leave(), { signal });
  badge.querySelector('button')!.addEventListener('click', () => host.leave(), { signal });
  let previousStatus = '';
  host.onChange = () => {
    const room = host.room;
    const signature = JSON.stringify([host.assetsReady, host.connected, host.message, host.team, room, host.latency, host.fps, Math.floor(host.snapshotAgeMs / 200)]);
    if (signature === previousStatus) return;
    previousStatus = signature;
    panel.hidden = !!room && room.phase === 'playing' && host.connected;
    badge.hidden = !panel.hidden;
    if (panel.hidden && room) {
      badge.querySelector('span')!.textContent = `房间 ${room.code} · ${host.team === 'blue' ? '蓝' : '红'}方 · ${host.latency} ms · ${host.fps || '—'} FPS${host.snapshotAgeMs > 200 ? ` · 同步等待 ${Math.round(host.snapshotAgeMs)} ms` : ''}`;
      return;
    }
    const overlay = document.getElementById('match-overlay');
    if (!panel.hidden && overlay) overlay.hidden = true;
    get('.battle-message').textContent = host.connected && room ? `已连接 · 延迟 ${host.latency} ms` : host.message;
    get('.battle-entry').hidden = !!room;
    get('.battle-room').hidden = !room;
    for (const button of panel.querySelectorAll<HTMLButtonElement>('.battle-entry button')) button.disabled = !host.connected;
    if (room) {
      get('[data-code]').textContent = room.code;
      get('[data-team]').textContent = `你是${host.team === 'blue' ? '蓝' : '红'}方`;
      get('[data-players]').textContent = (['blue', 'red'] as const).map(team => {
        const player = room.players.find(p => p.team === team);
        return `${team === 'blue' ? '蓝' : '红'}方：${!player ? '等待加入' : !player.connected ? '连接中断' : !player.loaded ? '资源加载中' : player.ready ? '已准备' : '未准备'}`;
      }).join('　/　');
      const reasons: Record<string, string> = { loading: '等待双方游戏资源就绪…', waiting: '双方准备后开始对战。', countdown: `${room.countdown} 秒后开始…`, reconnecting: `比赛已暂停，等待玩家重连（${room.reconnectSeconds} 秒）。`, playing: '对战进行中', ended: '对局结束，双方准备可再来一局。' };
      const result = host.match.result;
      get('[data-phase]').textContent = room.phase === 'ended' && result ? `${result.winner === null ? '平局' : result.winner === host.team ? '你赢了！' : '本局落败'} · ${result.reason === 'first-blood' ? '一血' : result.reason === 'first-tower' ? '首塔' : result.reason === '100-cs' ? '100 补刀' : '平局'}。双方准备可再来一局。` : reasons[room.phase];
      const ready = get<HTMLButtonElement>('[data-ready]');
      ready.disabled = !host.assetsReady || !host.connected || !['waiting', 'ended'].includes(room.phase) || !!room.players.find(p => p.team === host.team)?.ready;
      ready.textContent = room.players.find(p => p.team === host.team)?.ready ? '已准备，等待对手' : room.phase === 'ended' ? '准备再来一局' : '准备';
      badge.querySelector('span')!.textContent = `房间 ${room.code} · ${host.team === 'blue' ? '蓝' : '红'}方 · ${host.latency} ms`;
    }
  };
  host.onChange();
}
