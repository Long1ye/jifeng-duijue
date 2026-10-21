# 八种积雪形态接入

后续用户指出魄罗与冰晶被积雪埋住，当前已调整避让布局，由 56 组变为 45 组；见[遮挡修正与新实机](../snow-occlusion/README.md)。本页保留八种形态初次接入的历史证据。

用户授权按八格概念图制作并加入游戏。本轮已制作透明运行图集并布置全桥 56 组积雪，状态：实现和检查完成，待用户实机视觉确认。

[九个视角的实际画面对照](comparison.html)：左侧是用户认可的上一版单种覆石积雪，右侧是八种形态；相同镜头、时间、分辨率和其他画质设置，只切换积雪版本。正常缩放 0.6，中央桥段 0.4，视口 1600×900。查看器包含桥面、墙根、红方、中央、圣所、火盆、草根、冻融雪壳和柱脚。

## 布置

- 原有空闲路肩混用贴墙厚雪、碎石覆雪与风积雪脊，保留裸露地段。
- 部分间隙加低矮薄雪残片；主路中央继续清楚。
- 柱脚拥雪按现有栏墙柱节点对齐，向路肩留出可见部分。
- 融雪边缘跟随实际火盆位置，雪环中间露出原铺地，使用既有暖光。
- 草根积雪依照现有草丛根部和长度布置，降低纵深并靠近草根；不添加另一套植物。
- 四处路肩使用冻融雪壳，让硬雪边与薄冰形成局部区别。

没有加入用户排除的浮雕、残旗、盾牌组合。没有因美术布置改变碰撞、通行、角色属性、技能和伤害。

## 验证

- 全量测试 150 个文件、814 项通过；最终专项测试 3 文件、6 项通过；TypeScript / Vite 生产构建通过。
- [浏览器专项报告](report.json)：八种形态都有落点；九个查看器视角、图像加载、分界线按钮、独立冰雪开关、轻量档、地面拾取、同时间停表、镜头移动复原和五次重开通过，无页面 / Console / shader 错误。
- [角色走到雪边](snow-contact.jpg)：通过正常命令从出生点走到 (-390, -95)，到达误差 0，检查脚部与雪包的深度关系，暂停时间固定，没有传送或改属性。
- [正常比赛回归](gameplay/report.json)：移动、兵线、攻击、Q、暂停和重开通过。[正常比赛查看器](gameplay/comparison.html)比较全部基础/优化效果，不是仅积雪的隔离对照。
- [战斗音频回归](combat/browser-report.json)：成熟 Q/W/Q3/R/EQ3、护盾、点燃、闪现、塔摧毁和声音检查通过，无错误或资源请求失败。
- 新形态使用一个共享图集、两批合并几何和两个材质，不按 56 个摆放点逐个绘制；专项同帧旧/新积雪均为 84 次绘制调用。对照用的旧版资源仍保留。没有新增灯、粒子、独立计时器或渲染目标。专项场景五次重开均为 170 个几何、39 张纹理，正常比赛重开为 159 / 59，各自稳定；不同场景的数字不混用。

测试与资源稳定不代替美术认可，也不构成长期对局的全设备帧率保证。静态截图不证明移动过程完全无闪烁。新素材有雪包、雪帽和接触影，是固定视角浅浮雕而非全角度三维雪体。

参数与类型：`SnowVarieties.ts`。旧版开关：`SnowBanks.setVariety`。资产及完整提示词见 [素材说明](../../../../assets/map-modules/howling-snow-varieties-v1/README.md)。

重现（浏览器脚本顺序运行）：

```powershell
python scripts/inspect-snow-varieties.py
node scripts/validate-three-winter-dressing.mjs docs/visual-validation/2026-10-19/snow-varieties --varieties
node scripts/validate-three-combat.mjs docs/visual-validation/2026-10-19/snow-varieties/combat
node scripts/validate-three-gameplay-quality.mjs docs/visual-validation/2026-10-19/snow-varieties/gameplay
```
