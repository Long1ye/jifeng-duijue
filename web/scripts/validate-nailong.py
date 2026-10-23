"""Validate runtime atlases and compare visible height with the existing Yasuo art."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
import json

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'assets/heroes/nailong'
OUT=ROOT/'.cache/nailong-qa'
OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((ASSETS/'manifest.json').read_text(encoding='utf-8'))
directions=['e','se','s','sw','w','nw','n','ne']
report={}
comparison=Image.new('RGBA',(1152,310),(36,43,54,255))
walks=Image.new('RGBA',(1024,1024),(36,43,54,255))
for i,d in enumerate(directions):
    with Image.open(ASSETS/('idle-'+d+'.png')) as im: idle=im.convert('RGBA')
    with Image.open(ROOT/'assets/heroes/yasuo/locomotion16-2026-10-15/runtime'/('idle-'+d+'.png')) as im: yasuo=im.convert('RGBA').crop((0,0,128,128))
    comparison.alpha_composite(idle,(i*144,0));comparison.alpha_composite(yasuo,(i*144,160))
    draw=ImageDraw.Draw(comparison);draw.text((i*144+55,133),d,fill='white');draw.line((i*144,119,i*144+128,119),fill='#88aacc');draw.line((i*144,275,i*144+128,275),fill='#88aacc')
    h=idle.getbbox()[3]-idle.getbbox()[1];yh=yasuo.getbbox()[3]-yasuo.getbbox()[1]
    assert abs(h-yh)<=4,(d,h,yh)
    path=ASSETS/('walk-'+d+'.png')
    assert path.exists(),'Missing walk direction '+d
    with Image.open(path) as im: sheet=im.convert('RGBA')
    assert sheet.size==(1024,128),(d,sheet.size)
    frames=[sheet.crop((f*128,0,(f+1)*128,128)) for f in range(8)]
    assert all(f.getchannel('A').getextrema()==(0,255) for f in frames)
    assert all(f.getbbox() for f in frames)
    assert all(f.getbbox()[3]<=119 for f in frames),(d,'feet below anchor')
    assert len({f.tobytes() for f in frames})>=4,(d,'not enough distinct motion frames')
    walks.alpha_composite(sheet,(0,i*128))
    report[d]={'idle_height':h,'yasuo_height':yh,'walk_frames':len(frames),'walk_bounds':[f.getbbox() for f in frames]}
for name,count,w,h in [('attack',39,128,128),('fire',12,184,120),('fire-hit',11,184,120)]:
    with Image.open(ASSETS/(name+'.png')) as im:
        frames=[im.crop((f%8*w,f//8*h,(f%8+1)*w,(f//8+1)*h)) for f in range(count)]
    assert all(f.getbbox() and f.getchannel('A').getextrema()==(0,255) for f in frames),name
    report[name]={'frames':count,'cell':[w,h]}
comparison.resize((2304,620),Image.Resampling.NEAREST).save(OUT/'size-comparison.png')
walks.save(OUT/'walk-contact-sheet.png')
(OUT/'validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print('Validated 8 directional walk loops, 39 attack frames, 12 flame frames, 11 impact frames; Yasuo height delta <= 4 pixels.')
