import { ABILITIES } from '../game/config';
import type { AbilityKey } from '../game/types';
import './operation-guide.css';

const descriptions: Record<AbilityKey, string> = {
  q: '向鼠标方向出剑，伤害沿途敌人。连续命中积攒两层旋风后，下一次 Q 发射旋风并击飞敌人。',
  w: '朝鼠标方向立起风墙，拦截敌方飞行技能和远程普攻；无法阻挡防御塔攻击。',
  e: '鼠标指向附近敌方单位，突进穿过目标并造成伤害。同一目标短时间内不能重复突进，无法对空地释放。',
  r: '附近有被击飞的敌方英雄时可释放，瞬移至目标身边，延长击飞并造成伤害。可用 Q 的旋风击飞后接 R。',
};

/** Passive reference only: never consumes gameplay keys or advances tutorial steps. */
export function mountOperationGuide(shell: HTMLElement, practice: boolean): void {
  const scope = new AbortController();
  document.addEventListener('midline:dispose', () => scope.abort(), { once: true, signal: scope.signal });
  const guide = document.createElement('details');
  guide.className = `operation-guide${practice ? ' practice-guide' : ''}`;
  try { guide.open = localStorage.getItem('midline-operation-guide') !== 'closed'; }
  catch { guide.open = true; }
  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="guide-title"><svg class="guide-book" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C9 3 6 3 3 4v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Zm0 0v15M6 8h3M6 11h3m6-3h3m-3 3h3"/></svg> 操作手册</span><span class="guide-collapse" aria-hidden="true"></span>';
  const body = document.createElement('div'); body.className = 'operation-guide-body';
  const mouse = (button:'left'|'right'|'both') => `<svg class="guide-mouse" viewBox="0 0 36 48" aria-hidden="true"><rect x="6" y="2" width="24" height="42" rx="12"/><path class="mouse-${button}" d="${button==='right'?'M19 3h1a10 10 0 0 1 9 10v7H19Z':button==='left'?'M17 3h-1A10 10 0 0 0 7 13v7h10Z':'M7 13a11 11 0 0 1 22 0v7H7Z'}"/><path d="M18 3v18M7 21h22"/><rect class="mouse-wheel" x="16" y="9" width="4" height="8" rx="2"/></svg>`;
  body.innerHTML = `
    <div class="guide-tabs" role="tablist" aria-label="操作分类">
      <button type="button" role="tab" id="guide-mouse-tab" aria-controls="guide-mouse-panel" aria-selected="true">鼠标与镜头</button>
      <button type="button" role="tab" id="guide-combat-tab" aria-controls="guide-combat-panel" aria-selected="false" tabindex="-1">战斗与装备</button>
    </div>
    <section class="guide-tab-panel" id="guide-mouse-panel" role="tabpanel" aria-labelledby="guide-mouse-tab">
      <div class="guide-mouse-pair">
        <article class="guide-gesture">${mouse('left')}<div><strong>左键 · 单击</strong><p>选中英雄、兵或塔<br>查看目标信息</p></div></article>
        <article class="guide-gesture">${mouse('right')}<div><strong>右键 · 单击</strong><p>点地面移动<br>点敌人追击 / 普攻</p></div></article>
      </div>
      <article class="guide-drag-card"><span class="guide-drag-picture">${mouse('left')}<svg viewBox="0 0 60 22" aria-hidden="true"><path d="M3 11h54M10 4l-7 7 7 7m40-14 7 7-7 7"/></svg></span><div><strong>按住左键 + 拖动</strong><p>拖动画面，自由查看战场</p><small>按住中键拖动也可以</small></div></article>
      <div class="guide-camera-keys">
        <div><kbd>滚轮</kbd><span>缩放画面</span></div><div><kbd>↑ ↓ ← →</kbd><span>移动镜头</span></div>
        <div><kbd>Space</kbd><span>按住回到英雄</span></div><div><kbd>Y</kbd><span>跟随镜头 开 / 关</span></div>
      </div>
    </section>
    <section class="guide-tab-panel guide-combat-panel" id="guide-combat-panel" role="tabpanel" aria-labelledby="guide-combat-tab" hidden>
      <div class="guide-skill-keys"><kbd>Q</kbd><kbd>W</kbd><kbd>E</kbd><kbd>R</kbd><div><strong>朝鼠标方向施法</strong><span>悬停底部技能图标，查看技能说明</span></div></div>
      <div class="guide-command-cards">
        <article><kbd>Ctrl + Q/W/E/R</kbd><strong>学习 / 升级技能</strong><p>也可点击技能图标上方的 ＋</p></article>
        <article><kbd>A → 左键</kbd><strong>攻击选点</strong><p>点敌人攻击，点地面攻击移动</p></article>
        <article><kbd>D / F</kbd><strong>闪现 / 点燃</strong><p>对准鼠标位置或敌方英雄</p></article>
        <article><kbd>S</kbd><strong>停止行动</strong><p>取消移动与当前攻击指令</p></article>
      </div>
      <details class="guide-equipment"><summary>装备与其他快捷键</summary><div class="guide-equipment-grid">
        <div><kbd>P</kbd><span>打开 / 关闭商店</span></div><div><kbd>Alt+1 / Alt+2</kbd><span>使用前两格装备</span></div>
        <div><kbd>5 / 6 / 7 / 8</kbd><span>使用其余四格装备</span></div><div><kbd>Alt+4</kbd><span>使用饰品</span></div>
        <div><kbd>F10</kbd><span>打开 / 关闭设置</span></div><div><kbd>Esc</kbd><span>退出全屏 / 取消选点</span></div>
      </div><p>也可右键装备栏使用主动效果。</p></details>
    </section>
    <section class="guide-emotes" aria-labelledby="guide-emotes-title"><div class="guide-section-heading"><h3 id="guide-emotes-title">浪客的小把戏</h3><span>1 — 4 英雄动作</span></div>
      <div class="guide-emote-grid">
        <article><kbd>1</kbd><div><strong>玩笑</strong><p>趣味动作 + 玩笑语音</p></div></article>
        <article><kbd>2</kbd><div><strong>嘲讽</strong><p>挑衅动作 + 嘲讽语音</p></div></article>
        <article><kbd>3</kbd><div><strong>吹箫</strong><p>吹奏动作 + 箫声</p></div></article>
        <article><kbd>4</kbd><div><strong>大笑</strong><p>大笑动作 + 笑声</p></div></article>
      </div><p class="guide-interrupt-hint">移动、攻击、施法或受击会打断动作。</p>
    </section>`;
  const tabs = Array.from(body.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(body.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const selectTab = (index:number) => {
    tabs.forEach((tab,i) => { tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1; });
    panels.forEach((panel,i) => { panel.hidden=i!==index; });
  };
  tabs.forEach((tab,index) => {
    tab.addEventListener('click',()=>selectTab(index));
    tab.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      event.preventDefault();event.stopPropagation();
      const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+1)%tabs.length;
      selectTab(next);tabs[next].focus();
    });
  });
  guide.append(summary, body); shell.append(guide);
  guide.addEventListener('toggle', () => {
    try { localStorage.setItem('midline-operation-guide', guide.open ? 'open' : 'closed'); }
    catch { /* Storage can be unavailable in private browser contexts. */ }
  });

  for (const key of ['q', 'w', 'e', 'r'] as const) {
    const button = shell.querySelector<HTMLElement>(`#ability-${key}`)!;
    const tooltip = document.createElement('div');
    tooltip.className = 'skill-tooltip'; tooltip.id = `skill-description-${key}`;
    tooltip.role = 'tooltip'; tooltip.hidden = true;
    const title = document.createElement('strong'); title.textContent = `${key.toUpperCase()} · ${ABILITIES[key].name}`;
    const description = document.createElement('p'); description.textContent = descriptions[key];
    tooltip.append(title, description); shell.append(tooltip);
    button.setAttribute('aria-describedby', tooltip.id);
    button.removeAttribute('title');
    const sync = () => {
      tooltip.hidden = !(button.matches(':hover') || document.activeElement === button);
      if (tooltip.hidden) return;
      const rect = button.getBoundingClientRect();
      const left = Math.max(8, Math.min(window.innerWidth - tooltip.offsetWidth - 8, rect.left + rect.width / 2 - tooltip.offsetWidth / 2));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(8, rect.top - tooltip.offsetHeight - 12)}px`;
    };
    button.addEventListener('pointerenter', sync);
    button.addEventListener('pointerleave', sync);
    button.addEventListener('focus', sync);
    button.addEventListener('blur', sync);
    window.addEventListener('resize', sync, { signal: scope.signal });
  }
}
