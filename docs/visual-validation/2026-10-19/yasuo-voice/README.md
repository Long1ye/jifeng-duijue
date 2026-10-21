# 完整基础中文语音接入

2026-10-19，按用户提供的原版客户端资源接入。[进入游戏及实际引擎录音](preview.html) / [完整 91 条分类试听](../../../../assets/audio/yasuo-voice-zh-v1/index.html)。范围为基础皮肤中文，其他皮肤不混入。

实现入口：`YasuoVoiceAudio.ts`、`AudioFeedback.ts`、`OriginalCombatAudio.ts`、`ThreeAudio.ts` 及两个入口的 `1/2/4` 快捷键。完整来源和触发范围见 [素材记录](../../../../assets/audio/yasuo-voice-zh-v1/README.md)。新增 91 个压缩音频约 3.85MB，首次用户操作后以 4 个并发任务载入；解码缓存共享于本音频实例，限制每个英雄一个语音源，释放时清空。

验证：

- 解析出的 bank 91 个 sourceID 全部对应运行时媒体，没有遗漏；29 组事件保留变体和共用关系。
- 全量测试 161 文件 878 项通过；最终补充 Q 层数及结束帧死亡传递测试后，专项 6 文件 30 项通过。最终生产构建通过。
- `node scripts/validate-yasuo-voice.mjs` 使用真实 Chrome AudioContext 解码全部 91 条，逐条检查时长、RMS 和峰值，errors/failures 为空，详见 [报告](report.json)。初次编码发现部分 MP3 解码峰值过高，已降低编码前峰值余量并重新逐条通过验证。
- `integration.webm` 是实际 AudioFeedback 经 MediaStreamDestination 录制的 6.6 秒音频，顺序为移动→Q→R→死亡。各事件触发时只有对应英雄的一条 VO 活跃。该录音为事件注入的音频引擎验证，不宣称真实玩家比赛录像。
- 实际 `/three.html?map=howling&scene=central` 在真实点击解锁后按 `1`，浏览器创建并启动一条 9.01 秒的玩笑语音源。
- 测试覆盖缓存、20 条移动变体、优先级/连招合并、死亡、暂停/静音/隐藏/重开、释放、攻击台词不被普通更新切断、表情冷却及无旧混合语音重复。

当前对局没有其他英雄身份，专属角色互动不自动触发；素材可在完整试听库检查。未加入聊天字幕或原游戏未在本基础 bank 中提供的事件。
