# 四图部件与布局核对 v4

## 范围与来源

使用 `assets/map-concepts/howling-abyss-target-v1/` 四张原图，逐张查看后记录 [部件清单和参考落点](../../../../assets/map-concepts/howling-abyss-target-v1/component-plan.json)。03 的人像纪念碑沿用此前否定意见，不作为通过造型。总览、圣所、外塔、中央是独立构图，以连续地图解释各自的结构关系，不宣称逐像素重建。

本轮生成五件最终资源，六次内置 image_gen 调用（含一次塔修订），外部付费生成请求为零。图片无离线编辑，来源、尺寸、透明度和逐字节哈希见 [v4 manifest](../../../../assets/map-modules/howling-painted-v4/manifest.json)。原始提示词与候选保留在同目录。

## 实机检查

在用户现有 Codex In-app Browser 的实际游戏页面上切换场景，没有用静态概念图冒充游戏截图，没有设置浏览器视口覆盖。

- `central.png`：四兽柱沿前后两侧错位，围绕唯一圆纹章；不再十二座等距对列。柱下承重墩对应，主路开敞。
- `sanctuary.png`：晶坛居于圆庭中心，双神龛后墙贴合后缘，入口和桥路连接开敞；圆铺地没有硬方形边。
- `outer-tower.png`：新塔位与逻辑塔位同步。点击塔冠，页面状态显示目标 1、HP 1000。检查仅证明选中塔，不声称对塔造成伤害。
- `overview.png`：两端圣所、外塔、连接路段、中央的整体关系；完整红端为同风格延伸，非原图已经给出的完整红方布局。
- `reference-pins.png`：核对页的中央原图人工落点标注。

截屏为原始浏览器视口截图，包含周围控制栏；未裁剪、重绘或合成。拍摄过程中用户也在操作角色，截图不是固定帧的性能基准。全图缩略视角曾露出远景矩形边缘，已扩展背景承载面，并在原图内过渡到雾色，避免图边拉伸条纹；桥墩低处使用相同远景过渡。

四图选择、原图链接、五张新资源图片加载正常。游戏与核对页控制台 error/warn 均为空，记录见 `console-errors.json`。

## 自动验证

- `npm test -- --maxWorkers=4`：121 文件、696 项通过，见 `tests.log`。
- `npm run build`：TypeScript 与 Vite 构建通过，含核对页入口，见 `build.log`。
- `python scripts/audit-howling-painted-map.py`：四参考图、26 类部件、五件新资源文件存在，原生 alpha 与来源哈希检查通过。
- 新测试覆盖四兽柱错位及支撑关系、新建筑保留源图投影、异步加载与资源释放、塔摧毁隐藏、塔冠点击代理。

自动测试不是美术验收。固定 45° 近似立体投影不支持自由旋转；火焰仍是绘制帧配呼吸光，神龛储物只是环境美术。完整边界见 [v4 README](../../../../assets/map-modules/howling-painted-v4/README.md)。
