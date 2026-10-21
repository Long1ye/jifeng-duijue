# Meowa 生成 Q 实机验收

当前入口：`/three.html?map=howling&scene=combat`，按 Q 试用。素材原尺寸慢放：`/assets/effects/yasuo-q-meowa-2026-10-19/index.html`。

素材使用 game-assets / Meowa 通用生成实际制作：八帧出刺风刃、四帧命中风雾。各帧带原生软透明；只作技术切片与整数像素锚点对齐，不以程序线条代替生成素材。原始生成文件与任务记录保留在 `assets/effects/yasuo-q-meowa-2026-10-19/`。

`thrust-contact.jpg`、`thrust-wind.jpg`、`dissipate.jpg`、`recovered.jpg` 检查完整时序；`aim-*.jpg` 检查八方向。`report.json` 记录通过生产模块运行的浏览器结果：连续两次 Q 累计 170 点伤害、两层蓄风，暂停冻结，重开清理，无页面或贴图加载错误。

复现：`node scripts/validate-classic-q.mjs docs/visual-validation/2026-10-19/meowa-q`。真实帧播放按模拟时间完成一个完整周期，避免慢速渲染导致第二次 Q 在第一次收招前被拒绝。

构建通过；全量回归为 149 个文件、812 项测试全部通过。
