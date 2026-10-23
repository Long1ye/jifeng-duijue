import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

/** Extract only the mounted UI, excluding document head and boot scripts. */
export function extractGameShell(html: string, className: string): string {
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>|<\/?([a-z][\w:-]*)\b(?:"[^"]*"|'[^']*'|[^'">])*>/gi;
  let start = -1, root = '', depth = 0;
  for (const match of html.matchAll(tokens)) {
    const token = match[0], tag = match[2]?.toLowerCase();
    if (!tag) continue;
    const closing = token.startsWith('</');
    if (start < 0) {
      const classes = token.match(/\bclass\s*=\s*["']([^"']*)["']/i)?.[1].split(/\s+/) ?? [];
      if (closing || !classes.includes(className)) continue;
      start = match.index!; root = tag;
    }
    if (tag !== root || token.endsWith('/>')) continue;
    depth += closing ? -1 : 1;
    if (depth === 0) {
      const shell = html.slice(start, match.index! + token.length);
      if (/<script\b/i.test(shell)) throw new Error('Game shell must not contain executable scripts');
      return shell;
    }
  }
  throw new Error(`Missing game shell: ${className}`);
}

export function gameShell(): Plugin {
  return {
    name: 'midline-game-shell', enforce: 'pre',
    async load(id) {
      const [file, query = ''] = id.split('?');
      if (!new URLSearchParams(query).has('game-shell')) return null;
      const html = await readFile(file, 'utf-8');
      const shell = extractGameShell(html, file.replaceAll('\\', '/').endsWith('/three.html') ? 'match-shell' : 'app-shell');
      this.addWatchFile(file);
      return `export default ${JSON.stringify(shell)};`;
    },
  };
}
