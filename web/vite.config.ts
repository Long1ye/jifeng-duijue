import { defineConfig } from 'vitest/config';
import { assetCache } from './scripts/asset-cache';

export default defineConfig({
  base: './',
  plugins: [assetCache()],
  server: { port: 5173, strictPort: true },
  build: {
    chunkSizeWarningLimit: 1500,
    rolldownOptions: { input: { game: 'index.html', three: 'three.html', nailongPreview: 'assets/heroes/nailong/index.html' } },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
});
