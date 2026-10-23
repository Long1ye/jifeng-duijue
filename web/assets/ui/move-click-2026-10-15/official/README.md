# 官方右键移动指示参考与接入

## 当前实现：贴图沿固定模型滚动

已撤销此前人为翻转、整体平移、上下开口压缩及整组下落。原始 SCB 几何保持不变，纹理坐标随时间滑动；主动画按 60 Hz 烘焙成 24 帧/0.4 秒图集。模型是上端向外弯曲、下端接近点击位置，箭头贴图经过该固定曲面，产生“小三角出现 → 沿曲面向下展开 → 下端收尾”的效果。当前实现不再实时投影模型，仅播放图集。

对照用户提供的原版视频 23.80–24.40 秒，逐帧参考见 video-reference/contact-sheet.png。animation-contact-sheet.png 与 animation-preview.gif 是新动画资源预览，**不是实机截图**。烘焙脚本 scripts/bake-move-click.py，V 方向滚动速度根据原版视频标定；不宣称完整复刻客户端材料和动态阴影渲染管线。原版点击圈按用户要求省略。

当前构建通过；资源检查验证 3072×128 图集、24 帧可用、下行及收窄趋势。受此前浏览器安全策略限制，本次没有声称完成实机复测。下方历史记录用于说明历次调整，以上述当前实现为准。

最新修正：删除 ArenaScene 中独立的 hero.destination 蓝色终点圆圈及十字线，这是此前截图中仍残留的小圈来源。点击圈和终点圈均不再绘制。移动指示改为 16 帧/0.4 秒的预缓存动画：四个箭头从额外展开 22 个模型单位收拢到约 14 个单位，并短距离下落，最后 0.08 秒淡出；连续点击重新播放。保留用户要求的箭头间隙。0.4 秒寿命、3.5 阻力来自客户端配置；位移幅度、相机投影和淡出为当前游戏适配，并非完整原版粒子发射器复现。最新代码构建通过；浏览器 URL 安全策略阻止了此次实机复测，未把静态编译当作画面验证。

后续按用户要求：四个箭头以各自独立模型表面整体向外平移 14 个模型单位，保留原造型与 UV；移除点击外围圈，并移除己方英雄脚下常驻蓝圈。下文外围圈描述仅记录初次移植状态，当前不再绘制。主指示仍持续 0.4 秒。实机截图见上级目录 spaced-arrows.png。

来源：本地客户端 `D:/Long1ye/英雄联盟(26)/Game/DATA/FINAL/DATA.wad.client`，只读提取。manifest.json 记录源路径、大小和 SHA-256。旧版自绘十字箭头已由官方模型投影替换。

主特效 `data/shared/particles/cursor_moveto.troybin` 解析结果见 cursor-moveto-decoded.json：

- cursor：p-life=0.4；p-scale=2 2 2；模型 movement_indicator4.SCB；贴图 movement_indicator.DDS。
- circle：p-life=0.2；使用 shockwavetrail.SCB 与颜色曲线 color-movetogreen.DDS。
- 另有四个 cursor_shadow 子发射器，寿命 0.4，带速度、阻力和旋转，使用 cursor_moveto.scb。当前移植没有完整复现这些黑色动态子发射器。

当前使用官方主模型的 440 个顶点、640 个三角面及原贴图 UV，按固定俯视镜头投影到一次性缓存 Canvas 纹理；SCB 的 V 坐标翻转到 Canvas 坐标。游戏中保持立体向下的箭头造型和 0.4 秒主指示寿命；外围圈以本项目绘制方式近似，持续 0.2 秒。大小按像素英雄及镜头比例适配。因此这是基于官方资源的移植，不是原客户端完整粒子渲染器的逐像素复制。

指示使用显示时钟，与仿真速度分开。新的右键地面指令替换旧指示；右键敌人继续攻击，不显示绿色移动指示；重新开局清空。每帧仅更新可见性、位置和外围圈，模型纹理仅首次创建时投影。

提取脚本：scripts/extract-move-click.py；解析脚本：scripts/parse-move-click.py。
格式参考：https://github.com/LeagueToolkit/league-toolkit/tree/main/crates/ltk_mesh/src/static ，https://github.com/LeagueToolkit/league-toolkit/blob/main/crates/ltk_ini/src/inibin.rs 。部分 INIBIN 属性仍未还原名称，保留其哈希和值。
