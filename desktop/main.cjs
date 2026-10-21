const { app, BrowserWindow, Menu, ipcMain, clipboard, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');
const { start } = require('./server.cjs');
const { parseLanHost } = require('./lan-address.cjs');

if (process.env.JIFENG_TEST_PROFILE) app.setPath('userData', path.resolve(process.env.JIFENG_TEST_PROFILE));
const root = app.getAppPath();
const version = app.getVersion();
const gameIcon = path.join(__dirname, 'icon.ico');
const launcherUrl = pathToFileURL(path.join(__dirname, 'launcher.html')).href;
let launcher, game, localService, hostService, operation = false, exiting = false;

function protect(window, origin) {
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', (event, url) => {
    try { if (origin === 'launcher' ? url !== launcherUrl : new URL(url).origin !== origin) event.preventDefault(); }
    catch { event.preventDefault(); }
  });
  window.webContents.on('will-attach-webview', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_contents, permission, callback) => callback(permission === 'fullscreen'));
}
function showLauncher() {
  if (launcher && !launcher.isDestroyed()) { launcher.show(); launcher.focus(); return; }
  launcher = new BrowserWindow({ width: 1060, height: 840, minWidth: 820, minHeight: 700, title: '疾风对决 · 局域网', icon: gameIcon, backgroundColor: '#09151f', show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false },
  });
  protect(launcher, 'launcher'); launcher.once('ready-to-show', () => launcher.show());
  launcher.on('closed', () => { launcher = undefined; });
  launcher.loadFile(path.join(__dirname, 'launcher.html'));
}
async function openGame(origin, action, code) {
  if (game && !game.isDestroyed()) game.close();
  const url = new URL('/three.html?map=howling&scene=match', origin);
  if (action !== 'solo') { url.searchParams.set('online', '1'); url.searchParams.set('launch', '1'); url.searchParams.set('lanAction', action); if (code) url.searchParams.set('roomCode', code); }
  game = new BrowserWindow({ width: 1440, height: 960, minWidth: 960, minHeight: 640, title: '疾风对决', icon: gameIcon, backgroundColor: '#08121c', show: false,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, autoplayPolicy: 'user-gesture-required' },
  });
  const window = game;
  protect(window, origin);
  window.setMenu(Menu.buildFromTemplate([
    { label: '游戏', submenu: [{ label: '返回启动器', click: showLauncher }, { label: '关闭游戏窗口', role: 'close' }] },
    { label: '显示', submenu: [{ label: '切换全屏', role: 'togglefullscreen' }, { label: '重新加载', role: 'reload' }] },
  ]));
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { if (game === window) game = undefined; if (!exiting) showLauncher(); });
  try { await window.loadURL(url.href); }
  catch { if (!window.isDestroyed()) window.close(); throw new Error('无法打开主机游戏页面，请确认主机仍在运行、地址正确且防火墙允许专用网络。'); }
}
async function stopHost() {
  if (game && !game.isDestroyed()) game.close();
  if (hostService) { const service = hostService; hostService = undefined; await service.close(); }
}
const info = () => ({ version, hosting: !!hostService, port: hostService?.port, addresses: hostService?.addresses ?? [] });
function register(channel, callback) {
  ipcMain.handle(channel, async (event, ...args) => {
    if (!launcher || event.sender !== launcher.webContents || event.senderFrame?.url !== launcherUrl) throw new Error('非法调用');
    if (operation) return { ok: false, error: '正在处理上一项操作，请稍候。' };
    operation = true;
    try { return { ok: true, data: await callback(...args) }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : String(error) }; }
    finally { operation = false; }
  });
}
register('lan:info', info);
register('lan:host', async () => {
  if (hostService && game && !game.isDestroyed()) { game.show(); game.focus(); return info(); }
  if (!hostService) hostService = await start({ root: path.join(root, 'dist'), version, lan: true });
  await openGame(hostService.origin, 'host'); return info();
});
register('lan:stop', async () => { await stopHost(); return info(); });
register('lan:solo', async () => {
  await stopHost();
  if (!localService) localService = await start({ root: path.join(root, 'dist'), version });
  await openGame(localService.origin, 'solo'); return info();
});
register('lan:join', async (input, code) => {
  if (typeof input !== 'string' || typeof code !== 'string' || !/^\d{6}$/.test(code)) throw new Error('请输入主机地址和六位房间码。');
  const origin = parseLanHost(input);
  let response;
  try { response = await fetch(origin + '/api/lan-info', { signal: AbortSignal.timeout(5000), redirect: 'error' }); }
  catch { throw new Error('未找到主机。请确认两台电脑在同一局域网、主机正在主持，且防火墙允许专用网络。'); }
  if (!response.ok) throw new Error('主机未就绪，请确认地址及端口。');
  let remote;
  try { remote = await response.json(); } catch { throw new Error('该地址不是疾风对决主机。'); }
  // Keep package version and wire protocol aligned before downloading assets.
  const { PROTOCOL_VERSION } = require('./protocol.cjs');
  if (remote.game !== 'jifeng-duijue' || !remote.lan) throw new Error('该地址不是正在主持的疾风对决主机。');
  if (remote.version !== version || remote.protocol !== PROTOCOL_VERSION) throw new Error(`版本不一致：本机 ${version}，主机 ${String(remote.version)}。请使用同一版本游戏包。`);
  await stopHost(); await openGame(origin, 'join', code); return info();
});
register('lan:copy', address => {
  if (typeof address !== 'string' || !hostService?.addresses.includes(address)) throw new Error('无效的主机地址。');
  clipboard.writeText(address); return info();
});

app.whenReady().then(() => { Menu.setApplicationMenu(null); showLauncher(); });
app.on('activate', showLauncher);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', event => {
  if (exiting) return;
  event.preventDefault(); exiting = true;
  Promise.allSettled([hostService?.close(), localService?.close()]).finally(() => app.quit());
});
process.on('uncaughtException', error => {
  try { fs.appendFileSync(path.join(app.getPath('userData'), 'error.log'), `${new Date().toISOString()} ${error.stack}\n`); } catch {}
  dialog.showErrorBox('疾风对决启动失败', error.message);
  app.quit();
});
