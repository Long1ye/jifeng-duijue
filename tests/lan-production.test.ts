import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { WebSocket } from 'ws';
import { startProductionServer } from '../server/production';
import { isLanAddress, parseLanHost } from '../server/lan-address';
import { PROTOCOL_VERSION } from '../src/network/protocol';

const services: Awaited<ReturnType<typeof startProductionServer>>[] = [];
const roots: string[] = [];
const root = () => { const dir = mkdtempSync(join(tmpdir(), 'jifeng-lan-')); roots.push(dir); writeFileSync(join(dir, 'three.html'), '<title>疾风对决</title>'); writeFileSync(join(dir, 'music.mp3'), '0123456789'); return dir; };
afterEach(async () => { await Promise.all(services.splice(0).map(s => s.close())); for (const dir of roots.splice(0)) rmSync(dir, { recursive: true }); });

describe('LAN desktop distribution', () => {
  it('accepts private literal addresses and rejects public or executable URL inputs', () => {
    for (const value of ['10.1.2.3', '172.16.0.1', '172.31.255.254', '192.168.1.2', '127.0.0.1', '169.254.1.1', '::ffff:192.168.1.2']) expect(isLanAddress(value)).toBe(true);
    for (const value of ['8.8.8.8', '172.15.0.1', '172.32.0.1', '192.168.1.999', 'example.com', '0.0.0.0']) expect(isLanAddress(value)).toBe(false);
    expect(parseLanHost('192.168.1.20')).toBe('http://192.168.1.20:5180');
    expect(parseLanHost(' http://10.1.2.3:5190/ ')).toBe('http://10.1.2.3:5190');
    for (const value of ['https://192.168.1.2', 'http://8.8.8.8', 'file:///secret', '192.168.1.2:0', '192.168.1.2:65536', '192.168.1.2@8.8.8.8', '192.168.1.2/path', 'localhost', '192.168.1.2?x=1']) expect(() => parseLanHost(value)).toThrow();
  });
  it('serves the standalone game, version handshake and audio range without Vite', async () => {
    const service = await startProductionServer({ root: root(), version: '0.1.0' }); services.push(service);
    expect(await (await fetch(service.origin)).text()).toContain('疾风对决');
    expect(await (await fetch(service.origin + '/api/lan-info')).json()).toEqual({ game: 'jifeng-duijue', version: '0.1.0', protocol: PROTOCOL_VERSION, lan: false });
    const audio = await fetch(service.origin + '/music.mp3', { headers: { Range: 'bytes=2-5' } });
    expect(audio.status).toBe(206); expect(audio.headers.get('Content-Range')).toBe('bytes 2-5/10'); expect(await audio.text()).toBe('2345');
    const suffix = await fetch(service.origin + '/music.mp3', { headers: { Range: 'bytes=-3' } }); expect(await suffix.text()).toBe('789');
    expect((await fetch(service.origin + '/music.mp3', { headers: { Range: 'bytes=100-' } })).status).toBe(416);
    expect((await fetch(service.origin + '/missing.png')).status).toBe(404);
    expect((await fetch(service.origin + '/%2e%2e%5cpackage.json')).status).toBe(403);
    const socket = new WebSocket(service.origin.replace('http', 'ws') + '/battle');
    await new Promise<void>(resolve => socket.once('error', () => resolve()));
    expect(socket.readyState).not.toBe(WebSocket.OPEN);
  });
  it('runs two LAN peers through room creation, joining and shutdown', async () => {
    const service = await startProductionServer({ root: root(), version: '0.1.0', lan: true, port: 0 }); services.push(service);
    const connect = async () => { const socket = new WebSocket(service.origin.replace('http', 'ws') + '/battle', { origin: service.origin }); await new Promise<void>(resolve => socket.once('open', resolve)); return socket; };
    const a = await connect(), b = await connect();
    const welcome = (socket: WebSocket) => new Promise<{ code: string; team: string }>(resolve => socket.on('message', data => { const message = JSON.parse(data.toString()); if (message.type === 'welcome') resolve(message); }));
    const first = welcome(a); a.send(JSON.stringify({ type: 'create', version: PROTOCOL_VERSION })); const blue = await first; expect(blue.team).toBe('blue');
    const second = welcome(b); b.send(JSON.stringify({ type: 'join', code: blue.code, version: PROTOCOL_VERSION })); expect((await second).team).toBe('red');
    expect((await (await fetch(service.origin + '/api/lan-info')).json()).lan).toBe(true);
    await service.close(); expect(service.server.listening).toBe(false);
  });
  it('rejects WebSocket origins from unrelated pages', async () => {
    const service = await startProductionServer({ root: root(), version: '0.1.0', lan: true, port: 0 }); services.push(service);
    const socket = new WebSocket(service.origin.replace('http', 'ws') + '/battle', { origin: 'http://unrelated.example' });
    await new Promise<void>(resolve => socket.once('error', () => resolve())); expect(socket.readyState).not.toBe(WebSocket.OPEN);
  });
});
