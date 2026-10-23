import fluteUrl from '../../assets/heroes/yasuo/flute-user/flute.png?url';
import {YASUO_FLUTE} from './YasuoAnimation';
import {YASUO_EMOTES} from './YasuoAnimation';
import { YASUO_ASSETS, type YasuoClip } from './YasuoAnimation';
import { YASUO_Q_ASSETS } from './YasuoQAnimation';
import { YASUO_E_CLIPS } from './YasuoEAnimation';

const urls = import.meta.glob('../../assets/heroes/yasuo/locomotion16-2026-10-15/runtime/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

const attackUrls=import.meta.glob('../../assets/heroes/yasuo/attacks-v2-2026-10-13/attack-*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export const YASUO_TEXTURES: { clip: YasuoClip; url: string }[] = [
  ...YASUO_ASSETS.attacks, ...YASUO_ASSETS.locomotion,
].map(clip => {
  const url = 'id' in clip ? attackUrls[`../../assets/heroes/yasuo/attacks-v2-2026-10-13/${clip.sheet}`] : urls[`../../assets/heroes/yasuo/locomotion16-2026-10-15/runtime/${clip.sheet}`];
  if (!url) throw new Error(`Missing selected Yasuo atlas: ${clip.sheet}`);
  return { clip, url };
});

const qUrls = import.meta.glob('../../assets/heroes/yasuo/q-meowa-eight-2026-10-13/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;
for (const clip of YASUO_Q_ASSETS.clips) {
  const url = qUrls[`../../assets/heroes/yasuo/q-meowa-eight-2026-10-13/${clip.sheet}`];
  if (!url) throw new Error(`Missing Yasuo Q atlas: ${clip.sheet}`);
  YASUO_TEXTURES.push({ clip, url });
}
const eUrls = import.meta.glob('../../assets/hero-skills/2026-10-12/yasuo/e-v7-fixed-right/*/media/e-atlas.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;
for (const clip of YASUO_E_CLIPS) {
  const url = eUrls[`../../assets/hero-skills/2026-10-12/yasuo/e-v7-fixed-right/${clip.direction}/media/e-atlas.png`];
  if (!url) throw new Error(`Missing Yasuo E atlas: ${clip.direction}`);
  YASUO_TEXTURES.push({ clip, url });
}

YASUO_TEXTURES.push({clip:YASUO_FLUTE,url:fluteUrl});
const emoteUrls=import.meta.glob('../../assets/heroes/yasuo/emotes-v3-2026-10-19/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
for(const clip of YASUO_EMOTES){
  const url=emoteUrls[`../../assets/heroes/yasuo/emotes-v3-2026-10-19/${clip.sheet}`];
  if(!url)throw new Error(`Missing Yasuo emote atlas: ${clip.sheet}`);
  YASUO_TEXTURES.push({clip,url});
}
