from pathlib import Path
from PIL import Image
import argparse,json
p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--ids',required=True);p.add_argument('--output',required=True);a=p.parse_args()
ids=json.loads(Path(a.ids).read_text(encoding='utf-8'));assert 1<len(ids)<=16,'Use 2 to 16 distinct icons per batch'
images=[Image.open(Path(a.source)/f'{key}.png').convert('RGBA') for key in ids]
assert all(im.size==(64,64) for im in images)
images[0].save(a.output,save_all=True,append_images=images[1:],duration=1000,loop=0,lossless=True,exact=True,method=6)
assert Image.open(a.output).n_frames==len(ids),'Identical frames were merged; split these inputs into separate jobs'
print('Batch frame order:',ids)
