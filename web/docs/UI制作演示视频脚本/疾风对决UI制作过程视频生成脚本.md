# 疾风对决 UI 制作过程视频生成脚本

这是一份可直接交给视频制作 AI 的成片脚本。它用真实素材讲清 UI 从需求到完成的过程，不展开代码实现。默认成片为3分20秒中文横屏视频；正文规定画面与声音，附件保留可核对的Meowa完整输入。

## 直接交给视频 AI 的指令

请根据本文和同目录素材，直接制作一条中文 UI 制作过程演示视频。成片总长200秒，1920×1080，16:9，30fps。主题是疾风对决网页版如何借助AI与Meowa完成UI，不是代码教学。按分镜时间顺序使用提供的真实截图、原始参考图和生成资源，逐镜头采用本文旁白；不要自行新增事实或省略装备白底修正环节。
采用自然、平稳的中文讲解声线，正常语速，镜头剩余时间留给观看。每条旁白在镜头开始0.5秒后播放，并在结束前0.5秒完成；不得机械拉伸音频。逐句生成中文字幕，每行尽量不超过18个汉字，最多两行；字幕放在画面底部安全区，必要时上移，避免挡住HUD。镜头标题与旁白字幕分开排布。背景音乐使用有授权的轻量器乐，若无可用授权音乐则不加；旁白始终清晰。
画面使用深蓝灰背景、少量金色和青色标注；同一时刻只突出一个信息点。截图等比显示，不拉伸、不伪造界面文字，不把裁剪后的空白区域补成新游戏内容。需要放大的图标用最近邻缩放；跨截图转场使用0.3秒淡入淡出，叠加在原镜头时间内，不增加总时长。不要使用3D旋转、花哨转场或大段英文提示词。
素材包提供的是静态截图与美术资源，没有实际操作录像。请用缩放、描边、箭头和前后对比制作演示，不合成“点击后成功购买”“施法命中”等虚假实录；对制作步骤的文字动画标注“制作流程示意”。Meowa参数使用文字叠层说明，不伪造平台截图；文中主画面参数和附件完整提示词用途不同，长提示词不用念出。
交付MP4成片、SRT字幕及可编辑项目。若当前工具不能渲染视频，说明缺少的能力并交付可渲染项目，不用一段泛化的视频提示词代替完整制作。所有引用路径相对于本文所在文件夹。

## 逐镜头脚本

### 镜头 01  0—16秒  先看完成后的界面

画面：0—5秒完整展示开始界面；5—10秒切商店截图；10—16秒将底部 HUD 放大居中。依次出现片名和本期目标，不模拟点击。

旁白：这是疾风对决网页版。接下来，我们用这套界面，演示怎样借助 AI 整理需求，用 Meowa 制作像素资源，再把菜单、战斗面板和装备商店统一起来。

画面重点字幕：疾风对决网页版 UI 制作过程

素材：images/01-start.png；images/05-shop.png；images/02-hud.png

制作备注：片名停留4秒。首镜直接出现游戏成品，不放代码或聊天记录。

### 镜头 02  16—34秒  先把玩家要看的信息摆清楚

画面：16—23秒展示参考 HUD，用三个简短标注指出英雄信息、技能、装备；23—34秒切成品 HUD，在对应区域依次描边。

旁白：先明确玩家最常看的信息：英雄状态、技能和装备。把它们集中在屏幕底部，保持熟悉的位置。数值、快捷键和升级按钮由 AI 实现，画面重点留给信息层级。

画面重点字幕：先确定布局 再制作美术

素材：inputs/hud-layout.png；images/02-hud.png

制作备注：描边是视频标注，不改动截图。不要将剑意条标为蓝量。

### 镜头 03  34—54秒  制作开始界面的氛围

画面：34—42秒展示纯冰桥背景，叠加简洁的 Meowa 参数文字；42—54秒交叉淡入实际开始界面，标注模式选择和胜利条件。

旁白：开始界面先做一张冰桥背景。在 Meowa 里用通用生成，选择 Image 二点五、精细质量、二 K 和十六比九。再让 AI 加上标题、模式按钮和胜利条件，形成进入游戏的入口。

