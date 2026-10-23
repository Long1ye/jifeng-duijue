import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { resolve, sep, extname } from 'node:path';
import { networkInterfaces } from 'node:os';
import type { AddressInfo } from 'node:net';
import { WebSocketServer } from 'ws';
import { BattleRooms } from './rooms';
import { PROTOCOL_VERSION } from '../src/network/protocol';
import { isLanAddress } from './lan-address';

const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2' };
export interface ProductionOptions { root: string; version: string; lan?: boolean; port?: number }

export async function startProductionServer(options: ProductionOptions) {
  const root = resolve(options.root);
  const lan = options.lan ?? false;
  if (!existsSync(resolve(root, 'three.html'))) throw new Error('游戏文件不完整，请重新解压完整游戏包。');
  const allowed = (req: IncomingMessage) => !!req.socket.remoteAddress && isLanAddress(req.socket.remoteAddress);
  const serve = (req: IncomingMessage, res: ServerResponse) => {
    const fail = (status: number, message: string) => { res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' }); res.end(message); };
    if (!allowed(req)) { fail(403, '仅允许局域网访问'); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { fail(405, 'Method not allowed'); return; }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname); }
    catch { fail(400, 'Bad request'); return; }
    if (pathname === '/api/lan-info') {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ game: 'jifeng-duijue', version: options.version, protocol: PROTOCOL_VERSION, lan })); return;
    }
    if (pathname.includes('\0') || pathname.includes('\\')) { fail(403, 'Forbidden'); return; }
    const file = resolve(root, '.' + (pathname === '/' ? '/three.html' : pathname));
    if (!file.startsWith(root + sep)) { fail(403, 'Forbidden'); return; }
    let size: number;
    try { const stat = statSync(file); if (!stat.isFile()) { fail(404, 'Not found'); return; } size = stat.size; }
    catch { fail(404, 'Not found'); return; }
    const headers: Record<string, string | number> = { 'Content-Type': mime[extname(file)] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Accept-Ranges': 'bytes', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' };
    let start = 0, end = size - 1, status = 200;
    if (req.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!range || !range[1] && !range[2]) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
      if (start > end || start >= size) { res.writeHead(416, { 'Content-Range': `bytes */${size}` }); res.end(); return; }
      status = 206; headers['Content-Range'] = `bytes ${start}-${end}/${size}`;
    }
    headers['Content-Length'] = Math.max(0, end - start + 1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || size === 0) { res.end(); return; }
    const stream = createReadStream(file, { start, end });
    stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
  };
  const server = createServer(serve);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8192 });
  const rooms = new BattleRooms(wss);
  server.on('upgrade', (req, socket, head) => {
    if (!lan || !allowed(req) || req.url !== '/battle') { socket.destroy(); return; }
    try { if (req.headers.origin && new URL(req.headers.origin).host !== req.headers.host) { socket.destroy(); return; } }
    catch { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
  });
  let port = options.port ?? (lan ? 5180 : 0);
  try {
    for (;;) {
      try {
        await new Promise<void>((done, reject) => {
          const error = (cause: Error) => { server.off('listening', listening); reject(cause); };
          const listening = () => { server.off('error', error); done(); };
          server.once('error', error); server.once('listening', listening); server.listen(port, lan ? '0.0.0.0' : '127.0.0.1');
        }); break;
      } catch (cause) {
        if (options.port === undefined && lan && (cause as NodeJS.ErrnoException).code === 'EADDRINUSE' && port < 5190) { port++; continue; }
        throw cause;
      }
    }
  } catch (cause) { rooms.dispose(); server.close(); throw cause; }
  port = (server.address() as AddressInfo).port;
  const addresses = Object.values(networkInterfaces()).flatMap(list => (list ?? []).filter(n => n.family === 'IPv4' && !n.internal && isLanAddress(n.address)).map(n => `${n.address}:${port}`));
  let closed = false;
  return { server, rooms, port, addresses: [...new Set(addresses)], origin: `http://127.0.0.1:${port}`,
    close: async () => { if (closed) return; closed = true; rooms.dispose(); server.closeAllConnections(); await new Promise<void>(done => server.close(() => done())); },
  };
}
