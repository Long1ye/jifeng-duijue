# 网页分享

线上游玩地址：https://pixel-league-long1ye.jessegames.chatgpt.site/?map=howling

通过 Sites 托管，访问范围为 public，拿到链接即可访问。访问者各自运行本地对局；没有加入多人联机。

## 构建

运行 `npm run build:share`，输出到 `dist-share/`。

`vite.share.config.ts` 只构建主游戏入口，避免发布素材预览与美术研究页面。角色、地图、音效随构建收集，不依赖开发机上的服务器。

## 发布记录

- 首次发布：2026-10-16，版本 1。
- Sites 项目身份：仓库 `.openai/hosting.json`，后续复用同一个项目，勿重新创建。
- 独立发布目录：`.cache/sites/pixel-league-share/`，其中 `dist/` 是本次 `dist-share/` 的副本。
- 已推送版本：`ab08e585ec6b3e3fc375948b796fd6728e316398`。
- 上传包：`.cache/sites/pixel-league-share.tar.gz`。

更新代码后需要重新构建、同步发布目录并发布新版本，线上不会自动跟随本地修改。

## 验证与工具兼容

首次发布通过 TypeScript 检查、Vite 发布构建和 Sites 部署检查，未进行线上浏览器实玩验收。

Windows 未安装 Bash，Sites 默认打包器无法启动。此次已由官方 `prepare-site-build.cjs` 检查并准备静态资源，再通过 Windows 系统 `tar` 生成部署包；源代码同步仍使用 Sites 工作流。发布凭证仅在会话内存与 stdin 中传递，没有写入项目文件。
