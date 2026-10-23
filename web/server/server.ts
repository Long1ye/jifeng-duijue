import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { BattleRooms } from './rooms';

export async function startServer(options: { isolatedValidation?: boolean } = {}) {
  const port = Number(process.env.PORT || 5180);
  const server = createServer();
  const vite = await createViteServer({
    ...(options.isolatedValidation ? { configFile: false, cacheDir: '.cache/public-network-vite' } : {}),
    server: { middlewareMode: true, ws: { server },
      ...(options.isolatedValidation ? { watch: null, hmr: false } : {}) }, appType: 'mpa',
  });
  server.on('request', (req, res) => vite.middlewares(req, res));
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const rooms = new BattleRooms(wss);
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/battle') return; // Vite handles its own HMR upgrades.
    // Browsers connect to the authority that served their page.
    try {
      if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { socket.destroy(); return; }
    } catch { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '0.0.0.0', resolve); });
  const hosts = ['127.0.0.1', ...Object.values(networkInterfaces()).flatMap(list => (list ?? []).filter(item => item.family === 'IPv4' && !item.internal).map(item => item.address))];
  console.log('\n双人对战服务已启动。两台电脑打开同一个局域网地址：');
  for (const host of hosts) console.log(`  http://${host}:${port}/three.html?map=howling&scene=match&online=1`);
  const close = async () => { rooms.dispose(); await vite.close(); server.close(); };
  process.once('SIGINT', () => { void close(); }); process.once('SIGTERM', () => { void close(); });
  return { server, rooms, close };
}