画面重点字幕：冰桥背景加菜单交互

素材：images/menu-background.png；images/01-start.png

制作备注：参数文字：通用生成／Image2.5／精细／2K／16:9。提示词见制作卡，画面不铺满英文。

### 镜头 04  54—80秒  一次生成一套 HUD 图标

画面：54—60秒并排展示两张参考图；60—70秒展示八图标总图，按上排到下排依次高亮；70—80秒切实际 HUD，展示图标落位。像素素材使用最近邻缩放。

旁白：技能图标先准备参考图，再用界面生成，一次画出头像、被动、四个技能和两个召唤师技能。要求深蓝底色、统一金边和清楚的像素轮廓。生成总图后分离组件，放入 HUD；其中 R 和被动后来又单独参考原图重绘。

画面重点字幕：参考图 → 八图标总图 → 游戏 HUD

素材：images/eight-icons-sheet.png；inputs/hud-layout.png；inputs/hud-r-ready.png；images/02-hud.png

制作备注：参数：1K／16:9／普通质量／标准去背景／组件分离开启。历史生成模型未记录，不补写为确定型号。

### 镜头 05  80—98秒  让战斗信息一眼可读

画面：HUD 截图居中，占画面宽度约85%。80—86秒高亮属性区；86—92秒高亮技能等级和加号；92—98秒高亮血条与装备槽。画面下方补一行制作目标。

旁白：图标做好后，再检查实际使用。属性要常驻可见，技能等级和升级入口要清楚，血条不能被提示挡住。这里的目标，是让玩家在战斗中快速读到信息。

画面重点字幕：属性常驻 技能升级清楚 血条不遮挡

素材：images/02-hud.png

制作备注：静态截图标注演示，不绘制虚假的数值变化或升级结果。

### 镜头 06  98—118秒  把操作说明放在玩家需要的位置

画面：98—109秒展示指引面板，按图中实际内容高亮鼠标操作、技能和装备说明；109—118秒切设置截图，高亮操作与视频页签，叠加 F10 字样。

旁白：新手指引做成可以折叠的操作面板，玩家需要时随时查看。技能说明和施法方式集中整理，设置用 F 十打开。界面说明保持简短，减少玩家边打边找按钮的负担。

画面重点字幕：随时查看操作指引 F10 打开设置

素材：images/03-guide.png；images/04-settings.png

制作备注：不要将 Esc 写成设置快捷键，也不生成未提供实录的施法或全屏切换画面。

### 镜头 07  118—146秒  将装备统一为像素图标

画面：118—126秒展示药瓶原图与像素版；126—138秒用文字呈现精确像素生成的参数和完整中文提示词；138—146秒切长剑对比，出现“全量输出 229 张 64×64 图标”。对比图标以整数倍放大。

旁白：装备使用每件原版图标作为参考。在 Meowa 的精确像素生成里，设为六十四乘六十四，选择 Nano Banana，开启强力像素化。提示词只有一句：保持原有的朝向和美术风格，变为像素化。最终整理出二百二十九张装备图标。

画面重点字幕：保持原有的朝向和美术风格，变为像素化

素材：images/item-2031-original.png；images/item-2031-white.png；images/item-1036-original.png；images/item-1036-white.png

制作备注：参数同时列出：人像模式／去背景关闭／填满画布关闭。3024 的模型回退记录保留在附件，不占主画面。

### 镜头 08  146—168秒  解决白色背景太明显的问题

画面：146—153秒三列并排：原版、初次像素版、深色背景版。使用药瓶与长剑的独立素材，不沿用比较图中“当前像素版”的旧标签。153—161秒切无尽之刃；161—168秒展示比较总图，字幕明确中列是修正前。

旁白：第一轮像素图出现了明显白底，放进深色界面很突兀。对照原版后，先去掉白色背景，再恢复接近原图的深色氛围，同时保留装备的高光。这样，小图标放进商店和装备栏就更协调。

画面重点字幕：原版 → 像素化初稿 → 深色背景修正版

素材：images/background-comparison.png；images/item-2031-dark.png；images/item-3031-dark.png

