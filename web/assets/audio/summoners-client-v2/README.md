# 闪现与点燃原版声音

只读来源：用户本机 League 客户端 `Game/DATA/FINAL/Maps/Shipping/Common.wad.client` 中的 `misc_gameplay_sfx_audio.bnk` 与事件包。未修改客户端。

从 `data/maps/shipping/common/common.bin` 读取真实事件名称，wwiser v20260808 还原随机容器，vgmstream r2117 解码 TXTP，FFmpeg 配平响度并添加 5ms 进入、25ms 退出。保留原音高；运行音频位于 `runtime/`，事件、SHA256、时长、峰值、RMS 记录在 `manifest.json`。

| 文件 | 原事件 | 用途 |
| --- | --- | --- |
| flash.mp3 | Play_sfx_SummonerFlash_OnCast | 成功闪现时播放一次 |
| ignite-cast.mp3 | Play_sfx_SummonerDot_OnHit | 点燃附着瞬间播放一次 |
| ignite-burn.mp3 | Play_sfx_SummonerDot_OnBuffActivate | 目标身上的持续燃烧声 |

`SummonerAudio` 直接跟随真实召唤师效果实例，避免依赖不存在的英雄 cast 事件。暂停、静音、后台停止声音；恢复时持续燃烧从当前状态偏移播放，闪现及点燃起手不重播。目标死亡、效果移除或到期会释放点燃两层声音。声音按距离衰减，所有退出添加 25ms 淡出。

复现流程：`discover-summoner-banks.py` → `extract-summoner-audio.py` → `resolve-summoner-events.py` → `package-summoner-audio.py`。中间银行、WEM、TXTP 和解析文件只放在 `.cache/summoner-client/`，前端仅加载三个 MP3。
