/** Explain automatic quality before entry, while no simulation or room is running. */
export function showGraphicsNotice(container: HTMLElement, onContinue: () => void, onCancel: () => void): () => void {
  const dialog = document.createElement('dialog');
  dialog.className = 'graphics-notice'; dialog.setAttribute('aria-labelledby', 'graphics-notice-title');
  dialog.setAttribute('aria-describedby', 'graphics-notice-description');
  dialog.innerHTML = `<small>画面设置</small><h2 id="graphics-notice-title">为你的电脑选择合适的画质</h2>
    <div id="graphics-notice-description"><p>为了让对局更流畅，游戏会在自动模式下根据电脑配置选择画质，并在持续卡顿时适当降低画质。</p>
    <p>想要更精细的画面？进入游戏后，打开 <strong>设置 → 视频 → 性能模式</strong>，选择「均衡」或「高清」。</p>
    <p class="graphics-notice-note">画质越高，对电脑性能的要求越高。已保存的手动画质设置会保留。</p></div>
    <div class="graphics-notice-actions"><button type="button" data-notice-cancel>返回</button><button type="button" data-notice-continue autofocus>知道了，开始对局</button></div>`;
  let done = false;
  const dispose = () => { done = true; dialog.close(); dialog.remove(); };
  const finish = (accepted: boolean) => { if (done) return; dispose(); if (accepted) onContinue(); else onCancel(); };
  dialog.querySelector('[data-notice-continue]')!.addEventListener('click', () => finish(true));
  dialog.querySelector('[data-notice-cancel]')!.addEventListener('click', () => finish(false));
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
  container.append(dialog); dialog.showModal();
  return dispose;
}
