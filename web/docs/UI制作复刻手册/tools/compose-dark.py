from pathlib import Path
from PIL import Image,ImageFilter
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--original',required=True);p.add_argument('--masks',required=True);p.add_argument('--output',required=True);p.add_argument('--ids');a=p.parse_args()
out=Path(a.output);out.mkdir(parents=True,exist_ok=True);source=Path(a.source)
ids=json.loads(Path(a.ids).read_text(encoding='utf-8')) if a.ids else [int(f.stem) for f in source.glob('*.png')]
for key in ids:
 foreground=Image.open(source/f'{key}.png').convert('RGB');assert foreground.size==(64,64)
 if key in [2055,3072]:result=foreground
 else:
  original=Image.open(Path(a.original)/f'{key}.png').convert('RGB').resize((64,64),Image.Resampling.BOX)
  background=original.filter(ImageFilter.GaussianBlur(12)).point(lambda c:round(c*.22));mask=Image.open(Path(a.masks)/f'{key}.png').convert('L');assert mask.size==(64,64)
  result=Image.composite(foreground,background,mask)
  f=result.tobytes();s=foreground.tobytes()
  for n,alpha in enumerate(mask.tobytes()):
   if alpha==255:assert f[n*3:n*3+3]==s[n*3:n*3+3],key
 result.save(out/f'{key}.png')
print('Composed',len(ids),'icons; opaque foreground pixels preserved.')
