import { _electron as electron } from 'file:///C:/Users/PC/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const output = path.join(root, 'audit/desktop-'+pkg.version);
await fs.mkdir(output, { recursive: true });
const executablePath = process.env.JIFENG_SMOKE_EXE || path.join(root, 'release/疾风对决-'+pkg.version+'-win32-x64/疾风对决.exe');
const errors = [], failed = [], apps = [];
const env = { ...process.env, PATH: process.env.SystemRoot + '\\System32;' + process.env.SystemRoot }; delete env.ELECTRON_RUN_AS_NODE;
const launch = async name => {
  const app = await electron.launch({ executablePath, env: { ...env, JIFENG_TEST_PROFILE: path.join(root, '.cache/desktop-test', name) }, timeout: 60000 });
  apps.push(app);
  app.on('window', page => {
    page.on('pageerror', error => errors.push({ instance: name, error: error.message }));
    page.on('response', response => { if (response.status() >= 400) failed.push({ instance: name, status: response.status(), url: response.url() }); });
  });
  const launcher = await app.firstWindow(); await launcher.waitForSelector('#host');
  return { app, launcher };
};
let report = {};
try {
  const host = await launch('host');
  await host.launcher.screenshot({ path: path.join(output, 'launcher.png') });
  const firstGame = host.app.waitForEvent('window'); await host.launcher.click('#host'); const hostGame = await firstGame;
  await hostGame.waitForFunction(() => /^\d{6}$/.test(document.querySelector('[data-code]')?.textContent ?? ''), {}, { timeout: 90000 });
  const code = await hostGame.locator('[data-code]').textContent();
  await host.launcher.waitForSelector('.address-row code');
  const address = await host.launcher.locator('.address-row code').first().textContent();
  const guest = await launch('guest');
  await guest.launcher.fill('#address', address); await guest.launcher.fill('#room', code);
  const secondGame = guest.app.waitForEvent('window'); await guest.launcher.click('#join'); const guestGame = await secondGame;
  await Promise.all([hostGame, guestGame].map(page => page.waitForFunction(() => {
    const button = document.querySelector('[data-ready]'); return !!button && !button.disabled;
  }, {}, { timeout: 120000 })));
  const security = await guest.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().map(w => ({ url: w.webContents.getURL(), preferences: ((p) => ({ nodeIntegration: p.nodeIntegration, contextIsolation: p.contextIsolation, sandbox: p.sandbox, preload: p.preload }))(w.webContents.getLastWebPreferences()) })));
  await hostGame.click('[data-ready]'); await guestGame.click('[data-ready]');
  await Promise.all([hostGame, guestGame].map(page => page.waitForFunction(() => document.querySelector('.battle-lobby')?.hidden && !document.querySelector('.battle-badge')?.hidden, {}, { timeout: 30000 })));
  await new Promise(resolve => setTimeout(resolve, 2500));
  await hostGame.screenshot({ path: path.join(output, 'host-playing.jpg') });
  await guestGame.screenshot({ path: path.join(output, 'guest-playing.jpg') });
  const gameInfo = await Promise.all([hostGame, guestGame].map(async page => ({ url: page.url(), team: await page.locator('[data-team]').textContent(), playing: await page.locator('.battle-lobby').evaluate(el => el.hidden), badge: await page.locator('.battle-badge span').textContent(), canvasCount: await page.locator('canvas').count() })));
  await guestGame.reload();
  await guestGame.locator('.start-play').click();
  await guestGame.waitForFunction(() => document.querySelector('.battle-lobby')?.hidden && !document.querySelector('.battle-badge')?.hidden, {}, { timeout: 120000 });
  // Host shutdown must close sockets and make a new handshake fail.
  await host.app.close(); apps.splice(apps.indexOf(host.app), 1);
  await guestGame.waitForFunction(() => document.querySelector('.battle-message')?.textContent?.includes('连接已断开'), {}, { timeout: 15000 });
  let stopped = false;
  try { await fetch('http://' + address + '/api/lan-info', { signal: AbortSignal.timeout(2000) }); } catch { stopped = true; }
  if (!stopped) throw new Error('Host service remained open after quitting');
  const soloWindow = guest.app.waitForEvent('window'); await guest.launcher.click('#solo'); const solo = await soloWindow;
  await solo.locator('.start-play').click();
  await solo.waitForFunction(() => !document.querySelector('.asset-loading') && !!document.querySelector('#viewport canvas'), {}, { timeout: 90000 });
  await solo.screenshot({ path: path.join(output, 'solo-playing.jpg') });
  report = { executablePath, nodeExcludedFromPath: true, address, code, gameInfo, security, guestReloadResumed: true, hostQuitClosedService: stopped, soloLoaded: true, errors, failed };
  if (errors.length || failed.length) throw new Error('Browser errors or failed resources');
} catch (error) {
  report = { ...report, error: error.stack, errors, failed };
  for (let index=0; index<apps.length; index++) for (const [i, page] of apps[index].windows().entries()) await page.screenshot({ path: path.join(output, `failure-${index}-${i}.png`) }).catch(() => {});
  process.exitCode = 1;
} finally {
  await Promise.allSettled(apps.map(app => app.close()));
  await fs.writeFile(path.join(output, 'smoke-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
