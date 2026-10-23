# Q3 Meowa 重制验收

实机：`/three.html?map=howling&scene=combat`。普通 Q 命中两次蓄风后，再按 Q 发射旋风。素材慢放：`/assets/effects/yasuo-q3-meowa-2026-10-19/index.html`。

使用 game-assets / Meowa 实际生成八帧旋风与四帧命中风流，并接入当前 Three.js 战斗。视觉从高亮蓝色密集环带调整为较窄、上宽下窄的灰白半透明风体；旧 Q3 起手图集中的蓝色月牙被显示层过滤。

`startup.jpg`、`launch.jpg`、`flight.jpg`、`knockup.jpg`、`late-flight.jpg`、`ended.jpg` 覆盖完整技能阶段，`direction-*.jpg` 检查八方向保持直立。旧版对照存放于相邻的 `meowa-q3-before/`。

`report.json` 记录：暂停冻结真实弹道，敌方风墙拦截，穿透英雄和小兵各造成 85 点伤害并击飞，四次重开资源计数稳定（71 个 geometry、29 个 texture），页面与贴图加载无错误。

复现：`node scripts/validate-meowa-q3.mjs`。构建通过；最终全量回归 151 个测试文件、817 项测试通过。生成来源、锚点和文件校验见素材目录的 README 与 contract.json。
