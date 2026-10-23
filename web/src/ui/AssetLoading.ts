import type { AssetLoadGate } from '../presentation/AssetLoadGate';
import './asset-loading.css';
export function mountAssetLoading(container: HTMLElement, gate: AssetLoadGate) {
  const panel = document.createElement('section'); panel.className = 'asset-loading'; panel.setAttribute('aria-label', '加载游戏资源');
  panel.innerHTML = '<div class="asset-loading-card"><small>HOWLING ABYSS</small><h2>正在准备对局</h2><p role="status">加载地图、角色动作与战斗资源…</p><progress aria-label="资源加载进度" max="1" value="0"></progress><output>0 / 0</output><p class="asset-loading-note">资源就绪后才会进入游戏。</p><button type="button" hidden>刷新重试</button></div>';
  container.append(panel);
  const status = panel.querySelector('p')!, progress = panel.querySelector('progress')!, count = panel.querySelector('output')!;
  gate.onProgress = ({ loaded, total }) => { progress.max = Math.max(1, total); progress.value = loaded; count.textContent = `${loaded} / ${total}`; };
  panel.querySelector('button')!.onclick = () => document.dispatchEvent(new Event('midline:retry-game'));
  return {
    phase(message: string) { status.textContent = message; }, complete() { panel.remove(); },
    fail(cause: unknown) {
      panel.classList.add('asset-loading-failed'); status.textContent = cause instanceof Error ? cause.message : String(cause);
      panel.querySelector('h2')!.textContent = '资源尚未就绪'; panel.querySelector('button')!.hidden = false;
    },
    dispose() { panel.remove(); },
  };
}
