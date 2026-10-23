"""Losslessly encode release PNGs; leave source assets and their layout intact."""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import sys
import subprocess
import re
from PIL import Image

root = Path(__file__).resolve().parent.parent
dist = root / (sys.argv[1] if len(sys.argv) > 1 else 'dist')
platform = '--platform' in sys.argv
cache = root / '.cache' / 'webp-lossless-v1'
cache.mkdir(parents=True, exist_ok=True)
source_paths = {hashlib.sha256(p.read_bytes()).hexdigest(): p.relative_to(root).as_posix() for p in (root / 'assets').rglob('*.png')}

def convert(path):
    source = path.read_bytes()
    key = hashlib.sha256(source).hexdigest()
    original_path = source_paths.get(key, '')
    quality = 95 if platform and original_path.startswith(('assets/map-modules/', 'assets/map-concepts/', 'assets/units/')) else None
    # These four large menu/reference illustrations are separate from gameplay textures.
    if platform and original_path.startswith('assets/map-concepts/howling-abyss-target-v1/'):
        quality = 90
    cached = (root / '.cache' / 'quality-probe' / (key + f'-q{quality}.webp')) if quality else cache / (key + '.webp')
    cached.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(source)) as original:
        rgba = original.convert('RGBA')
        if cached.exists():
            try:
                with Image.open(cached) as check:
                    check.load()
            except (OSError, ValueError):
                cached.unlink()
        if not cached.exists():
            temporary = cached.with_suffix('.tmp')
            rgba.save(temporary, 'WEBP', lossless=quality is None, quality=quality or 100, exact=True, method=6)
            temporary.replace(cached)
        result = cached.read_bytes()
        with Image.open(io.BytesIO(result)) as encoded:
            decoded = encoded.convert('RGBA')
            # Compare all four channels, including RGB under transparent pixels.
            alpha_exact = rgba.getchannel('A').tobytes() == decoded.getchannel('A').tobytes()
            rgba_exact = rgba.tobytes() == decoded.tobytes()
            if rgba.size != decoded.size or not alpha_exact or (quality is None and not rgba_exact):
                raise RuntimeError('Lossless pixel check failed: ' + str(path))
        if len(result) >= len(source):
            return {'file': path.relative_to(dist).as_posix(), 'before': len(source), 'after': len(source), 'converted': False}
        name = path.stem + '-' + hashlib.sha256(result).hexdigest()[:8] + '.webp'
        output = path.with_name(name)
        output.write_bytes(result)
        path.unlink()
        return {'file': path.relative_to(dist).as_posix(), 'source': original_path, 'output': output.relative_to(dist).as_posix(), 'width': rgba.width, 'height': rgba.height, 'before': len(source), 'after': len(result), 'converted': True, 'quality': quality or 'lossless', 'alphaExact': alpha_exact, 'rgbaExact': rgba_exact}

# The upload platform's ZIP image picker does not list WebP images.
# Keep its standalone icon as a small, directly selectable PNG.
paths = sorted(p for p in dist.rglob('*.png') if p.relative_to(dist).as_posix() != '000-toy-icon.png')
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
    records = list(executor.map(convert, paths))
replacements = [(r['file'].split('/')[-1], r['output'].split('/')[-1]) for r in records if r['converted']]
audio_records = []
if platform:
    import imageio_ffmpeg
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    for path in dist.rglob('howling-abyss-early-*.mp3'):
        original_bytes = path.read_bytes()
        key = hashlib.sha256(original_bytes).hexdigest()
        encoded = cache / (key + '-opus96.ogg')
        if not encoded.exists():
            temporary = encoded.with_suffix('.tmp.ogg')
            subprocess.run([ffmpeg, '-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(path), '-map', '0:a:0', '-c:a', 'libopus', '-b:a', '96k', '-vbr', 'on', str(temporary)], check=True)
            temporary.replace(encoded)
        def duration(file):
            info = subprocess.run([ffmpeg, '-hide_banner', '-i', str(file)], capture_output=True, text=True, encoding='utf-8', errors='replace').stderr
            match = re.search(r'Duration: (\d+):(\d+):(\d+\.\d+)', info)
            if not match:
                raise RuntimeError('Cannot verify audio duration: ' + str(file))
            h, m, s = map(float, match.groups())
            return 3600*h + 60*m + s
        original_duration, encoded_duration = duration(path), duration(encoded)
        if abs(original_duration - encoded_duration) > 0.1:
            raise RuntimeError('Music duration changed')
        payload = encoded.read_bytes()
        output = path.with_name(path.stem + '-' + hashlib.sha256(payload).hexdigest()[:8] + '.ogg')
        output.write_bytes(payload)
        replacements.append((path.name, output.name))
        audio_records.append({'file': path.relative_to(dist).as_posix(), 'output': output.relative_to(dist).as_posix(), 'before': len(original_bytes), 'after': len(payload), 'codec': 'Opus 96 kbps VBR', 'originalSeconds': original_duration, 'outputSeconds': encoded_duration})
        path.unlink()
# Rehash all chunks as one release graph, so CDN caches cannot reuse pre-optimization JS.
fingerprint = hashlib.sha256()
for path in sorted(p for p in dist.rglob('*') if p.is_file()):
    fingerprint.update(path.relative_to(dist).as_posix().encode())
    fingerprint.update(path.read_bytes())
stamp = fingerprint.hexdigest()[:10]
renames = [(p, p.with_name(p.stem + '-' + stamp + p.suffix)) for p in dist.rglob('*') if p.suffix in ('.js', '.css')]
replacements.extend((before.name, after.name) for before, after in renames)
for path in dist.rglob('*'):
    if path.suffix in ('.js', '.css', '.html', '.json'):
        text = path.read_text(encoding='utf-8')
        updated = text
        for before, after in sorted(replacements, key=lambda pair: -len(pair[0])):
            updated = updated.replace(before, after)
        if updated != text:
            path.write_text(updated, encoding='utf-8')
for before, after in renames:
    before.rename(after)
report = {'method': 'WebP Q95 maps/minions, Q90 menu/reference illustrations, lossless remaining PNGs; original dimensions and exact alpha' if platform else 'lossless WebP, original dimensions, exact RGBA comparison', 'releaseFingerprint': stamp, 'before': sum(r['before'] for r in records), 'after': sum(r['after'] for r in records), 'converted': sum(r['converted'] for r in records), 'audio': audio_records, 'files': records}
(root / 'audit').mkdir(exist_ok=True)
(root / 'audit' / 'web-image-optimization.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: v for k, v in report.items() if k != 'files'}, ensure_ascii=False), flush=True)
