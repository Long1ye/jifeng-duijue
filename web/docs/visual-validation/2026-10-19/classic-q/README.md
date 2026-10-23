# 普通 Q 原版风格重制

入口：`/three.html?map=howling&scene=combat`。在当前 Three.js 版本中替换普通 Q1/Q2 戳刺的粗剑贴图和通用命中火星，使用细银白直刺、收束到剑尖的两侧灰白风带、稀疏气流碎屑，以及命中时的小型轴向白闪和风痕。参考项目保存的 Riot 基础皮肤 Q 演示 `assets/audio/riot-original/sources/yasuo-Q.mp4` 及 `docs/screenshots/animation-qa/yasuo-official-q-overview.png`。

保留既有角色出刀动作、Q 伤害、实际范围、暴击、穿透、叠风、音频和收招逻辑。`ClassicQVfx.ts` 的几何笔触随实际瞄准方向连续旋转，手部锚点跟随原动画的左右翻转；播放服从既有 `CombatFeel.qAge`，移动恢复后完成剩余刀光。实际 `impact=q` 事件才会出现命中风痕。

旧 Q 人物图集自带亮青色手部爆光，`ClassicQMaterial.ts` 仅在显示 Q 身体图集时过滤亮青色像素，保留核心握点为低饱和灰色；切回其他动作即禁用。没有改写原图集，也没有替换角色动作；材质保留原有环境光 shader hook。

素材实现为可复用的原生 Three.js 几何笔触和显示时颜色过滤，本轮没有提交 AI 位图生成。风带在 180ms 内结束，命中风痕在 200ms 内结束；时间由模拟时钟驱动。

验证：

- `thrust-contact.jpg`、`thrust-wind.jpg`、`dissipate.jpg`、`recovered.jpg`：实际出刀到回收。
- `aim-*.jpg`：八方向空放检查。
- `report.json`：实际伤害、连续两次 Q 的叠层、暂停冻结、重开清理与浏览器错误。
- `scripts/validate-classic-q.mjs`：通过生产模块创建确定性实机样本，另以浏览器真实帧循环播放一整次 Q。
- `tests/classic-q-vfx.test.ts`：出刀时序、八方向窄风带、命中结束与材质 hook 保留。
- `tests/three-combat-migration.test.ts`：移动恢复后完成 Q、结束后移除笔触，并在动作切换后禁用 Q 材质过滤。

浏览器检查通过：连续两次 Q 对靶累计 170 伤害，获得两层蓄风；暂停冻结，重开前景笔触数归零，页面及资源加载无错误。`npm run build` 通过。

最终全量回归：`npm test -- --maxWorkers=2 --reporter=dot`，148 个测试文件、809 项测试全部通过。
