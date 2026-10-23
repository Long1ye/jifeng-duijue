"""Extract user animation frames, key their green screens, and pack runtime atlases."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageSequence
import io, json, zipfile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r'D:\Long1ye\疾风对决网页版\assets\heroes\奶龙')
OUT = ROOT / 'assets/heroes/nailong'
OUT.mkdir(parents=True, exist_ok=True)
DIRECTIONS = {'s': 1, 'se': 6, 'e': 9, 'ne': 13, 'n': 17, 'nw': 20, 'w': 23, 'sw': 27}

def key_green(im):
    im = im.convert('RGBA')
    pixels = []
    for r,g,b,a in im.getdata():
        # Yellow skin, red fire, and green eyes stay intact; only green-screen hues go.
        if g > r * 1.25 + 12 and g > b * 1.35 + 12:
            pixels.append((0,0,0,0))
        else:
            pixels.append((r,g,b,a))
    im.putdata(pixels)
    return im

def read(name):
    with zipfile.ZipFile(SOURCE / name) as z:
        return [key_green(Image.open(io.BytesIO(z.read(n)))) for n in sorted(z.namelist()) if n.endswith('.png')]

def pack(frames, name, columns=8):
    w,h = frames[0].size
    sheet = Image.new('RGBA', (w*columns,h*((len(frames)+columns-1)//columns)))
    for i,f in enumerate(frames): sheet.paste(f,(i%columns*w,i//columns*h))
    sheet.save(OUT / (name+'.png'))

views = read('角色多视图.zip')
def normalize(frames, anchor_x, anchor_y, target_height=104):
    bounds=[f.getchannel('A').getbbox() for f in frames]
    left=min(b[0] for b in bounds);top=min(b[1] for b in bounds)
    right=max(b[2] for b in bounds);bottom=max(b[3] for b in bounds)
    ratio=target_height/(bottom-top)
    size=(round((right-left)*ratio),target_height)
    origin=(64-round((anchor_x-left)*ratio),119-round((anchor_y-top)*ratio))
    result=[]
    for f in frames:
        cell=Image.new('RGBA',(128,128));cell.paste(f.crop((left,top,right,bottom)).resize(size,Image.Resampling.NEAREST),origin);result.append(cell)
    return result

for direction,index in DIRECTIONS.items():
    frame=views[index-1];normalize([frame],64,frame.getbbox()[3])[0].save(OUT / ('idle-'+direction+'.png'))
attack = read('角色攻击特效.zip')
# Keep the original fixed canvas/anchor through all 39 poses; remove unused right space.
attack = [f.crop((0,65,128,193)) for f in attack]
attack=normalize(attack,66,126)
pack(attack, 'attack')
flames = read('火焰特效.zip')
# Only the active central flight section loops; blank startup/end frames are omitted.
pack([f.crop((72,50,256,170)) for f in flames[16:28]], 'fire')
pack([f.crop((72,50,256,170)) for f in flames[28:39]], 'fire-hit')
manifest = {'directions':DIRECTIONS,'visible_height':104,'attack':{'frames':39,'cell':[128,128],'anchor':[64,119]},
            'fire':{'frames':12,'cell':[184,120],'anchor':[92,60]},'walk':{}}
for d in DIRECTIONS:
    manifests = []
    for generation in ['generated-v2','generated']:
        folder=OUT/generation/('walk-'+d)
        manifests=list(folder.rglob('final_outputs.json')) if folder.exists() else []
        if manifests: break
    if not manifests: continue
    data = json.loads(manifests[0].read_text(encoding='utf-8'))
    candidates = [ROOT / item['path'] for item in data['outputs'] if item['type']=='media' and item['path'].endswith('.webp')]
    for path in candidates:
        with Image.open(path) as im:
            frames = [f.convert('RGBA').copy() for f in ImageSequence.Iterator(im)]
        if any(f.getchannel('A').getextrema()[0]==0 for f in frames): break
    else: raise ValueError('No transparent walk output for '+d)
    # Preserve full animation bounds and use a shared 128px canvas/foot anchor.
    bounds = [f.getchannel('A').getbbox() for f in frames]
    union = (min(b[0] for b in bounds), min(b[1] for b in bounds),max(b[2] for b in bounds),max(b[3] for b in bounds))
    ratio = min(104/(union[3]-union[1]),112/(union[2]-union[0]))
    w,h = round((union[2]-union[0])*ratio),round((union[3]-union[1])*ratio)
    normalized=[]
    for f in frames:
        cell=Image.new('RGBA',(128,128)); cell.paste(f.crop(union).resize((w,h),Image.Resampling.NEAREST),((128-w)//2,119-h)); normalized.append(cell)
    pack(normalized,'walk-'+d)
    manifest['walk'][d]={'frames':len(frames),'cell':[128,128],'anchor':[64,119],'source':str(path.relative_to(ROOT))}
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
preview=Image.new('RGBA',(8*144,300),(40,45,55,255))
for i,d in enumerate(DIRECTIONS):
    with Image.open(OUT/('idle-'+d+'.png')) as im: preview.alpha_composite(im,(i*144,0))
    ImageDraw.Draw(preview).text((i*144,128),d,fill='white')
    walk=OUT/('walk-'+d+'.png')
    if walk.exists():
        with Image.open(walk) as im: preview.alpha_composite(im.crop((256,0,384,128)),(i*144,150))
preview.save(OUT/'preview.png')
print(json.dumps(manifest,ensure_ascii=True))
