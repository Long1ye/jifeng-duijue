import './ui/start-screen.css';
import { mountStartScreen } from './ui/StartScreen';
import { mountFullscreen } from './ui/Fullscreen';
import type { NetworkHost } from './network/NetworkHost';
import legacyPage from '../index.html?raw';
import threePage from '../three.html?raw';
import {isLanGameHost} from './ui/LanAccess';

const templates = new Map<boolean, string>();
// Upload hosts may rewrite secondary HTML requests back to the entry page.
templates.set(false, new DOMParser().parseFromString(legacyPage, 'text/html').querySelector('.app-shell')!.outerHTML);
templates.set(true, new DOMParser().parseFromString(threePage, 'text/html').querySelector('main.match-shell')!.outerHTML);
let disposeGame: ((preserveRoom?: boolean) => void) | undefined;
let disposeMenu: (() => void) | undefined;
let disposeFullscreen: (() => void) | undefined;
let revision = 0;

async function navigate(target: URL, play = false, lobbyHost?: NetworkHost): Promise<void> {
  // A hosted link must show the LAN instructions before opening any socket.
  if(play&&target.searchParams.get('online')==='1'&&!isLanGameHost(target.hostname)){
    await navigate(target,false);return;
  }
  const ticket = ++revision;
  document.dispatchEvent(new Event('midline:dispose'));
  disposeGame?.(); disposeGame = undefined;
  if (!play) { disposeMenu?.(); disposeMenu = undefined; }
  disposeFullscreen?.(); disposeFullscreen = undefined;
  if (lobbyHost) disposeGame = (preserveRoom = false) => { if (!preserveRoom) lobbyHost.leave(); lobbyHost.dispose(); };
  target.searchParams.delete('launch');
  history.replaceState(null, '', target);
  document.body.classList.add('launcher-pending');
  if (!play) {
    document.body.classList.remove('three-ui', 'league-ui', 'pixel-hud');
    disposeMenu = mountStartScreen(mode => {
      const url = new URL(location.href);
      url.searchParams.set('map', 'howling');
      // The desktop game opens the complete Three.js match by default.
      // Keep the original renderer available through index.html?launch=1.
      url.searchParams.set('renderer', 'three');
      url.searchParams.set('scene', 'match');
      if (mode === 'online') {
        url.searchParams.set('renderer', 'three');
        url.searchParams.set('online', '1'); url.searchParams.set('scene', 'match');
      } else url.searchParams.delete('online');
      void navigate(url, true);
    });
    return;
  }
  try {
    if (target.searchParams.get('online') === '1' && !lobbyHost) {
      // Join a room before importing the renderer or downloading battle assets.
      const [{ NetworkHost }, { mountLobby }] = await Promise.all([
        import('./network/NetworkHost'), import('./network/Lobby'),
      ]);
      if (ticket !== revision) return;
      const shell = document.createElement('main');
      shell.className = 'start-screen online-lobby';
      document.body.append(shell);
      const abort = new AbortController();
      const network = new NetworkHost({ frame() {}, dispose() {} });
      const lanAction = target.searchParams.get('lanAction');
      const roomCode = target.searchParams.get('roomCode') ?? '';
      target.searchParams.delete('lanAction'); target.searchParams.delete('roomCode');
      history.replaceState(null, '', target);
      let enteredLanRoom = false;
      mountLobby(network, abort.signal, shell);
      disposeFullscreen = mountFullscreen(shell);
      disposeGame = (preserveRoom = false) => { abort.abort(); if (!preserveRoom) network.leave(); network.dispose(); shell.remove(); };
      const update = network.onChange;
      network.onChange = () => {
        update();
        if (network.connected && !network.room && !enteredLanRoom && (lanAction === 'host' || lanAction === 'join' && /^\d{6}$/.test(roomCode))) {
          enteredLanRoom = true;
          if (lanAction === 'host') network.create(); else network.join(roomCode);
        }
        if (!network.room || ticket !== revision) return;
        // Transfer the existing socket and seat; opening another connection would
        // lose the room membership and its reconnect token.
        abort.abort(); shell.remove(); disposeGame = undefined;
        void navigate(target, true, network);
      };
      disposeMenu?.(); disposeMenu = undefined;
      document.dispatchEvent(new Event('midline:boot-ready'));
      return;
    }
    const three = target.pathname.endsWith('/three.html') || target.searchParams.get('renderer') === 'three';
    if (ticket !== revision) return;
    if (three || !target.searchParams.has('map')) target.searchParams.set('map', 'howling');
    if (three && !target.searchParams.has('scene')) target.searchParams.set('scene', 'match');
    history.replaceState(null, '', target);
    const module = three ? await import('./main-three') : await import('./main');
    if (ticket !== revision) return;
    // Keep the document and its fullscreen root alive throughout mode changes.
    for (const node of document.querySelectorAll('body > .app-shell, body > main.match-shell')) node.remove();
    document.body.classList.remove('three-ui', 'league-ui', 'pixel-hud');
    if (three) document.body.classList.add('three-ui');
    const template = document.createElement('template'); template.innerHTML = templates.get(three)!;
    document.body.append(template.content);
    disposeGame = 'bootThree' in module ? module.bootThree(lobbyHost) : module.bootLegacy();
    if (!three) document.getElementById('start-button')?.click();
    const graphics = document.getElementById('graphics-settings') ?? document.querySelector<HTMLElement>('.match-shell')!;
    disposeFullscreen = mountFullscreen(graphics, document.querySelector<HTMLButtonElement>('#fullscreen'));
    const back = document.createElement('a'); back.className = 'start-return'; back.textContent = '‹ 返回主菜单';
    const home = new URL(location.href); home.searchParams.delete('online'); back.href = home.href;
    (document.querySelector('.hud-menu-content') ?? document.querySelector('.match-shell'))?.append(back);
    document.body.classList.remove('launcher-pending');
    disposeMenu?.(); disposeMenu = undefined;
    document.dispatchEvent(new Event('midline:boot-ready'));
  } catch (cause) {
    lobbyHost?.leave(); lobbyHost?.dispose();
    if (ticket !== revision) return;
    document.body.classList.add('launcher-pending');
    const screen = document.querySelector('.start-screen') ?? document.body.appendChild(document.createElement('main'));
    screen.classList.add('start-screen');
    const message = document.createElement('p'); message.role = 'alert';
    message.textContent = `游戏加载失败：${cause instanceof Error ? cause.message : String(cause)}。请刷新重试。`;
    screen.append(message); document.dispatchEvent(new Event('midline:boot-ready'));
  }
}

// Internal links switch views without navigating away from fullscreen.
document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
  const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
  if (!link || link.target || link.hasAttribute('download')) return;
  const target = new URL(link.href);
  if (target.origin !== location.origin || !/\/(?:index\.html|three\.html)?$/.test(target.pathname)) return;
  event.preventDefault();
  void navigate(target, link.hasAttribute('data-game-entry'));
});
window.addEventListener('pagehide', () => { disposeGame?.(true); disposeMenu?.(); disposeFullscreen?.(); });
document.addEventListener('midline:retry-game', () => { void navigate(new URL(location.href), true); });
const initial = new URL(location.href);
void navigate(initial, initial.searchParams.get('launch') === '1');
