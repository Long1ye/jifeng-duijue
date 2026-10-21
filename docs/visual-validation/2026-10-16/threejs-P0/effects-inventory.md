# P0 表现与功能迁移盘点

日期：2026-10-16。证据类型：源码与现有自动化测试。下表“已有”表示找到实现，不表示本轮完成实机或听觉验收。所有 P1 灰盒缺项必须显式保留到 P4/P5，不能静默删除。

| ID | 旧版能力 / 代码入口 | 新版采用方向 | 必须核对的行为 | 计划阶段 |
| --- | --- | --- | --- | --- |
| F01 | 固定步、暂停、胜负、重开：Match、ArenaScene.update | 保留逻辑，重建宿主循环 | 60 Hz；事件单次分发；暂停冻结；新局无残留 | P1 基础 / P4 完整 |
| F02 | 跟随/自由、缩放、拖动、小地图：CameraRig、CameraDrag、main | 重做三维投影与输入适配 | 镜头变化不改变逻辑落点；选中与施法坐标准确 | P1 基础 / P4 完整 |
| F03 | 角色插值：RenderPositions、Presentation | 复用纯插值计算，重新确定呈现精度 | 闪现不扫过地图；逻辑位置不被视觉插值修改 | P1 |
| F04 | 八向移动/待机与 A/B 普攻：YasuoAnimation、YasuoAssets | 样板先复用，按新美术质量决定改造或替换 | 脚底、方向、动作时钟、攻击释放帧与取消行为 | P2 / P4 |
| F05 | Q 身体、剑光与接触时序：YasuoQAnimation、YasuoQDraw、CombatFeel | 重建空间挂点，保留时序契约 | 伤害与剑光接触；空挥不停顿 | P4 |
| F06 | E、EQ、EQ3：YasuoEAnimation、SkillPresentation、ArenaScene | 重建位移轨迹表现及前后弧遮挡 | E 目标锁、环斩接触与层次，不改变位移距离 | P4 |
| F07 | 蓄风/Q3、R：StormVfx、YasuoR、ArenaScene | 重新组织旋风、击飞与空中表现 | 蓄风状态、击飞高度仅表现、R 目标与命中时机 | P4 |
| F08 | 风墙：WindWallArt、WindWallAnimation | 三维空间中的透明动画平面 | 朝向、碰撞尺寸与实际拦截一致，透明边正确 | P4 |
| F09 | 被动护盾、疾跑、闪现、点燃：PassiveShieldVfx、SummonerVfx、DashTargetTimer | 重建挂点与反馈，重新评估视觉样式 | 护盾状态、E 锁定计时、召唤师技能反馈可读 | P4 |
| F10 | 受击、刀光、硬直、补刀反馈：CombatFeedback、CombatFeel、ImpactMotion | 按新画面强化，保留事件驱动 | 短暂停顿不冻结模拟；回弹不移动碰撞体 | P4 / P5 |
| F11 | 血条、拖尾、选中、点击反馈：HealthBars、HealthBarTrail、MoveClickIndicator | 调整世界锚点与样式 | 被环境遮挡时仍能判读，点击不选到武器透明边 | P4 / P5 |
| F12 | 小兵动画与行军：MinionAnimation、MinionLane | 原图集可暂复用，按统一比例升级 | 实际位移驱动步频；近远程体型、阵营与攻击释放可辨 | P4 |
| F13 | 地砖、雪边、破损、故事贴花：IceFloor、BridgeTiles/Surface/Story/Edge | 重建 tile、过渡和像素纹理规范 | 稳定变体、边界无缝；不会用旧斜投影图重复投影 | P2 / P3 |
| F14 | 桥栏、入口、火盆、杂物：BridgeRails/Props/Lights/Bridgehead | 重做立体模块和连接接口 | 立面有厚度；装饰不自动新增阻挡 | P2 / P3 |
| F15 | 塔/基地/水晶：TowerArt、BuildingAnimation/Motion | 重新设计建筑体量，旧资产按质量评估 | 底座稳定；可攻击塔和装饰建筑区别明确 | P2 / P4 |
| F16 | 建筑避让与通行：Bridge、BridgeInteraction | 复用逻辑轮廓与脚底占地 | 模拟、地图、小地图使用同一语义来源 | P1 / P3 |
| F17 | 脚底排序、建筑淡出、投影：RenderDepth、StructureOcclusion、ArenaScene | 改为三维深度与接触阴影 | 高处不改变脚底逻辑位置；关键战斗提示不被遮住 | P2 / P5 |
| F18 | 法线、环境色、塔光与火光：TerrainNormals、ArenaLighting、EnvironmentalLight | 重新设计材质与光影层级 | 冷暖统一，不洗白角色，不恢复技能/弹道照地灯 | P2 / P5 |
| F19 | 草丛、风场、火星：LivingBrush、BrushMotion、EnvironmentWind | 复用风场计算，升级材质与局部动态 | 草根稳定；近身扰动；视觉草与玩法草分开验收 | P3 / P5 |
| F20 | 深渊、雾、风雪、桥边落雪：AbyssScenery、HowlingAtmosphere、AbyssLife | 用真实纵深与分层环境重建 | 雾主要位于战斗区域以外；动态可关闭 | P3 / P5 |
| F21 | 脚印、雪粉与战场痕迹：SnowContact、SnowTrails、BattlefieldMotion | 接地表查询，重建贴花与粒子 | 有生命周期/数量上限；暂停冻结，重开清理 | P5 |
| F22 | 营地、雪兽与环境生物：BridgeCamp、AmbientWildlife、SnowBeast | 按新版构图决定保留或重做 | 生物不阻挡、不成为战斗目标，危险时退回 | P5 |
| F23 | 音轨、环境音、英雄语音：AudioFeedback、EnvironmentAudio、MapMusic、MovementVoice | 保留资源与行为，重接状态事件 | 用户手势解锁；暂停/静音停止；不增加脚步声 | P4 |
| F24 | DOM HUD、选项与练习入口：LeagueHud、main | 保留功能，统一新环境下配色/比例 | 冷却与血量准确；不复制 ArenaScene 全部字段做接口 | P4 / P5 |
| F25 | 关闭与资源清理：各类 destroy/shutdown、main.beforeunload | 显式释放 GPU 和订阅资源 | 连续五次重开与场景退出资源稳定 | P1 基础 / P5 实机 |

## 宿主耦合审计

`main.ts` 直接访问场景的 match/aim/selectedId、cameraRig、simulationSpeed，以及十余个画质开关，并调用 setMatch、abilityAim 等方法。P1 采用独立页面与最小控制接口，避免向旧启动文件加入分支导致两个更新循环共存。完整 HUD 适配在 P4 进行。

当前事件由 `ArenaScene.update` 调用 `drainEvents()` 一次，依次传给表现与音频。Three.js 宿主必须沿用单次消费原则。地图启动仍依赖 URL 中 `map=howling`，P1 独立入口显式要求这一配置，不顺带重构模拟坐标或全局配置。

## 画面升级约束

“保留”针对功能与视觉信息，不要求保留旧绘制算法或旧图像。全面升级要体现在建筑体量、地表统一、场景层次、光影、角色融合和战斗可读性；P1 灰盒没有上述正式质量结论。最终保留/替换结果在 P2/P4/P5 继续维护。
