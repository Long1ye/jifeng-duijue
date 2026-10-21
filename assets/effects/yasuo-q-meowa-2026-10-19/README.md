# 亚索普通 Q · Meowa 生成版

通过项目 `game-assets` Skill 的 `general-image-run` 实际生成，两项任务均使用 Image2.5 / Standard / 1K / 原生透明，无模板。总计消耗 2 积分。

- 出刺八帧：`job_1be52f9aecd84191a52c5f875e512cea`。
- 命中四帧：`job_5b8d289c52494e9a87fe944f60488e21`。

`generated/`、`hit-generated/` 保存工具返回的原始最终 PNG 和 `final_outputs.json`，原图均为 1024×1024 RGBA，带软透明。

`runtime/thrust-atlas.png` 为 2 列 × 4 行、每格 512×256；`runtime/hit-atlas.png` 为 2 列 × 2 行、每格 512×512。出刺各帧按亮剑尖中线作整数像素纵向对齐，未缩放、未重绘；透明边缘完整保留。来源 SHA256、原始尺寸、各帧内容范围、对齐偏移见 `contract.json`。打包脚本为 `scripts/package-meowa-q.py`。

`index.html` 提供原始像素尺寸的透明背景慢放，可暂停逐帧检查。运行时出刺提前 25ms 起始，实际伤害帧进入完整伸展阶段，随后 180ms 内消散；命中风雾持续 200ms。方向跟随实际瞄准，手部挂点补偿镜头仰角，避免特效向下偏移。

当前 Three.js 普通 Q1/Q2 已使用生成贴图替代前一版程序绘制的出刺和命中效果；既有角色动作、Q 伤害和叠风逻辑沿用。实机证据位于 `docs/visual-validation/2026-10-19/meowa-q/`。
