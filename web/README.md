# 疾风对决网页版

## v0.1.4（2026-10-23）

本版加入单人对手选择（亚索 / 奶龙）、硬件自动画质预设、持续掉帧降档和开始前画质说明。低配最高 1280×720 / 30 帧，均衡最高 1600×900 / 60 帧，保留角色动作、技能与音效；小兵血条改为独立清晰界面层，修复低画质下细线缩放闪烁。主菜单加强 Meowa AI 署名展示。

最新发布包：`release/jifeng-duijue-web-0.1.4-platform.zip`（平台上传，限 50 MB）与 `release/jifeng-duijue-web-0.1.4.zip`（普通静态网页版）。准确体积与 SHA-256 见 `release/platform-package.json`、`release/web-package.json`。GitHub 仓库将本项目保存在 `web/`，桌面版保留于仓库根目录。下文旧版本发布记录用于追溯。

平台 ZIP 只含网页客户端；局域网联机需要完整源码中的 Node.js 服务。菜单保留已发布的 v0.1.3/v0.1.2 本地版下载链接，不将它们错误标为新的 0.1.4 桌面包。

0.1.4 平台包的四张菜单/美术参考展示图使用 WebP Q90，以满足 50,000,000 字节限制；尺寸和 alpha 保持不变。游戏内地图/小兵图仍沿用 Q95，角色与技能贴图继续无损处理，不删动画帧，不再降低音频质量。源文件保持不变。

当前版本：v0.1.4。装备图标已于 2026-10-23 更新为 229 张 Meowa 64×64 像素图，商店、装备栏、目标面板和状态图标共用新素材。当前图标已去除白底并按原版色调还原深色背景，保存在 `assets/ui/equipment-pixel-dark-64/`，原版图标保留用于来源核对。去重与 ID 对应检查记录在 `audit/equipment-pixel-icons-2026-10-23.json`。

最新深色背景图标包：`release/jifeng-duijue-web-0.1.3-dark-icons-platform.zip`。227 张白底图已使用 Meowa 像素抠图并合成原版色调的低亮度底纹，2 张完整背景图保留。前景不透明像素颜色保持原样，未重绘装备。229 张发布图的浏览器解码像素核对记录见 `audit/equipment-dark-browser.json`。

前一版像素装备图标平台包：`release/jifeng-duijue-web-0.1.3-pixel-icons-platform.zip`，49,871,436 字节（低于 50 MB）。本机试玩 `http://127.0.0.1:5197/`；浏览器检查记录在 `audit/equipment-pixel-browser.json`，229 张图标解码像素一致，商店购买与装备栏显示已验证。

此前上传使用 `release/jifeng-duijue-web-0.1.3-platform-guide.zip`（含联机引导、meowa.ai 署名、可选 PNG 图标和平台入口修复）。原 `release/jifeng-duijue-web-0.1.3.zip` 保留不覆盖。

最新精简指引包：`release/jifeng-duijue-web-0.1.3-platform-guide-short.zip`。菜单提供用户指定的 v0.1.3 Release 链接，联机正文简化为启动主机、打开主机网址、房间码加入三步，网页版命令与 Windows 替代下载放在可展开说明中。

网页版 v0.1.3 的发布 ZIP 只有网页客户端，不包含对战服务器。平台页面用于单人试玩；局域网对战需主机获取完整项目，安装 Node.js 24+，依次执行 `npm ci`、`npm run build`、`npm start`，双方再打开主机显示的局域网网址，以六位房间码加入。好友只需浏览器，无需安装项目。Windows v0.1.2 的 Release 是独立替代方案，不标注为网页版 v0.1.3 的服务器包。

