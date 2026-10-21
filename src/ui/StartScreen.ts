import { mountFullscreen } from './Fullscreen';

/** The simulation is imported only after the player chooses to enter. */
export function mountStartScreen(onStart: (mode: 'solo' | 'online') => void): () => void {
    let mode: 'solo' | 'online' = new URLSearchParams(location.search).get('online') === '1' ? 'online' : 'solo';
    const screen = document.createElement('main');
    screen.className = 'start-screen';
    screen.innerHTML = `
      <header class="start-header"><a class="start-brand" href="./"><span>◈</span> 疾风对决</a><span class="start-build">像素中路对决 <i></i> 1 VS 1</span></header>
      <div class="start-layout">
        <section class="start-intro" aria-labelledby="start-title">
          <p class="start-eyebrow">THE HOWLING ABYSS</p>
          <h1 id="start-title">疾风对决<span>冰桥 1V1</span></h1>
          <p class="start-tagline">风雪之上，胜负一线。</p>
          <p class="start-description">踏上嚎哭深渊的冰桥，化身亚索，<br>在兵线与剑风之间，赢下属于你的中路。</p>
          <div class="start-objectives" aria-label="游戏说明：率先完成任意一项即可获胜">
            <div><span>01 / FIRST BLOOD</span><strong>拿下一血</strong><p>击败对方英雄</p></div>
            <div><span>02 / FIRST TOWER</span><strong>推掉首塔</strong><p>摧毁敌方防御塔</p></div>
            <div><span>03 / 100 CS</span><strong>补满百刀</strong><p>完成 100 次最后一击</p></div>
          </div>
          <p class="start-win-note">率先达成任意一项，即可赢得对局。</p>
        </section>
        <section class="start-panel" aria-labelledby="start-mode-title">
          <div class="start-panel-heading"><span>开始你的对决</span><small>PLAY / 01</small></div>
          <h2 id="start-mode-title">选择游戏模式</h2>
          <div class="start-modes" role="group" aria-label="游戏模式">
            <button type="button" data-mode="solo"><span class="start-mode-icon" aria-hidden="true">◇</span><span><strong>单人模式</strong><small>与 AI 对线，磨练你的操作</small></span><span class="start-radio" aria-hidden="true"></span></button>
            <button type="button" data-mode="online"><span class="start-mode-icon" aria-hidden="true">⚔</span><span><strong>玩家对战</strong><small>邀请好友，来一场 1V1 对决</small></span><span class="start-radio" aria-hidden="true"></span></button>
          </div>
          <p id="start-mode-note" class="start-mode-note" aria-live="polite"></p>
          <div class="start-display-options" aria-label="显示选项"></div>
          <button class="start-play" type="button"><span>开始游戏</span><span aria-hidden="true">→</span></button>
          <p class="start-entry-note">键盘与鼠标操作 · 无需登录</p>
        </section>
        <section class="start-controls" aria-labelledby="start-controls-title">
          <div class="start-control-heading"><h2 id="start-controls-title">操作说明</h2><span>掌握基础，即刻出发</span></div>
          <div class="start-key-grid">
            <div><kbd>鼠标右键</kbd><span>移动 / 攻击目标</span></div><div><kbd>Q W E R</kbd><span>斩钢闪 / 风墙 / 突进 / 大招</span></div>
            <div><kbd>A + 左键</kbd><span>攻击目标 / 攻击移动</span></div><div><kbd>D / F</kbd><span>闪现 / 点燃</span></div>
            <div><kbd>Y / Space</kbd><span>切换跟随 / 镜头回到英雄</span></div><div><kbd>S / Esc</kbd><span>停止行动 / 取消或暂停</span></div>
          </div>
          <details class="start-more"><summary>更多操作与对线提示 <span>+</span></summary><div><p>左键选中单位或拖动地图；方向键、中键拖动可移动镜头，滚轮缩放。1 / 2 / 4 表情，3 吹箫。</p><p>Q 连续命中两次后获得旋风；旋风击飞敌方英雄后可接 R。E 需要指向敌方单位。</p><p>回到己方出生点可恢复状态。防御塔优先攻击小兵，攻击塔下英雄会吸引塔仇恨。联机对局不会因 Esc 或切换窗口暂停。</p></div></details>
        </section>
      </div>
      <footer class="start-footer"><span>一条中路 · 三种胜利</span><span>HOWLING ABYSS <b> / </b> 疾风对决</span></footer>`;
    document.body.append(screen);
    // The menu is usable before its decorative image module or image finishes loading.
    void import('../../assets/map-concepts/howling-abyss-target-v1/01-overview.png?url').then(({ default: background }) => {
      if (screen.isConnected) screen.style.setProperty('--start-art', `url("${background}")`);
    }).catch(() => { /* The menu keeps its readable gradient if the artwork is unavailable. */ });
    const disposeFullscreen = mountFullscreen(screen.querySelector<HTMLElement>('.start-display-options')!);
    const buttons = [...screen.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    const play = screen.querySelector<HTMLButtonElement>('.start-play')!;
    const sync = () => {
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      play.querySelector('span')!.textContent = mode === 'solo' ? '开始单人对局' : '进入对战大厅';
      screen.querySelector('#start-mode-note')!.textContent = mode === 'solo'
        ? '独自挑战 AI。练习补刀、走位与技能连招。'
        : '局域网联机：连接同一网络，通过六位房间码加入。需由主机开启对战服务。';
    };
    for (const button of buttons) button.addEventListener('click', () => { mode = button.dataset.mode as typeof mode; sync(); });
    play.addEventListener('click', () => {
      disposeFullscreen();
      play.disabled = true; play.querySelector('span')!.textContent = '正在进入…';
      screen.setAttribute('aria-busy', 'true');
      onStart(mode);
    }, { once: true });
    sync();
    document.dispatchEvent(new Event('midline:boot-ready'));
    return () => { disposeFullscreen(); screen.remove(); };
}

