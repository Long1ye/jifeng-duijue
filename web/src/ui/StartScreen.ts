import { mountFullscreen } from './Fullscreen';
import {isLanGameHost} from './LanAccess';
import { SOLO_OPPONENT_KEY, soloOpponent, type SoloOpponent } from '../game/SoloOpponent';
import yasuoPreview from '../../assets/heroes/yasuo/locomotion16-2026-10-15/runtime/idle-se.png?url';
import nailongPreview from '../../assets/heroes/nailong/idle-se.png?url';
import { showGraphicsNotice } from './GraphicsNotice';

/** The simulation is imported only after the player chooses to enter. */
export function mountStartScreen(onStart: (mode: 'solo' | 'online', opponent: SoloOpponent) => void): () => void {
    let mode: 'solo' | 'online' = new URLSearchParams(location.search).get('online') === '1' ? 'online' : 'solo';
    let savedOpponent: string | null = null;
    try { savedOpponent = localStorage.getItem(SOLO_OPPONENT_KEY); } catch { /* Storage is optional. */ }
    let opponent = soloOpponent(new URLSearchParams(location.search).get('opponent'), savedOpponent);
    const localGame=isLanGameHost(location.hostname);
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
            <button type="button" data-mode="online"><span class="start-mode-icon" aria-hidden="true">⚔</span><span><strong>局域网双人对战</strong><small>需本地主机 · 查看联机步骤</small></span><span class="start-radio" aria-hidden="true"></span></button>
          </div>
          <p id="start-mode-note" class="start-mode-note" aria-live="polite"></p>
          <section class="start-opponents" aria-labelledby="start-opponent-title">
            <div class="start-opponent-heading"><h3 id="start-opponent-title">选择对手</h3><span>你将操控亚索</span></div>
            <div class="start-opponent-cards" role="group" aria-label="单人模式对手">
              <button type="button" data-opponent="yasuo" aria-label="选择亚索作为对手"><span class="start-opponent-stage" aria-hidden="true"><span class="start-opponent-sprite start-opponent-yasuo"></span></span><span class="start-opponent-name">Yasuo<small>亚索</small></span><span class="start-opponent-selected" aria-hidden="true">已选择</span></button>
              <button type="button" data-opponent="nailong" aria-label="选择奶龙作为对手"><span class="start-opponent-stage" aria-hidden="true"><span class="start-opponent-sprite start-opponent-nailong"></span></span><span class="start-opponent-name">Nailong<small>奶龙</small></span><span class="start-opponent-selected" aria-hidden="true">已选择</span></button>
            </div>
          </section>
          <details class="start-lan-guide" hidden>
            <summary>网页版 v0.1.4 · 局域网联机指引</summary>
            <div tabindex="-1" class="start-lan-steps">
              <p class="start-lan-limit">网页版 v0.1.4：平台内仅支持单人试玩。局域网联机需使用本地版，双方连接同一网络。</p>
              <p><a class="start-lan-release" href="https://github.com/Long1ye/jifeng-duijue/releases/tag/v0.1.3" target="_blank" rel="noopener noreferrer">v0.1.3 下载与说明 ↗</a></p>
              <ol>
                <li><strong>一人启动主机</strong>Windows 版点击“创建对局”；网页版需启动完整项目的联机服务，网页 ZIP 本身不含服务器。</li>
                <li><strong>双方打开主机网址</strong>使用主机显示的局域网地址，不要使用平台链接或 <code>127.0.0.1</code>。主机允许防火墙的专用网络访问。</li>
                <li><strong>输入房间码开玩</strong>主机创建房间，好友输入六位房间码，双方准备后开始。游玩期间主机保持运行。</li>
              </ol>
              <details class="start-lan-web-help"><summary>网页版主机如何启动？</summary><p>需要完整项目和 Node.js 24+。在项目目录依次运行 <code>npm ci</code>、<code>npm run build</code>、<code>npm start</code>，使用终端显示的局域网网址。</p></details>
              <details class="start-lan-windows"><summary>免配置的 Windows 本地版</summary><p>双方下载同一 Windows 版本，完整解压 Windows-x64.zip 后运行“疾风对决.exe”，无需安装 Node.js。</p><p><a class="start-lan-download" href="https://github.com/Long1ye/jifeng-duijue/releases/tag/v0.1.2" target="_blank" rel="noopener noreferrer">下载 Windows 本地版 v0.1.2 ↗</a></p></details>
              <button type="button" class="start-lan-solo">返回单人试玩</button>
            </div>
          </details>
          <div class="start-display-options" aria-label="显示选项"></div>
          <button class="start-play" type="button"><span>开始游戏</span><span aria-hidden="true">→</span></button>
          <p class="start-entry-note">键盘与鼠标操作 · 无需登录</p>
          <aside class="start-art-credit" aria-label="Meowa 平台美术资源支持">
            <span class="start-art-credit-label">美术资源支持</span>
            <a href="https://meowa.ai" target="_blank" rel="noopener noreferrer"><strong>Meowa AI</strong><span>访问平台 ↗</span></a>
            <p>游戏原创美术资源通过 Meowa 平台生成制作。</p>
          </aside>
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
      <footer class="start-footer"><span>一条中路 · 三种胜利</span><span>HOWLING ABYSS <b> / </b> 疾风对决 · v0.1.4</span></footer>`;
    document.body.append(screen);
    screen.style.setProperty('--opponent-yasuo', `url("${yasuoPreview}")`);
    screen.style.setProperty('--opponent-nailong', `url("${nailongPreview}")`);
    // The menu is usable before its decorative image module or image finishes loading.
    void import('../../assets/map-concepts/howling-abyss-target-v1/01-overview.png?url').then(({ default: background }) => {
      if (screen.isConnected) screen.style.setProperty('--start-art', `url("${background}")`);
    }).catch(() => { /* The menu keeps its readable gradient if the artwork is unavailable. */ });
    const disposeFullscreen = mountFullscreen(screen.querySelector<HTMLElement>('.start-display-options')!);
    const buttons = [...screen.querySelectorAll<HTMLButtonElement>('[data-mode]')];
    const play = screen.querySelector<HTMLButtonElement>('.start-play')!;
    const guide=screen.querySelector<HTMLDetailsElement>('.start-lan-guide')!;
    const opponentSection = screen.querySelector<HTMLElement>('.start-opponents')!;
    const opponentButtons = [...screen.querySelectorAll<HTMLButtonElement>('[data-opponent]')];
    const sync = () => {
      for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
      guide.hidden=mode!=='online';
      opponentSection.hidden = mode !== 'solo';
      for (const button of opponentButtons) button.setAttribute('aria-pressed', String(button.dataset.opponent === opponent));
      if(mode==='online'&&!localGame)guide.open=true;
      play.querySelector('span')!.textContent = mode === 'solo' ? '开始单人对局' : localGame?'进入局域网大厅':'查看局域网联机步骤';
      screen.querySelector('#start-mode-note')!.textContent = mode === 'solo'
        ? '独自挑战 AI。练习补刀、走位与技能连招。'
        : localGame?'请确认主机已启动对战服务。双方打开主机网址，通过六位房间码加入。':'平台链接只能单人试玩。局域网对战请按下方步骤使用本地完整版。';
    };
    for (const button of buttons) button.addEventListener('click', () => { mode = button.dataset.mode as typeof mode; sync(); });
    for (const button of opponentButtons) button.addEventListener('click', () => {
      opponent = soloOpponent(button.dataset.opponent ?? null);
      try { localStorage.setItem(SOLO_OPPONENT_KEY, opponent); } catch { /* Choice still applies to this match. */ }
      sync();
    });
    screen.querySelector('.start-lan-solo')!.addEventListener('click',()=>{mode='solo';sync();play.focus();});
    let disposeNotice: (() => void) | undefined;
    const begin = () => {
      disposeFullscreen();
      play.disabled = true; play.querySelector('span')!.textContent = '正在进入…';
      screen.setAttribute('aria-busy', 'true');
      onStart(mode, opponent);
    };
    play.addEventListener('click', () => {
      if(play.disabled || disposeNotice)return;
      if(mode==='online'&&!localGame){guide.open=true;guide.querySelector<HTMLElement>('.start-lan-steps')!.focus();guide.scrollIntoView({block:'nearest',behavior:'smooth'});return;}
      disposeNotice = showGraphicsNotice(screen, () => { disposeNotice = undefined; begin(); }, () => { disposeNotice = undefined; play.focus(); });
    });
    sync();
    document.dispatchEvent(new Event('midline:boot-ready'));
    return () => { disposeNotice?.(); disposeFullscreen(); screen.remove(); };
}

