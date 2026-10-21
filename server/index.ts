// Select the map before loading any simulation modules or their constants.
export {};
(globalThis as typeof globalThis & { __MIDLINE_MAP__?: string }).__MIDLINE_MAP__ = 'howling';
const { startServer } = await import('./server');
await startServer();