制作备注：强调接近原版深色调，不宣称背景逐像素一致。227张修正白底，另外2张保留已有背景。

### 镜头 09  168—188秒  回到游戏里检查整体效果

画面：168—179秒商店截图全貌，依次高亮装备列表、合成信息和装备槽；179—184秒展示底部 HUD；184—188秒展示商人摊位素材，并标注“场景中的商店入口素材”。

旁白：资源完成后，统一替换商店和装备栏，检查小尺寸下的辨识度、合成信息和整体配色。商人摊位也沿用冰桥的冷色阴影与暖色灯光，让场景入口和界面保持同一套美术语言。

画面重点字幕：检查商店 装备栏 场景入口

素材：images/05-shop.png；images/02-hud.png；images/shop-prop.png

制作备注：摊位是独立素材展示，不拼接成伪造的游戏实录。不把229件无重复图像误说成229种完全不同装备功能。

### 镜头 10  188—200秒  收束制作流程

画面：188—194秒菜单、HUD、商店三张截图依次切换；194—200秒定格商店，居中出现三步流程。最后1秒淡出。

旁白：整个过程可以归为三步：说清界面需求，用 Meowa 统一资源，再回到游戏中检查效果。代码交给 AI，创作者把精力放在画面和体验上。

画面重点字幕：明确需求 → 统一资源 → 游戏内检查

素材：images/01-start.png；images/02-hud.png；images/05-shop.png

制作备注：结尾不加购买引导、平台广告或未核实的承诺。

## Meowa 制作卡

以下是生成资源的输入与输出说明。完整提示词以 Meowa资源复刻配方.json 为准；视频中的参数叠层使用简写，避免让观众阅读长提示词。

### 开始界面背景

配方 ID：menu-overview

功能与输入：通用生成；Image2.5；精细；2K；16:9。输入是描述冰桥环境的文字，没有参考图。

提示词重点：俯视冰桥、冷蓝灰石材、积雪、少量暖火光、明确像素簇；不包含角色、界面和文字。完整原词见附件同名配方。

输出：输出2048×1152背景图；成品再叠加菜单标题与按钮。

### HUD 图标

配方 ID：hud-eight

功能与输入：界面生成；1K；16:9；普通；标准去背景；开启组件分离。输入为 inputs 中的 hud-layout 与 hud-r-ready 两张图。

提示词重点：两行四列，共八个独立方形图标；顺序为头像、被动、Q、W、E、R、D、F；深蓝内部、薄金边，不含文字数字。完整英文原词见附件。

输出：输出1536×864八图标总图，再分离用于HUD。历史模型未留存，复刻可选Image2.5，此项是建议。

### R 和被动补绘

配方 ID：yasuo-r / yasuo-passive

功能与输入：通用生成；1K；1:1；精细；关闭去背景；各输入一张官方图，见 inputs 文件夹。

历史原始提示词与模型未留存。附件的 suggested_prompt 是复刻建议，不能在视频中称为历史原词。

输出：各输出1024×1024不透明PNG，分别替换对应HUD图标。

### 装备全量像素化

配方 ID：equipment-229

功能与输入：精确像素生成；64×64；Nano Banana；人像模式；去背景关闭；填满画布关闭；强力像素化开启。输入为每件原版装备图标。

完整提示词：保持原有的朝向和美术风格，变为像素化

输出：输出229张64×64PNG。3024生成失败后回退Image2，详见附件；首轮部分有白底。

### 装备背景修正

配方 ID：equipment-background

功能与输入：像素去背景；普通质量；每批最多16张；关闭保留半透明。输入为首轮像素图标的无损WebP。

此步骤没有生成提示词。去背景得到透明结果，再保留前景颜色并合成原版深色氛围。合成不是Meowa文字生成。

输出：最终229张64×64深色图标；227张修正白底，2055和3072保留原有背景。

### 场景商人摊位

配方 ID：sanctuary-stall

功能与输入：通用生成；Image2.5；极致；1K；1:1；标准去背景。文字输入，无参考图。

提示词重点：俯视商摊、酒红积雪棚、暖灯、剑架和药瓶；无人物、无地板、无文字。完整原词见附件。

