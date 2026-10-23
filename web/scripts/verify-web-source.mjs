import { readdirSync, readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, '../疾风对决');
const files = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const path = resolve(directory, entry.name);
  return entry.isDirectory() ? files(path) : [path];
});
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const expectedChanges = new Set(['src/launch.ts', 'src/network/Lobby.ts', 'src/game/Match.ts', 'src/ui/StartScreen.ts', 'src/ui/start-screen.css', 'tests/match.test.ts', 'tests/map.test.ts']);
const report = { source, target: root, assets: [], sourceChanges: [], missing: [], unexpectedChanges: [] };
for (const section of ['assets', 'src', 'tests', 'server']) {
  for (const original of files(resolve(source, section))) {
    const path = relative(source, original).replaceAll('\\', '/');
    const copy = resolve(root, path);
    if (!existsSync(copy)) { report.missing.push(path); continue; }
    const sha256 = hash(original);
    const copyHash = hash(copy);
    if (section === 'assets') report.assets.push({ path, bytes: readFileSync(copy).length, sha256, matches: sha256 === copyHash });
    if (sha256 !== copyHash) {
      report.sourceChanges.push(path);
      if (!expectedChanges.has(path)) report.unexpectedChanges.push(path);
    }
  }
}
report.assetCount = report.assets.length;
report.assetBytes = report.assets.reduce((total, asset) => total + asset.bytes, 0);
report.passed = !report.missing.length && !report.unexpectedChanges.length && report.assets.every(asset => asset.matches);
mkdirSync(resolve(root, 'audit'), { recursive: true });
writeFileSync(resolve(root, 'audit/web-source-verification.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ assetCount: report.assetCount, assetBytes: report.assetBytes, sourceChanges: report.sourceChanges, missing: report.missing, unexpectedChanges: report.unexpectedChanges, passed: report.passed }, null, 2));
if (!report.passed) process.exitCode = 1;
