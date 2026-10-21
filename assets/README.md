# 资源目录

所有本项目处理的素材均存放在本目录内。游戏已接入的素材继续保留原路径，制作来源和生成过程单独分类。

| 目录 | 用途 |
| --- | --- |
| `heroes/`、`units/`、`structures/` | 已整理的角色、小兵、建筑资源 |
| `effects/`、`audio/`、`ambient/`、`ui/` | 特效、音频、环境角色和界面资源 |
| `map-modules/`、`map-layers/` | 地图模块、地面和分层资源 |
| `hero-*`、`map-studies/` | 历史制作版本、方向研究和预览页；不代表全部在游戏中加载 |
| `source-materials/heroes/yasuo/` | 用户提供的亚索动作、刀身、技能和问题参考原文件 |
| `source-materials/heroes/twisted-fate/` | 卡牌八向站立、行走原图 |
| `source-materials/audio/` | 用户提供的音频来源 |
| `source-materials/references/maps/` | 地图参考原图 |
| `source-materials/references/motion/` | 动作参考视频 |
| `source-materials/references/misc/` | 尚未明确角色或用途的原始参考图 |
| `generation-archive/maps/howling-abyss/` | 深渊、铺装、边缘、栏杆、城门、城堡等历次生成与处理结果 |
| `generation-archive/maps/howling-abyss/environment/` | 草丛、水晶、灯具及环境规划、评审输出 |
| `generation-archive/units/bridge-camp/` | 营地休息动画生成结果 |
| `generation-archive/legacy-meowa/` | 原项目根目录 `meowa-output` 内的设计、Q/W 制作过程 |
| `resource-catalog/` | 来源、迁移映射、文件大小和校验信息 |

新制作的原始输入放入 `source-materials/<类别>/`，生成输出放入所属制作版本内的 `generated/` 或 `generation-archive/<类别>/`。生成命令显式指定项目内输出目录。脚本以脚本所在位置解析项目根目录，不再依赖同级 `资源` 或临时生成目录。

2026-10-15 归档记录见 [migration-2026-10-15.json](resource-catalog/migration-2026-10-15.json)：225 个文件、约 60.6 MiB。重复素材仍保留原始版本，不在本轮去重。原始媒体内容未修改；生成记录内的本地路径已更新，迁移前后的校验值分别记录。
