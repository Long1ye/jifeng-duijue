# 亚索被动 · 浪客之道像素图标

参考 Riot 官方 Data Dragon 16.20.1 的 `Yasuo_Passive.png`，保留环绕的青蓝气流、中央深色剑客剪影和少量金色细节，重绘为与游戏 HUD 一致的像素风。

使用项目 game-assets skill 通用生成，任务 `job_d4c0808d8946466fbf93c1ee26a24e4f`。`reference/official-yasuo-passive.png` 是参考输入，`runtime/passive.png` 是最终重绘图标。

后续已在 `YasuoPassive.ts` 接入实际被动：无蓝耗、移动剑意、满剑意受英雄伤害先触发护盾、1 秒护盾、暴击率翻倍与溢出转攻击力，以及 R 补满剑意。剑意充能按本项目地图缩尺换算距离；位移计算不包含单位碰撞纠偏，避免静止拥挤时白赚剑意。

当前没有等级和装备成长，英雄默认内部等级 1（护盾 125），装备暴击率 0；保留内部等级和外部暴击率字段供未来接入。普通对局不会凭空获得暴击。等级 18 护盾 600，护盾按官方基础属性成长曲线缩放；普攻和 Q 暴击为当前 26.1 规则的 1.8 倍，同一 Q 对所有目标使用一次暴击判定。未实现装备与额外暴击伤害加成。

机制来源：
- [官方英雄说明](https://www.leagueoflegends.com/en-us/champions/yasuo/)
- [13.15 护盾成长调整](https://www.leagueoflegends.com/en-us/news/game-updates/patch-13-15-notes/)
- [14.10 暴击翻倍与溢出转换](https://www.leagueoflegends.com/en-us/news/game-updates/patch-14-10-notes/)
- [26.1 暴击伤害规则](https://www.leagueoflegends.com/en-us/news/game-updates/patch-26-1-notes/)

官方参考：https://ddragon.leagueoflegends.com/cdn/16.20.1/img/passive/Yasuo_Passive.png
