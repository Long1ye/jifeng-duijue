# Windows 局域网发布包（0.1.0）

## 交付与平台配置

上传 `release/疾风对决-0.1.0-Windows-x64.zip`，其根目录包含 `疾风对决.exe` 和完整运行资源。

| 配置项 | 内容 |
| --- | --- |
| 可执行文件相对路径 | `疾风对决.exe` |
| 游戏启动参数 | 留空 |
| 包体对应版本号 | `0.1.0` |
| 平台 | Windows x64 |

ZIP 约 267.30 MiB，解压目录约 452.61 MiB。程序自带 Chromium 与 Node.js，不能只上传或复制 exe。压缩包 SHA-256 见 `release/upload-config.json`。当前未代码签名，未进行上传平台的在线审核；以上字段满足截图展示的配置结构，平台其他审核条件需以其实际规则为准。

## 玩家操作

1. 双方解压并运行相同版本的程序。
2. 主机点击“创建对局”。启动器会显示可复制的 IPv4 地址及端口，游戏窗口自动创建房间并显示六位房间码。
3. 好友在自己的启动器输入地址与房间码，点击“连接并加入”。
4. 双方地图、角色和声音加载完成后点击准备，倒计时后开局。
5. 主机退出整个程序或停止主持会关闭服务；只关闭游戏窗口时，启动器仍保留主持状态。重新进入可创建新的房间。

双方应连接同一 Wi-Fi / 有线局域网，主机允许防火墙的“专用网络”访问。访客网络或 AP 隔离可能阻止两台电脑互相连接。默认 TCP 5180；占用时自动尝试 5181–5190，必须使用启动器实际显示的端口。仅接受本机、私有 IPv4 和链路本地地址，不提供公网匹配与账号服务。

## 实现

- `desktop/main.cjs`：Windows 窗口、独立启动器、受限 IPC、主机/加入/单人流程与进程退出清理。
- `desktop/launcher.*`：局域网地址、房间码、复制地址、停止主持和单人入口。
- `server/production.ts`：只服务生产构建的 HTTP / WebSocket 服务，不包含 Vite、tsx 或开发服务器；支持音频 Range 请求与版本握手。
- `server/lan-address.ts`：输入地址和访问来源校验。
- `desktop/server-entry.ts`：先选择冰桥地图，再初始化对战模拟，确保与客户端一致。
- `src/launch.ts`：桌面发起的创建/加入动作复用现有房间与加载门禁。
- `scripts/build-desktop.mjs`：构建独立服务、打包 ASAR、Windows 元数据与版本、精简无用 Chromium 语言包、生成 ZIP 和哈希。

Electron 游戏窗口关闭 Node.js 集成，启用上下文隔离和沙盒；仅本机启动器持有预加载 IPC，连接好友主机的游戏页面没有预加载权限。参考 [Electron 官方安全文档](https://www.electronjs.org/docs/latest/tutorial/security/)。

## 验证（2026-10-20）

- 客户端 TypeScript 检查与生产构建通过。
- 服务端 TypeScript 检查通过。
- 182 个测试文件、1,015 项测试通过，包括新增地址限制、静态资源/音频分段、版本握手、独立服务双端房间、WebSocket 来源校验。
- 使用最终 ZIP 解压到系统临时目录，脱离项目源码和 node_modules，测试子进程的 PATH 不含 Node.js 路径。
- 运行两个打包后的 exe 实例；主机使用本机回环地址，客机使用 `192.168.2.139:5181`。默认端口已被占用时成功自动选用 5181。
- 自动创建房间、自动加入、蓝红双方资源就绪、双方准备、倒计时并进入战斗均通过。两端画面均有正常角色、场景和 HUD。
- 客机刷新并点击进入后恢复房间；主机程序退出后，客机显示断开连接，主机端口不可继续访问。
- 打包后的单人模式成功加载对局。
- 两个实例没有脚本异常或失败的 HTTP 资源请求。过程记录与截图见 `audit/desktop/smoke-report.json`、`launcher.png`、`host-playing.jpg`、`guest-playing.jpg` 和 `solo-playing.jpg`。
- 审计覆盖的原项目 4,838 个文件 SHA-256 均未变化，原项目 Git 工作区仍干净。

本次验证是在同一台电脑运行两个独立 exe 实例并经局域网地址通信，未声称已通过两台实体电脑的网络、防火墙和无线隔离测试。

## 复现

```sh
npm ci
npm run check:server
npm test
npm run package:win
```

`scripts/smoke-desktop.mjs` 使用本机 Codex 自带的 Playwright 路径；它属于开发验证工具，不随玩家包交付。在其他开发机器执行时，应调整该工具的 Playwright 导入位置。可用 `JIFENG_SMOKE_EXE` 指定解压后的 exe 路径。
