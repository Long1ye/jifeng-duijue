# 本地原版血条资源与游戏适配

来源：`D:\Long1ye\英雄联盟(26)\Game\DATA\FINAL\UI.wad.client`，只读提取，不改客户端。WAD 3.4 文件头和分块压缩按 CommunityDragon/CDTB 的 wad.py 格式解析，TEX 转 DDS/PNG 按其 export.py 中的 TexConverter 格式解析；纹理内容来自本机客户端。公开路径哈希表来自 CommunityDragon/Data 的 hashes.game.txt.8，仅用于定位文件名。

提取 10 张相关图集：healthbarsdefault（阵营血条）、spotlighthealthbaratlas（英雄/建筑框、分段填充和状态图形）、healthbaricons、英雄/建筑死亡反馈图集与生命条动画纹理等。原 TEX 保存在 original/，解码 PNG 在 textures/，来源与哈希记录在 extracted.json。运行时只用 runtime/ 中 5 个经过检查的矩形裁切，坐标见 crops.json。

已接入：英雄黑底边框、每 100 生命一格的分段、我方绿色/敌方红色填充与资源细条；防御塔金色框、每 250 生命一格，继续遵守靠近才显示的规则；小兵使用轻量窄框和阵营色。掉血有 0.18 秒停留后追赶的浅色残影，治疗立即更新，暂停冻结，重置清理。无等级框。底部 HUD 生命与法力条也使用原版填充条。

格式资料：https://github.com/CommunityDragon/CDTB/blob/master/cdtb/wad.py 与 https://github.com/CommunityDragon/CDTB/blob/master/cdtb/export.py 。定位脚本 scripts/find-riot-healthbars.py；提取脚本 scripts/extract-riot-healthbars.py。解压依赖位于项目 .cache/riot-ui-tools，不写入客户端目录。

## 本轮修正

- 我方可交战外塔满血也显示金色血条；敌方外塔继续接近才显示。内塔/门牙塔仍是没有战斗属性的场景建筑，悬停用不可攻击光标与提示说明，不伪造血量。
- 顶部数据改为双方英雄击杀、个人 K/D/A、补刀和时间。个人击杀与阵亡由真实致死事件统计，塔造成的击杀不冒充个人击杀；本项目 1v1 没有英雄助攻，助攻为 0。双方击杀按对方英雄阵亡计数。每局重新初始化。
- 从同一客户端包只读提取 5 个原版 TGA 光标（普通、友方、敌方、不可攻击和技能目标），原尺寸 128×128，运行时以最近邻采样输出 32×32，热点位于指针尖端；指向型技能使用中心热点。
- 小地图 DOM、标记更新与点击监听均移除。图册中的原版小地图仍属于历史参考。

验证：550 项测试及生产构建通过。浏览器检查小地图节点不存在，原版 cursor URL 生效；镜头移动到我方外塔，确认满血血条可见。截图 hud-fixes-preview.png。
