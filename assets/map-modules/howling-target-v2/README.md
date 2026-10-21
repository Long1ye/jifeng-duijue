# 中央目标图配套材质 v2

唯一美术参考：`assets/map-concepts/howling-abyss-target-v1/04-central-bridge.png`。不使用旧游戏截图或旧版64px石砖作为本轮生成参考。

- `stone.png`：1024×1024，灰紫色大块风化石材表面，Meowa通用生成Image2.5，1K、Detailed请求、1张目标图参考，实际消耗7积分。用于实体建筑的表面，不含建筑轮廓或透明拱洞。
- `ground.png`：2048×1536，真正俯视铺装与单个中央刻纹，2K、Detailed请求、同一张参考，实际消耗12积分。石板比上版细，路面颗粒减少；中央刻纹仍偏完整，不把它描述为已经精确还原目标图的破损程度。该图不是无限无缝地图。

两张图均原生尺寸目视检查，Alpha全255，runtime逐字节复制，没有裁切、调色、缩放或二次像素化。来源、job ID、尺寸和SHA256见[manifest.json](manifest.json)。通用生成提供绘画像素质感，不保证严格统一像素网格或无缝边缘。

原始来源分别保留于`assets/ha-mat-v2/`与`assets/ha-floor-v3/`。首张材质的初次长路径下载失败后，使用原job ID恢复到短目录，没有重提交或再次生成。本轮两项合计19积分，以任务回执为据；不以余额差额推断消耗。

实际接入、实体模型改动与实机截图见[本轮记录](../../../docs/visual-validation/2026-10-16/target-style-04/README.md)。
