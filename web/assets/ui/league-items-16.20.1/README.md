# League of Legends 原版装备图标

229 个装备 ID 对应的原始 PNG，统一来自 Riot Data Dragon 16.20.1，保留原始尺寸与内容。图标版权属于 Riot Games。

源地址模板：`https://ddragon.leagueoflegends.com/cdn/16.20.1/img/item/{officialIcon}`。ID 到源文件名的映射保存在 `src/game/data/items-16.20.1.json`。生成和验证脚本：`scripts/sync-league-items.py`。完整范围及条件审计：`docs/item-data/full-catalog-16.20.1.json`。

`src/ui/EquipmentIcons.ts` 是唯一装备图标入口，商店和装备栏均使用这里的原版文件。