输出：输出1024×1024透明PNG，作为场景商店入口素材。

## 素材与事实边界

images 内是当前游戏截图和实际美术产物；inputs 内是参考图。视频分镜.json 与本文时间线完全一致。旁白.txt 可直接用于中文配音。Meowa资源复刻配方.json 保存完整历史提示词，含已退出当前版本的16件装备图集记录；那些历史方案不应作为当前成品展示。

当前成品基于独立项目“疾风对决网页版”0.1.3；装备目录为229条。制作顺序依据“安装 game-assets skill”“恢复稳定版游戏 UI”“设计新手操作指引”“制作游戏开始界面”“重做英雄属性与技能窗口”“引入英雄联盟装备系统”六段对话及后续装备像素化、背景修正记录归纳。镜头按讲解顺序编排，不冒充逐日时间线。

现有素材足够制作静态素材动效版。需要真实游玩或购买动画时，必须另行录屏；本文没有提供此类录像。图标前后对比是同一装备的风格迭代，不表示新增装备。

交付检查：视频应为200秒，旁白逐句与本文一致，中文字幕可读，截图无拉伸，像素图无模糊，主画面没有代码，白底修正前后清晰可见。

## 完整提示词附件

下列内容用于AI读取核对，不要求在视频画面或旁白中逐字呈现。

