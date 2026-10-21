import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { isAbsolute, relative } from 'node:path';
import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

const media = /\.(?:png|jpe?g|webp|gif|svg|avif|ico|mp3|ogg|wav|m4a|mp4|webm|woff2?)$/i;
const immutable = 'public, max-age=31536000, immutable';

/** Cache media on ordinary HTTP LAN hosts too; no service worker or HTTPS needed. */
export function assetCache(): Plugin {
  let server: ViteDevServer | undefined;
  const versions = new Map<string, { stamp: string; hash: string }>();
  const headers = (preview: boolean) => (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const importedModule = url.searchParams.has('import') || url.searchParams.has('url') || url.searchParams.has('raw');
    const resource = !importedModule && media.test(url.pathname);
    const built = preview && /\/assets\/[^/]+-[\w-]{8,}\.[\w]+$/i.test(url.pathname);
    if (resource || built) {
      // Apply at commit time: Vite's static middleware sets its own max-age first.
      const writeHead = res.writeHead;
      res.writeHead = function (this: ServerResponse, ...args: Parameters<typeof writeHead>) {
        if ([200, 206, 304].includes(args[0])) {
          const policy = built || url.searchParams.has('assetv') ? immutable : 'no-cache';
          // Static middleware may pass headers directly to writeHead as well.
          const supplied = args.find((arg, index) => index > 0 && typeof arg === 'object');
          if (supplied && !Array.isArray(supplied)) {
            const values = supplied as OutgoingHttpHeaders;
            const contentType = Object.entries(values).find(([key]) => key.toLowerCase() === 'content-type')?.[1] ?? this.getHeader('Content-Type');
            if (String(contentType).includes('text/html')) return writeHead.apply(this, args);
            for (const key of Object.keys(values)) if (key.toLowerCase() === 'cache-control') delete values[key];
            values['Cache-Control'] = policy;
          } else if (Array.isArray(supplied)) {
            for (let i = 0; i < supplied.length; i += 2) if (String(supplied[i]).toLowerCase() === 'cache-control') supplied[i + 1] = policy;
          }
          this.setHeader('Cache-Control', policy);
        }
        return writeHead.apply(this, args);
      } as typeof writeHead;
    }
    next();
  };
  return {
    name: 'midline-asset-cache',
    enforce: 'pre',
    configureServer(value) { server = value; value.middlewares.use(headers(false)); },
    configurePreviewServer(value) { value.middlewares.use(headers(true)); },
    async load(id) {
      if (!server) return null; // Builds already produce content-hashed asset names.
      const [file, query = ''] = id.split('?');
      const params = new URLSearchParams(query);
      if (!params.has('url') || params.has('raw') || params.has('inline') || !media.test(file)) return null;
      const path = relative(server.config.root, file).replaceAll('\\', '/');
      if (path.startsWith('../') || isAbsolute(path)) return null;
      const info = await stat(file);
      const stamp = `${info.mtimeMs}:${info.ctimeMs}:${info.size}`;
      let version = versions.get(file);
      if (version?.stamp !== stamp) {
        version = { stamp, hash: createHash('sha256').update(await readFile(file)).digest('hex').slice(0, 16) };
        versions.set(file, version);
      }
      this.addWatchFile(file);
      const url = `${server.config.base}${path.split('/').map(encodeURIComponent).join('/')}?assetv=${version.hash}`;
      return `export default ${JSON.stringify(url)};`;
    },
  };
}
