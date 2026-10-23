from pathlib import Path
from PIL import Image,ImageChops
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--atlas',required=True);p.add_argument('--rects',required=True);p.add_argument('--output',required=True);a=p.parse_args()
image=Image.open(a.atlas);out=Path(a.output);out.mkdir(parents=True,exist_ok=True)
for key,rect in json.loads(Path(a.rects).read_text(encoding='utf-8')).items():
 target=out/f'{key}.png';crop=image.crop(rect);crop.save(target)
 assert Image.open(target).convert('RGBA').tobytes()==crop.convert('RGBA').tobytes()
print('Cropped icons without resampling.')