```json
[
  {
    "id": "hud-eight",
    "status": "historical_prompt_verified",
    "function": "UI generation ui-gen-run",
    "prompt": "Create a crisp pixel-art MOBA HUD icon sheet inspired by the reference interface. Exactly eight separate square icons in two rows of four, read left to right. Top row: portrait of Yasuo, the dark-haired wind swordsman with high ponytail and blue scarf; passive skill, a cyan wind shield with a small sword; Q, silver katana thrust with pale blue wind; W, upright cyan wind barrier. Bottom row: E, a blue swordsman silhouette dashing forward; R READY, bright silver diagonal sword in a violet airborne vortex, fully colored and illuminated; D, golden flash; F, a red-orange flame. All eight icons have consistent thin stepped antique-gold pixel borders and opaque dark navy interiors. Authentic carefully clustered 48-pixel-game artwork with visible square pixels, limited colors, strong silhouettes and hard edges, no smooth painted shading. Equal square icons, generous fully transparent gaps, transparent sheet background. Only these eight icons. No letters, numbers, level badges, equipment, gold counters, buff strips, upgrade arrows or interface panel. Use reference only for icon meaning and palette; redraw all eight in matching pixel art.",
    "references": [
      "inputs/hud-layout.png",
      "inputs/hud-r-ready.png"
    ],
    "parameters": {
      "mode": "generate",
      "quality": "standard",
      "resolution": "1K",
      "aspect_ratio": "16:9",
      "remove_bg_method": "standard",
      "split_components": true,
      "generation_model": "historical model not recorded; Image2.5 suggested for new runs"
    },
    "job_id": "job_8985ee41f61e478fafb6aa4ccbfbc30a",
    "output": {
      "size": [
        1536,
        864
      ],
      "file": "images/eight-icons-sheet.png",
      "crop_records": [
        {
          "id": "portrait",
          "file": "runtime/portrait.png",
          "bbox": [
            106,
            121,
            382,
            398
          ],
          "width": 276,
          "height": 277,
          "pixels_preserved": true,
          "sha256": "2ed38dfb37dfac1b41fc35038be964863831ffe70192de17f523ef157bd672a0"
        },
        {
          "id": "passive",
          "file": "runtime/passive.png",
          "bbox": [
            457,
            121,
            735,
            398
          ],
          "width": 278,
          "height": 277,
          "pixels_preserved": true,
          "sha256": "e525a331caa73ea16bc397bbd082c4ee780ee0ad03fc67a8ba849160a870bda4"
        },
        {
          "id": "q",
          "file": "runtime/q.png",
          "bbox": [
            807,
            121,
            1085,
            398
          ],
          "width": 278,
          "height": 277,
          "pixels_preserved": true,
          "sha256": "837044a2dcb4574650c8d0dc0df72c4f9bae3b52df32290b4c1da660f012db53"
        },
        {
          "id": "w",
          "file": "runtime/w.png",
          "bbox": [
            1156,
            121,
            1432,
            398
          ],
          "width": 276,
          "height": 277,
          "pixels_preserved": true,
          "sha256": "488f2b93d4af6d58fdacfde8f69c59cce85cb97af26c3d6201bfec2769f9eb05"
        },
        {
          "id": "e",
          "file": "runtime/e.png",
          "bbox": [
            107,
            477,
            382,
            753
          ],
          "width": 275,
          "height": 276,
          "pixels_preserved": true,
          "sha256": "0a28437a0a92978455e0c94b67e12896d7e4203db0e8c40575ae6912f024a1c1"
        },
        {
          "id": "r",
          "file": "runtime/r.png",
          "bbox": [
            458,
            477,
            734,
            753
          ],
          "width": 276,
          "height": 276,
          "pixels_preserved": true,
          "sha256": "fdbb915afe0293d9fdb4c3ca7fde65a0979a194367b8eb8c9e48348b2f9ffd8b"
        },
        {
          "id": "d",
          "file": "runtime/d.png",
          "bbox": [
            807,
            477,
            1084,
            753
          ],
          "width": 277,
          "height": 276,
          "pixels_preserved": true,
          "sha256": "51c1db57e4e841c9e80e4b73e6d61a124923a5c8f54063135bd2a4ce978c9ca0"
        },
        {
          "id": "f",
          "file": "runtime/f.png",
          "bbox": [
            1157,
            477,
            1432,
            753
          ],
          "width": 275,
          "height": 276,
          "pixels_preserved": true,
          "sha256": "164cba1195d851a140c476085bdcbd8cb97b0dde309ecb2e92e97751b5351c02"
        }
      ]
    }
  },
  {
    "id": "yasuo-r",
    "status": "historical_prompt_missing",
    "prompt": null,
    "suggested_reproduction_prompt": "参考输入图，重绘亚索狂风绝息斩技能图标。保留深蓝背景、交错的青蓝刀光和横贯下半部的弧形亮刃，使用清晰方形像素簇，与现有冰桥 HUD 配色一致。单个正方形图标，不添加文字、数字或外部界面。",
    "references": [
      "inputs/official-yasuo-r.png"
    ],
    "function": "general-image-run",
    "parameters": {
      "resolution": "1K",
      "aspect_ratio": "1:1",
      "quality": "detailed",
      "remove_bg_method": "none",
      "reference_count": 1,
      "generation_model": "historical model not recorded; Image2.5 suggested"
    },
    "job_id": "job_aa0a92e9ef8a4afa88ce52685dc3e11e",
    "output": {
      "size": [
        1024,
        1024
      ],
      "format": "opaque RGB PNG",
      "file": "assets/ui/yasuo-r-icon-2026-10-15/runtime/r.png"
    }
  },
  {
    "id": "yasuo-passive",
    "status": "historical_prompt_missing",
    "prompt": null,
    "suggested_reproduction_prompt": "参考输入图，重绘亚索浪客之道被动图标。保留环绕的青蓝气流、中央深色剑客剪影和少量金色细节，使用清晰像素轮廓和深色不透明背景，与现有冰桥 HUD 一致。不添加文字、数字或其他图标。",
    "references": [
      "inputs/official-yasuo-passive.png"
    ],
    "function": "general-image-run",
    "parameters": {
      "resolution": "1K",
      "aspect_ratio": "1:1",
      "quality": "detailed",
      "remove_bg_method": "none",
      "reference_count": 1,
      "generation_model": "historical model not recorded; Image2.5 suggested"
    },
    "job_id": "job_d4c0808d8946466fbf93c1ee26a24e4f",
    "output": {
      "size": [
        1024,
        1024
      ],
      "format": "opaque RGB PNG",
      "file": "assets/ui/yasuo-passive-icon-2026-10-15/runtime/passive.png"
    }
  },
  {
    "id": "menu-overview",
    "status": "historical_prompt_verified",
    "function": "general-image-run",
    "prompt": "HA01. A beautiful pure gameplay environment target for a pixel art action RPG, inspired by the detailed pixel craftsmanship and stone architecture of Eldest Souls and the atmospheric environmental richness of Hunt the Night. The subject is the Howling Abyss: an ancient Freljord stone bridge suspended above a freezing blue abyss. One coherent wide scene from a fixed steep overhead orthographic gameplay camera. The route flows from a blue team sanctuary platform on the lower left, through an outer defensive tower and its broad circular stone apron, to an open central bridge crossing toward the upper right. The bridge has substantial broken parapets, carved Nordic stone guardians, icy supporting arches and distant cliffs below. Large individually weathered slate flagstones, smaller dark repair cobbles, worn geometric Freljord carvings, frost lodged in joints, wind-shaped snowbanks along the edges, translucent ice over exposed stone and scattered broken masonry form naturally interlocking ground materials. Keep the middle walking route broad and quiet with readable stone surfaces. Cold desaturated blue grey architecture, pale snow, restrained cyan ice crystals and a few small warm braziers. Deliberate crisp pixel clusters and rich material detail at a consistent pixel scale, finished game environment art rather than a 3D render or a painterly illustration. No characters, interface, lettering, labels, arrows, borders or presentation panels.",
    "references": [],
    "parameters": {
      "generation_model": "image-2.5",
      "quality": "detailed",
      "resolution": "2K",
      "aspect_ratio": "16:9"
    },
    "output": {
      "size": [
        2048,
        1152
      ],
      "file": "assets/map-concepts/howling-abyss-target-v1/01-overview.png"
    }
  },
  {
    "id": "retired-atlas-v1",
    "status": "retired_historical_prompt_verified",
    "function": "general-image-run",
    "prompt": "Create a production game item icon atlas, exactly 4 columns and 4 rows of equally sized square icons, edge to edge with no gutters, no text or numbers. Hand-painted fantasy pixel style, rich jewel colors, dark navy backgrounds and thin antique gold borders, recognizable silhouettes at small HUD size, suitable for an icy MOBA battlefield. Row 1: simple steel longsword, silver dagger, brown leather boots, bronze sword with red ruby. Row 2: purple luminous cloak, heavy steel pickaxe, broad golden greatsword, red vampiric curved scepter. Row 3: turquoise recurve bow, twin silver blades with green energy, large red ruby, folded steel chain armor. Row 4: armored golden berserker boots with orange wings, legendary golden infinity sword radiating amber light, crossed spectral swords with teal mist, black curved ruined king blade glowing emerald. Exactly one item per square, consistent scale, fill each icon with the item and its subtle magical background.",
    "references": [],
    "parameters": {
      "generation_model": "image-2.5",
      "quality": "ultimate",
      "resolution": "2K",
      "aspect_ratio": "1:1"
    },
    "job_id": "job_c55efa7e77614a3f800b249dac3d1f58",
    "output": {
      "size": [
        2048,
        2048
      ],
      "layout": "4x4",
      "cell": [
        512,
        512
      ],
      "file": "assets/ui/equipment-2026-10-20/runtime/item-atlas.png"
    }
  },
  {
    "id": "retired-atlas-v2",
    "status": "retired_historical_prompt_verified",
    "function": "image-edit-run",
    "prompt": "Redesign this complete sixteen-item MOBA equipment atlas for clearer recognition in a tiny inventory. Keep exactly the same 4 by 4 grid, equal square cells, order and opaque square format. Use cohesive hand-painted fantasy pixel-style objects, large clean silhouettes, simple dark backgrounds, restrained magical accents, and thin antique-gold borders. Remove the detailed castle scenery and decorative border corners so the objects dominate. No text or numbers. Row 1: a plain slender steel longsword with brown grip; a short triangular silver dagger; simple brown leather boots; a broad curved bronze Doran sword with a red gem and red grip. Row 2: a folded purple agility cloak; a rugged iron pickaxe with wooden handle; a massive broad SILVER two-handed greatsword with dark steel fittings and icy blue highlights, clearly different from the golden legendary sword; a hooked dark vampiric scepter holding a crimson orb. Row 3: a compact recurved wooden and turquoise bow with a visible bowstring; two curved ivory dueling blades crossing over a restrained MAGENTA aura; a single large vivid ruby; a padded tan CLOTH vest with stitches and fabric folds, no metal plates or chainmail. Row 4: a single heavy golden berserker boot with a red-orange wing motif; an ornate GOLD legendary infinity sword with a small infinity-shaped guard and amber edge; two slim spectral TEAL swords in a ghostly dance; a heavy jagged BLACK ruined king sword with an emerald glowing fissure. Keep gold light reserved for legendary equipment. Each whole object fits inside its cell with consistent small padding. Preserve readable shapes at 32 and 48 pixels.",
    "references": [
      "assets/ui/equipment-2026-10-20/runtime/item-atlas.png"
    ],
    "parameters": {
      "mode": "hd",
      "generation_model": "image-2.5",
      "quality": "ultimate",
      "resolution": "2K",
      "remove_bg_method": "none"
    },
    "job_id": "job_618a17613ee34b1b9df33dcda7108d8b",
    "output": {
      "layout": "4x4",
      "cell": [
        512,
        512
      ],
      "format": "lossless WebP",
      "file": "assets/ui/equipment-icons-v2-2026-10-20/source-atlas.png"
    }
  },
  {
    "id": "sanctuary-stall",
    "status": "historical_prompt_verified",
    "function": "general-image-run",
    "prompt": "One small fantasy weapon merchant stall as a transparent game prop, isometric three-quarter view seen from above, matching a hand-painted pixel-style snowy ancient stone bridge MOBA. A low wooden counter under a short faded burgundy cloth awning dusted with snow. Two warm amber hanging lanterns, a hanging wooden shield-shaped sign with a golden sword symbol and no writing, a rack of steel swords, a few glowing cyan and red potion bottles, a wooden chest and two little supply crates at the sides. Compact silhouette, low enough to sit beside a tall existing sanctuary building without obscuring it. Front of stall faces toward bottom of image. No people, no background, no floor tile, no text. Center complete prop with transparent padding around all sides, crisp detailed materials, cold blue shadows and warm shop lighting.",
    "references": [],
    "parameters": {
      "generation_model": "image-2.5",
      "quality": "ultimate",
      "resolution": "1K",
      "aspect_ratio": "1:1",
      "remove_bg_method": "standard"
    },
    "job_id": "job_4b180f8a4982479ca4fc311f3033e3f2",
    "output": {
      "size": [
        1024,
        1024
      ],
      "format": "RGBA PNG",
      "file": "assets/map-modules/sanctuary-shop-2026-10-20/runtime/shop.png"
    }
  },
  {
    "id": "equipment-229",
    "status": "historical_prompt_verified",
    "function": "custom-size-pixel-gen-run",
    "prompt": "保持原有的朝向和美术风格，变为像素化",
    "references": [
      "assets/ui/league-items-16.20.1/<id>.png"
    ],
    "parameters": {
      "width": 64,
      "height": 64,
      "generation_model": "nano-banana",
      "content_mode": "portrait",
      "remove_bg_method": "none",
      "fill_canvas": false,
      "strong_pixelation": true,
      "overrides": {
        "3024": "image-2"
      }
    },
    "output": {
      "count": 229,
      "size": [
        64,
        64
      ],
      "file": "assets/ui/equipment-pixel-64/<id>.png"
    }
  },
  {
    "id": "equipment-background",
    "status": "verified_processing_recipe",
    "function": "remove-background-run then deterministic composition",
    "prompt": null,
    "references": [
      "lossless WebP batch of up to 16 source icons"
    ],
    "parameters": {
      "mode": "pixel",
      "quality": "standard",
      "remove_bg_batch_size": 16,
      "preserve_translucency": false,
      "background": "original.resize((64,64), BOX).GaussianBlur(12) * 0.22",
      "retained_ids": [
        2055,
        3072
      ]
    },
    "output": {
      "count": 229,
      "size": [
        64,
        64
      ],
      "file": "assets/ui/equipment-pixel-dark-64/<id>.png",
      "changed_backgrounds": 227
    }
  }
]
```