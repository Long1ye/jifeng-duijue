// Choose the same simulation map as the packaged desktop game before imports.
export {};
(globalThis as typeof globalThis & { __MIDLINE_MAP__?: string }).__MIDLINE_MAP__ = 'howling';
const { fileURLToPath } = await import('node:url');
const { startProductionServer } = await import('./production');
const host = await startProductionServer({
  root: fileURLToPath(new URL(process.argv.includes('--platform') ? '../dist-platform/' : '../dist/', import.meta.url)),
  version: '0.1.4',
  lan: true,
  ...(process.env.PORT ? { port: Number(process.env.PORT) } : {}),
});
console.log(`疾风对决网页版：${host.origin}/`);
for (const address of host.addresses) console.log(`局域网好友打开：http://${address}/`);
const close = () => { void host.close(); };
process.once('SIGINT', close);
process.once('SIGTERM', close);
