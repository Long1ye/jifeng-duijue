# 亚索基础皮肤原版技能声音

来源：本机 `D:\Long1ye\英雄联盟(26)\Game\DATA\FINAL\Champions\Yasuo.wad.client`。只读提取基础皮肤 SFX 音频包、事件包，以及 skin0.bin 中的真实事件名称，没有修改客户端。

事件名对应表用 wwiser v20260808 解析 Wwise HIRC 并生成 TXTP；130 个 WEM 从 audio.bnk 的 DIDX/DATA 中解包；vgmstream r2117 按 TXTP 的原始随机容器/分层/延迟配置解码。运行 MP3 仅裁掉低音量尾音、配平响度并加短淡入淡出，不改变音高。保留 10 个运行片段，原事件名称、哈希、时长、峰值与 RMS 见 manifest.json。

Q：原版出刀与实际命中分开，取代此前合成命中提示。Q3 / EQ3 使用相应风刃释放与命中采样。玩家提供的 Q/Q3 人物声音继续保留。

W：施法瞬间播放原版起手；风墙 startsAt 到 startsAt + W_DURATION 播放独立持续风声，按实际风墙 ID 管理。墙消失、暂停、静音、后台、结算与重开停止；暂停后恢复按墙龄偏移，避免从头重复起手。两个阵营的墙相互独立，远处墙不播放。

E：加入原版冲刺与穿身命中采样。R：保留用户提供的人声，施放播放原版分层连斩，实际伤害帧播放原版落地声，不再吞掉 R 命中声音。技能多人命中同一帧合并音源，前景效果设上限，墙声不会被普通命中挤掉。停止采用 25ms 释放，结束回收音频节点。

流程脚本：scripts/find-yasuo-audio.py、extract-yasuo-banks.py、decode-yasuo-events.py、package-yasuo-client-audio.py。事件 XML、TXTP 与源采样用于溯源；游戏仅加载 runtime/*.mp3。工具放在项目 .cache/riot-audio-tools。

工具来源：https://github.com/vgmstream/vgmstream/releases/tag/r2117 、https://github.com/bnnm/wwiser/releases/tag/v20260808 。音频素材本身来自用户本地客户端，并非网上视频截取。所有运行片段均已实际解码、确认非静音且未削波；相关路由、风墙时序、静音/暂停/后台/重开、节点回收测试通过。程序检查不替代实际听感调整。
