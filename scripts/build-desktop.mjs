import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { packager } from '@electron/packager';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
const stage = path.join(root, '.cache/desktop-app');
const release = path.join(root, 'release');
const resolveInside = relative => {
  const result = path.resolve(root, relative);
  if (!result.startsWith(root + path.sep)) throw new Error('Build path escapes project');
  return result;
};
await fs.mkdir(stage, { recursive: true });
// Recreate only this build's staging directory, never the original project.
await fs.rm(resolveInside('.cache/desktop-app'), { recursive: true, force: true });
await fs.mkdir(path.join(stage, 'desktop'), { recursive: true });
await fs.cp(path.join(root, 'dist'), path.join(stage, 'dist'), { recursive: true });
for (const name of ['main.cjs', 'preload.cjs', 'launcher.html', 'launcher.css', 'launcher.js', 'icon.ico', 'icon-256.png']) await fs.copyFile(path.join(root, 'desktop', name), path.join(stage, 'desktop', name));
await fs.writeFile(path.join(stage, 'package.json'), JSON.stringify({ name: pkg.name, version: pkg.version, productName: '疾风对决', private: true, main: 'desktop/main.cjs' }, null, 2));
await build({ entryPoints: [path.join(root, 'desktop/server-entry.ts')], outfile: path.join(stage, 'desktop/server.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true, external: ['bufferutil', 'utf-8-validate'] });
await build({ entryPoints: [path.join(root, 'server/lan-address.ts')], outfile: path.join(stage, 'desktop/lan-address.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true });
await build({ stdin: { contents: "export { PROTOCOL_VERSION } from './src/network/protocol';", resolveDir: root, loader: 'ts' }, outfile: path.join(stage, 'desktop/protocol.cjs'), bundle: true, platform: 'node', format: 'cjs', target: 'node22', minify: true });
const electronVersion = JSON.parse(await fs.readFile(path.join(root, 'node_modules/electron/package.json'), 'utf8')).version;
const output = await packager({ dir: stage, out: release, name: '疾风对决-'+pkg.version, executableName: '疾风对决', icon: path.join(root, 'desktop/icon.ico'), appVersion: pkg.version, buildVersion: pkg.version, platform: 'win32', arch: 'x64', electronVersion, asar: true, overwrite: true, prune: false,
  win32metadata: { ProductName: '疾风对决', FileDescription: '疾风对决 · 局域网 1V1', CompanyName: '疾风对决', OriginalFilename: '疾风对决.exe' },
});
const folder = output[0];
// Ship the Chinese UI and English fallback; other Chromium language packs are unused.
const locales = path.join(folder, 'locales');
for (const entry of await fs.readdir(locales, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith('.pak') && !['zh-CN.pak', 'zh-TW.pak', 'en-US.pak'].includes(entry.name)) await fs.unlink(path.join(locales, entry.name));
}
const uploadReadme = `疾风对决 ${pkg.version} · Windows x64\r\n\r\n启动：双击 疾风对决.exe，无需安装 Node.js。\r\n主机：点击“创建对局”，分享启动器中的地址与游戏内六位房间码。\r\n好友：输入主机地址、房间码，点击“连接并加入”。双方点击准备后开局。\r\n两台电脑必须连接同一 Wi-Fi / 有线局域网。首次主持请允许防火墙专用网络访问。\r\n主机退出程序会结束对战。端口默认 5180，占用时自动使用 5181–5190，以显示地址为准。\r\n单人：点击“单人练习”，进入菜单后开始游戏。\r\n\r\n上传平台配置（将本目录内容直接放在上传包根目录）：\r\n可执行文件：疾风对决.exe\r\n启动参数：留空\r\n版本：${pkg.version}\r\n\r\n请保留整个文件夹的文件，只复制 exe 无法运行。\r\n`;
await fs.writeFile(path.join(folder, '使用说明.txt'), '\ufeff' + uploadReadme);
const zip = path.join(release, `疾风对决-${pkg.version}-Windows-x64.zip`);
const result = spawnSync('tar.exe', ['-a', '-c', '-f', zip, '-C', folder, '.'], { stdio: 'inherit', windowsHide: true });
if (result.status !== 0) throw new Error('ZIP packaging failed: ' + (result.error?.message ?? result.status));
const sha256 = createHash('sha256').update(await fs.readFile(zip)).digest('hex');
await fs.writeFile(path.join(release, 'upload-config.json'), JSON.stringify({ executable: '疾风对决.exe', arguments: '', version: pkg.version, platform: 'windows-x64', directory: path.basename(folder), archive: path.basename(zip), archiveBytes: (await fs.stat(zip)).size, sha256 }, null, 2));
console.log('Windows package: ' + folder);
console.log('Upload ZIP: ' + zip);
await fs.rm(resolveInside('.cache/desktop-app'), { recursive: true, force: true });
