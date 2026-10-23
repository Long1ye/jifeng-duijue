"""Extract the shipped Q VFX with original recorded generation provenance."""
from pathlib import Path
from PIL import Image
import hashlib
import json
import shutil
import zipfile

project = Path(__file__).resolve().parent.parent
original = project.parent / 'pixel-league-of-legends-V2'
output = project / 'exports' / 'yasuo-q-2026-10-22'
output.mkdir(parents=True, exist_ok=True)
prompts = json.loads((project / '.cache/q-original-prompts.json').read_text(encoding='utf-8'))
tasks = [
    ('normal-q/thrust', 'Q1/Q2 出刺风刃', 'yasuo-q-meowa-2026-10-19', 'thrust', 'generated', 2, 100),
    ('normal-q/hit', 'Q1/Q2 命中风雾', 'yasuo-q-meowa-2026-10-19', 'hit', 'hit-generated', 2, 100),
    ('q3/tornado', 'Q3 飞行旋风', 'yasuo-q3-meowa-2026-10-19', 'tornado', 'generated', 4, 125),
    ('q3/hit', 'Q3 命中上升风流', 'yasuo-q3-meowa-2026-10-19', 'hit', 'hit-generated', 2, 100),
]
records = []
for folder, title, asset, key, generated, columns, preview_ms in tasks:
    base = original / 'assets/effects' / asset
    contract = next(record for record in json.loads((base / 'contract.json').read_text(encoding='utf-8')) if record['key'] == key)
    prompt = next(record for record in prompts if record['output'] == f'assets/effects/{asset}/{generated}')
    destination = output / folder
    (destination / 'frames').mkdir(parents=True, exist_ok=True)
    source = original / contract['source']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == contract['sha256']
    runtime = base / 'runtime' / (key + '-atlas.png')
    shipped = project / 'assets/effects' / asset / 'runtime' / (key + '-atlas.png')
    assert runtime.read_bytes() == shipped.read_bytes(), 'Must export the current game asset'
    shutil.copy2(source, destination / 'source-sheet.png')
    shutil.copy2(runtime, destination / 'runtime-atlas.png')
    shutil.copy2(base / 'runtime' / (key + '-preview.webp'), destination / 'preview.webp')
    width, height = contract['cell']
    with Image.open(runtime) as image:
        assert image.size == (1024, 1024) and image.mode == 'RGBA'
        assert image.getchannel('A').getextrema()[0] == 0
        for frame in range(contract['frames']):
            x, y = frame % columns * width, frame // columns * height
            image.crop((x, y, x + width, y + height)).save(destination / 'frames' / f'{frame+1:02}.png')
    with Image.open(destination / 'preview.webp') as preview:
        assert preview.n_frames == contract['frames'] and preview.size == (width, height)
    record = {'title': title, 'folder': folder, 'feature': '通用生成', 'command': 'general-image-run',
              'parameters': {'generation-model': 'image-2.5', 'quality': 'standard', 'resolution': '1K',
                             'aspect-ratio': '1:1', 'remove-bg-method': 'standard', 'template': None,
                             'reference-images': []},
              'actualOutput': {'width': 1024, 'height': 1024, 'mode': 'RGBA', 'columns': columns,
                               'frames': contract['frames'], 'frameSize': [width, height]},
              'prompt': prompt['prompt'], 'historicalCommand': prompt['command'],
              'jobId': contract['job'], 'sourceSHA256': contract['sha256'],
              'runtimeSHA256': hashlib.sha256(runtime.read_bytes()).hexdigest(),
              'postProcessing': contract, 'previewFrameMilliseconds': preview_ms}
    records.append(record)
    (destination / 'generation.json').write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding='utf-8')

