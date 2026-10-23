/** Fullscreen the document so the menu and game share the same fullscreen session. */
export function mountFullscreen(parent: HTMLElement, existing?: HTMLButtonElement | null): () => void {
  const button = existing ?? document.createElement('button');
  button.type = 'button'; button.classList.add('fullscreen-toggle');
  if (!existing) parent.append(button);
  const abort = new AbortController();
  const message = document.createElement('span');
  message.className = 'fullscreen-message'; message.role = 'status'; message.hidden = true;
  button.after(message);
  const sync = () => {
    const active = !!document.fullscreenElement;
    button.textContent = active ? '退出全屏 ↙' : '全屏显示 ↗';
    button.setAttribute('aria-pressed', String(active));
    button.disabled = !document.fullscreenEnabled;
    button.title = document.fullscreenEnabled ? '切换全屏显示，按 Esc 可退出全屏' : '当前浏览器不支持全屏显示';
  };
  button.addEventListener('click', async () => {
    message.hidden = true;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      message.textContent = '未能切换全屏，请在浏览器中重试。'; message.hidden = false;
    }
    sync();
  }, { signal: abort.signal });
  document.addEventListener('fullscreenchange', sync, { signal: abort.signal });
  sync();
  return () => { abort.abort(); message.remove(); };
}
