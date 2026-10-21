// Must execute before requiring the bundled simulation's module graph.
(globalThis as typeof globalThis & { __MIDLINE_MAP__?: string }).__MIDLINE_MAP__ = 'howling';
export async function start(options: import('../server/production').ProductionOptions) {
  const { startProductionServer } = await import('../server/production');
  return startProductionServer(options);
}