(output / 'MEOWA-PARAMETERS.json').write_text(json.dumps(records, ensure_ascii=False, indent=2), encoding='utf-8')
(output / 'PROMPTS.txt').write_text('\n\n'.join(f"【{r['title']}】\n功能：通用生成 general-image-run\n参数：Image2.5 / Standard / 1K / 1:1 / remove-bg-method=standard（透明输出），无模板、无参考图。\n\n原始提示词：\n{r['prompt']}\n\n历史执行命令：\n{r['historicalCommand']}" for r in records), encoding='utf-8')
readme = """亚索 Q 特效提取包（2026-10-22）

来源：当前“疾风对决网页版”实际引用的素材；已与 V2 原始生成记录及图集逐字节核对。
功能：Meowa / meowa.ai 通用生成（general-image-run）。不是 Frame Animation V2。
制作方式：一次生成多帧透明序列图，然后技术切片与整数像素对齐，游戏代码按时间播放。
未重新生成图片，未缩放、重绘、减帧或改变透明边缘。

共四段：
normal-q/thrust：普通 Q1/Q2 出刺风刃，8 帧，512×256，2 列×4 行。
normal-q/hit：普通 Q1/Q2 命中风雾，4 帧，512×512，2 列×2 行。
q3/tornado：Q3 飞行旋风，8 帧，256×512，4 列×2 行。
q3/hit：Q3 命中上升风流，4 帧，512×512，2 列×2 行。

每段内：source-sheet.png 为原始生成成品；runtime-atlas.png 为当前游戏实际图集；
preview.webp 为透明慢放动画；frames/ 为逐帧 PNG；generation.json 为原始提示词与参数。
PROMPTS.txt 汇总四段未经改写的提示词及历史命令。
MEOWA-PARAMETERS.json 汇总参数、任务记录、对齐信息和 SHA-256。
双击 index.html 可在浏览器查看全部动画、暂停及逐帧检查，不需要启动游戏服务。

生成设置：Image2.5；Standard；1K；1:1；remove-bg-method=standard；无模板、无参考图。
实际原始输出均为 1024×1024 RGBA。格子布局是提示词中的要求，不是工具帧数参数。
特别注意：普通 Q 提示词曾写“方形格子”，但实际 2列×4行切片为 512×256，以实测输出为准。

游戏播放与慢放预览不同：
普通 Q：伤害帧前 25 ms 起始，后续 180 ms 消散；前两帧在预热段，后六帧在消散段。
普通 Q 命中：4 帧在 200 ms 内播完。
Q3 旋风：游戏中以 16 FPS 循环；慢放 WebP 为每帧 125 ms。
Q3 命中：4 帧在 320 ms 内播完。
游戏还会按技能方向、挂点、淡入淡出和镜头投影绘制，单独图集预览不会包含全部场景效果。

本包主要提取风刃/旋风与命中特效。角色出剑动作、Q 图标、音效是独立资源，未混作本次生成素材。
"""
(output / 'README.txt').write_text(readme, encoding='utf-8')
cards = [{'title': r['title'], 'image': r['folder']+'/runtime-atlas.png', 'width': r['actualOutput']['frameSize'][0],
          'height': r['actualOutput']['frameSize'][1], 'columns': r['actualOutput']['columns'],
          'frames': r['actualOutput']['frames'], 'ms': r['previewFrameMilliseconds'], 'folder': r['folder']} for r in records]
html = '''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>亚索 Q 特效 · 当前游戏素材</title>
<style>body{margin:32px;background:#15212b;color:#e5edf0;font:15px/1.7 "Microsoft YaHei",sans-serif}h1{color:#dfc78d}main{display:flex;flex-wrap:wrap;gap:24px;align-items:flex-start}section{padding:20px;background:#21313b;border:1px solid #526773;max-width:calc(100vw - 110px)}.stage{overflow:auto}canvas{display:block;image-rendering:pixelated;background:repeating-conic-gradient(#34434c 0% 25%,#293840 0% 50%) 0/24px 24px}button,select{margin:12px 8px 0 0;padding:7px 12px;font:inherit}a{color:#b9e2ee}input{width:220px}small{color:#a8bfca}</style>
<h1>亚索 Q · 特效动画提取</h1><p>当前游戏素材。Meowa 通用生成 → 序列图切片 → 按帧播放。下方为原尺寸慢放，不是游戏中的实际施法速度。</p><p><a href="PROMPTS.txt">查看原始提示词与命令</a> · <a href="MEOWA-PARAMETERS.json">生成参数</a> · <a href="README.txt">提取说明与游戏时序</a></p><main></main>
<script>const clips=CLIPS;let ready=0;for(const clip of clips){const section=document.createElement('section');section.innerHTML=`<h2>${clip.title}</h2><small>${clip.frames} 帧 · ${clip.width} × ${clip.height} · 原尺寸</small><div class="stage"><canvas width="${clip.width}" height="${clip.height}"></canvas></div><button>暂停</button><input aria-label="逐帧" type="range" min="0" max="${clip.frames-1}" value="0"><output></output><p><a href="${clip.folder}/preview.webp">透明 WebP 动画</a> · <a href="${clip.folder}/runtime-atlas.png">运行图集</a> · <a href="${clip.folder}/source-sheet.png">原始生成图</a></p>`;document.querySelector('main').append(section);const canvas=section.querySelector('canvas'),context=canvas.getContext('2d'),button=section.querySelector('button'),slider=section.querySelector('input'),label=section.querySelector('output'),image=new Image();let frame=0,playing=true;const draw=()=>{context.clearRect(0,0,canvas.width,canvas.height);context.imageSmoothingEnabled=false;context.drawImage(image,frame%clip.columns*clip.width,Math.floor(frame/clip.columns)*clip.height,clip.width,clip.height,0,0,clip.width,clip.height);slider.value=frame;label.textContent=` ${frame+1} / ${clip.frames}`};image.onload=()=>{draw();ready++;window.assetPreviewReady=ready===clips.length};image.src=clip.image;button.onclick=()=>{playing=!playing;button.textContent=playing?'暂停':'播放'};slider.oninput=()=>{playing=false;button.textContent='播放';frame=Number(slider.value);draw()};setInterval(()=>{if(playing&&image.complete&&image.naturalWidth){frame=(frame+1)%clip.frames;draw()}},clip.ms)};</script></html>'''
(output / 'index.html').write_text(html.replace('CLIPS', json.dumps(cards, ensure_ascii=False)), encoding='utf-8')
archive = output.with_suffix('.zip')
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as zipfile_out:
    for file in sorted(output.rglob('*')):
        if file.is_file(): zipfile_out.write(file, file.relative_to(output).as_posix())
with zipfile.ZipFile(archive) as zipped:
    assert zipped.testzip() is None
print(json.dumps({'folder': str(output), 'zip': str(archive), 'clips': len(records), 'frames': sum(r['actualOutput']['frames'] for r in records), 'bytes': archive.stat().st_size}, ensure_ascii=False))
