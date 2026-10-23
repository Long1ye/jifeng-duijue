import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { extractGameShell } from '../scripts/game-shell';

describe('minimal game UI templates', () => {
  it.each([['index.html', 'app-shell'], ['three.html', 'match-shell']])('preserves the %s UI without boot scripts or document metadata', (file, root) => {
    const html = readFileSync(file, 'utf-8'), shell = extractGameShell(html, root);
    expect(shell).toContain(`class="${root}"`);
    expect(shell).not.toMatch(/<script\b|<head\b|<body\b|<!doctype|boot-screen/i);
    if (root === 'app-shell') for (const name of ['scoreboard', 'player-hud', 'target-readout', 'match-overlay']) expect(shell).toContain(name);
    else for (const id of ['viewport', 'performance-mode', 'quality', 'scenario']) expect(shell).toContain(`id="${id}"`);
  });
  it('handles nested containers, ignores comments and rejects executable template content', () => {
    expect(extractGameShell('<head><script>"<div>"</script></head><div class="app-shell"><!-- </div> --><div title=">">ok</div></div><script>x()</script>', 'app-shell'))
      .toBe('<div class="app-shell"><!-- </div> --><div title=">">ok</div></div>');
    expect(() => extractGameShell('<div class="app-shell"><script>x()</script></div>', 'app-shell')).toThrow('executable scripts');
    expect(() => extractGameShell('<div>missing</div>', 'app-shell')).toThrow('Missing game shell');
  });
});
