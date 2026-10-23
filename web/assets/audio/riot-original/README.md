# 英雄联盟公开原声音频

当前覆盖：亚索普通 Q／EQ、Q3／EQ3 与 R 已改用 `../yasuo-user-v1/` 中的用户素材；本目录原 Q、Q3、R 六个片段保留归档，但运行时不再加载。其余普攻、W、E 和卡牌音效继续使用本目录片段。

本目录是 Riot Games 公开音频的下载、截取与转码，不是 AI 生成素材，也不是完整客户端 Wwise 独立声库。版权归原权利人。来源、裁切时间与增益、运行时文件 SHA-256 及解码指标分别记录在 `sources.json`、`cuts.json`、`validation.json`。

- BGM：[League of Legends 官方 SoundCloud《Howling Abyss – Early Game》](https://soundcloud.com/leagueoflegends/howling-abyss-early-game)。使用公开可播放的完整约 313.7 秒 AAC 流并转为 MP3；没有使用需登录的原始下载文件或 30 秒试听替代整曲。
- 亚索：[官方英雄页](https://www.leagueoflegends.com/en-us/champions/yasuo/)中的基础皮肤技能演示 MP4 音轨，媒体源在 Riot CDN。提取普攻、Q、Q3、W、E、R 的出手／接触片段。
- 卡牌：[官方英雄页](https://www.leagueoflegends.com/en-us/champions/twistedfate/)中的 WebM 音轨。该页 MP4 返回 403，使用同页可访问的 WebM。提取普通投牌、万能牌、选牌和红牌命中。项目现有红方 E 为范围攻击，暂配红牌范围命中片段，不把它描述成原版卡牌主动 E。

演示片段可能包含同期场景声音与混音，不能等同于干净的客户端单音效。截取时结合动作缩略图与 100ms RMS 定位动作窗口；只进行短淡入淡出、静态音量配平和 MP3 转码，不改变音高或语音。没有添加独立脚步声事件。

`runtime` 包含 16 段技能／攻击片段及 1 首完整 BGM，总计约 6.46 MB。短音效使用已有手势解锁的 AudioContext 缓存解码，重复命中合并，最多 8 个原声节点；BGM 使用隐藏的 HTMLAudioElement 流式播放，避免整曲解码成大 PCM 缓冲。音效总开关默认关闭，音乐另有开关和音量滑杆，暂停、结束、隐藏页面和静音时暂停，重开复位曲目位置。英雄交战时降低音乐音量。

16 个短片段和 BGM 均实际解码，峰值不超过 1，RMS 均高于 0.005，避免把静音段当作普攻或出刀声；这些是定量验证，不代表已经完成听觉验收。浏览器验证 BGM `duration≈313.655`、`paused=false`、`readyState=4`，暂停后 `paused=true`；开启原声并施放 Q 后未记录控制台错误。
