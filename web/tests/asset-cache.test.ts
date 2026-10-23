import { afterEach, expect, test } from 'vitest';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer, preview, type ViteDevServer, type PreviewServer } from 'vite';
import { assetCache } from '../scripts/asset-cache';

let root = '';
let server: ViteDevServer | undefined;
let built: PreviewServer | undefined;
afterEach(async () => {
  await server?.close(); server = undefined;
  if (built) { const value = built; await new Promise<void>(resolve => value.httpServer.close(() => resolve())); built = undefined; }
  if (root) await rm(root, { recursive: true, force: true });
});

test('media has stable versions, strong cache headers, validation and safe updates', async () => {
  root = await mkdtemp(join(tmpdir(), 'midline-cache-'));
  const file = join(root, 'image.png');
  await writeFile(file, 'first-image');
  await writeFile(join(root, 'index.html'), '<h1>cache fixture</h1>');
  server = await createServer({ root, configFile: false, plugins: [assetCache()], server: { port: 0, host: '127.0.0.1' } });
  await server.listen();
  const address = server.httpServer!.address();
  if (!address || typeof address === 'string') throw new Error('Test server has no TCP address');
  const origin = `http://127.0.0.1:${address.port}/`;
  const assetUrl = async () => {
    const response = await fetch(`${origin}image.png?url&import`);
    expect(response.headers.get('cache-control')).not.toContain('immutable');
    const code = await response.text();
    return JSON.parse(code.match(/export default ("[^"]+")/)![1]) as string;
  };
  const url = await assetUrl();
  expect(url).toMatch(/\/image\.png\?assetv=[a-f0-9]{16}$/);
  expect(await assetUrl()).toBe(url);
  const response = await fetch(new URL(url, origin));
  expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  expect(await response.text()).toBe('first-image');
  const etag = response.headers.get('etag')!;
  expect(etag).toBeTruthy();
  const validation = await fetch(new URL(url, origin), { headers: { 'If-None-Match': etag } });
  expect(validation.status).toBe(304);
  const unversioned = await fetch(`${origin}image.png`);
  expect(unversioned.headers.get('cache-control')).toBe('no-cache');
  const html = await fetch(origin);
  expect(html.headers.get('cache-control')).not.toContain('immutable');
  await writeFile(file, 'second-image-with-new-content');
  server.moduleGraph.invalidateAll();
  const changed = await assetUrl();
  expect(changed).not.toBe(url);
  expect(await (await fetch(new URL(changed, origin))).text()).toBe('second-image-with-new-content');
  const missing = await fetch(`${origin}missing.png?assetv=abc`, { headers: { Accept: 'image/png' } });
  expect(missing.status).toBe(404);
  expect(missing.headers.get('cache-control') ?? '').not.toContain('immutable');
});

test('preview caches hashed bundles but revalidates HTML and unversioned media', async () => {
  root = await mkdtemp(join(tmpdir(), 'midline-preview-cache-'));
  const { mkdir } = await import('node:fs/promises');
  await mkdir(join(root, 'assets'));
  await writeFile(join(root, 'index.html'), '<h1>preview fixture</h1>');
  await writeFile(join(root, 'assets', 'image-Ab12cd34.png'), 'hashed-image');
  await writeFile(join(root, 'assets', 'app-Ab12cd34.js'), 'export default 1');
  await writeFile(join(root, 'image.png'), 'unversioned-image');
  built = await preview({ root, configFile: false, plugins: [assetCache()], build: { outDir: '.' }, preview: { port: 0, host: '127.0.0.1' } });
  const address = built.httpServer.address();
  if (!address || typeof address === 'string') throw new Error('Preview server has no TCP address');
  const origin = `http://127.0.0.1:${address.port}/`;
  for (const path of ['assets/image-Ab12cd34.png', 'assets/app-Ab12cd34.js']) {
    expect((await fetch(new URL(path, origin))).headers.get('cache-control')).toContain('immutable');
  }
  expect((await fetch(new URL('image.png', origin))).headers.get('cache-control')).toBe('no-cache');
  expect((await fetch(origin)).headers.get('cache-control')).not.toContain('immutable');
});


