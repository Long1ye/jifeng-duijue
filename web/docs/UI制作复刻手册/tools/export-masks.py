from pathlib import Path
from PIL import Image
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--image',required=True);p.add_argument('--ids',required=True);p.add_argument('--output',required=True);a=p.parse_args()
ids=json.loads(Path(a.ids).read_text(encoding='utf-8'));image=Image.open(a.image);assert image.n_frames==len(ids) and image.size==(64,64)
out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
for n,key in enumerate(ids):
 image.seek(n);alpha=image.convert('RGBA').getchannel('A');assert alpha.getextrema()==(0,255),key;alpha.save(out/f'{key}.png')
print('Exported masks:',len(ids))