美术署名：游戏原创美术资源通过 [meowa.ai](https://meowa.ai) 平台生成制作。该署名也显示在游戏主菜单底部；现有第三方资源的来源说明继续保留。

基于 `D:/Long1ye/疾风对决` 0.1.2（由 pixel-league-of-legends-V2 精简并继续开发的 EXE 版）独立复制。与 V2、疾风对决同级，不依赖它们的源码、资源或 node_modules。

完整保留游戏源码、784 份源资源、全部测试及联机服务器。保留 Three.js 冰桥、原版渲染入口、单人 AI、房间码联机、成长与装备系统、技能、动画、动作语音、背景音乐、设置和操作指南。源素材保持原字节；平台包在构建目录中优化编码，不覆盖源文件。桌面版原始说明见 `docs/desktop-source-README.md`。

网页版不携带 Electron、Windows DLL 或桌面启动器；浏览器菜单、网页服务器替代桌面启动入口。根页面点击单人/联机均进入 EXE 版使用的 Three.js 正常对局。原版渲染入口仍可用 `index.html?map=howling&launch=1` 进入。

## 启动与构建

使用 Node.js 24 或更新的兼容版本，在本目录运行：

```sh
npm ci
npm run build
npm start
```

打开终端打印的网址，默认 `http://127.0.0.1:5180/`。单人和联机均可使用；好友打开同一主机的局域网网址，通过六位房间码加入。主机保持服务运行，防火墙允许专用网络访问。端口占用时自动尝试 5181–5190。可用 PowerShell `$env:PORT=5188; npm start` 指定端口。

开发：`npm run dev`（单人网页）或 `npm run dev:lan`（含联机的开发服务）。`npm run preview` 仅预览静态网页，不含对战服务。

## 发布包

```sh
npm run package:web
```

生成 `release/jifeng-duijue-web-0.1.2.zip`，根目录直接包含 `index.html`、`three.html` 和 `assets/`，可解压部署到静态网页主机。体积、SHA-256 和 50 MB 检查结果写入 `release/web-package.json`。

上述为约 128 MiB 的原始完整包。上传 bilibili Toy 请使用下面的平台优化包。

## 50 MB 平台优化包

```sh
python -m pip install -r scripts/requirements-web.txt
npm run package:platform
```

生成 `release/jifeng-duijue-web-0.1.2-platform.zip`，当前约 49.72 MB / 47.42 MiB，根目录直接包含 `index.html`。`release/platform-package.json` 记录准确体积与 SHA-256；脚本强制检查不超过 50,000,000 字节。

平台包保留所有玩法、229 个装备图标、角色方向动作、完整动画帧和声音。166 张地图/小兵图使用 Q95 WebP；303 张其他图片使用无损 WebP，仅在比 PNG 更小时转换。所有图片保持原分辨率、布局及透明度，脚本逐图校验 alpha；无损图片额外校验完整 RGBA。背景音乐转为 96 kbps VBR Opus，全曲约 313.7 秒；语音及战斗音效不重新编码。未删除装备、减少动画帧或裁剪音乐。

`dist-platform/` 为优化后的网页，可通过 `npm run start:platform` 启动本机及局域网服务。生产网页文件使用更新后的内容版本名，避免旧缓存加载转换前的文件。完整源素材以及原版 `dist/` 和 ZIP 可继续独立构建。

本机平台版本预览：`http://127.0.0.1:5197/`（需服务运行）。逐图记录见 `audit/web-image-optimization.json`，浏览器检查见 `audit/browser-platform/report.json`。Pillow 和 imageio-ffmpeg 仅用于构建，平台玩家无需安装 Python。

平台入口兼容修复：对局界面模板随 JavaScript 一起打包，菜单启动使用 `renderer=three` 查询参数，保留平台的 `index.html` 路径，不再通过 fetch 请求 `three.html`。已用子目录托管且所有 HTML 请求均返回入口页的模拟环境复现旧版“游戏界面缺失”并验证修复，记录见 `audit/platform-host/report.json`。首次修复的上传副本为 `release/jifeng-duijue-web-0.1.2-platform-entry-fix.zip`。

包含可选图标的最新上传副本：`release/jifeng-duijue-web-0.1.2-platform-with-icon.zip`。独立图标为包根目录 `000-toy-icon.png`（256×256、133,553 字节），由 `public/` 自动复制，优化流程保留 PNG 格式，供平台“从 ZIP 包选择”使用。

含局域网指引的上传副本：`release/jifeng-duijue-web-0.1.2-platform-lan-guide.zip`，保留图标和入口修复。平台页面选择“局域网双人对战”后展示本地完整版获取、主机启动、局域网地址和房间码步骤，不向平台建立对战连接；本机和私有局域网地址保留大厅入口。公开页面直接打开带 `online=1&launch=1` 的链接也会进入指引。浏览器验证见 `audit/lan-guide/report.json`。

已加入用户提供的 [Windows v0.1.2 下载页](https://github.com/Long1ye/jifeng-duijue/releases/tag/v0.1.2)，新上传副本为 `release/jifeng-duijue-web-0.1.2-platform-lan-download.zip`。指引提示下载 Assets 下的 Windows-x64.zip、完整解压运行游戏及双方版本一致，下载页在新标签页打开。

静态托管提供单人内容。完整保留的联机功能需要 `npm start` 启动的服务器；当前服务继承 EXE 版的局域网访问限制。ZIP 无法在静态托管平台内运行 Node.js 对战服务，公网联机需另行适配部署。

## 验证

```sh
npm test
npm run check:server
npm run build
```

`audit/web-source-verification.json` 记录来源资源逐文件 SHA-256 校验和源码复制差异。网页版人机跟随己方前排兵线上线，接敌主动战斗；不再因残血回泉水或禁用进攻技能。兵线全灭后原地等待增援，保留范围技能躲避和无兵线时的防御塔避让。一血结束对局，不复活。未复制历史构建、缓存、桌面运行时和宣传视频。
