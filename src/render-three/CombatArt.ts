import qBody from '../../assets/heroes/yasuo/q-draw-v2-2026-10-13/body.png?url';
import qSword from '../../assets/heroes/yasuo/q-draw-2026-10-13/sword.png?url';
import qWind from '../../assets/effects/yasuo-q-meowa-2026-10-19/runtime/thrust-atlas.png?url';
import qWindHit from '../../assets/effects/yasuo-q-meowa-2026-10-19/runtime/hit-atlas.png?url';
import cast from '../../assets/hero-skills/2026-10-12/yasuo/w-v5-user-pose-se/media/e-atlas.png?url';
import ultimate from '../../assets/hero-skills/2026-10-12/yasuo/r-v1-last-breath/media/e-atlas.png?url';
import ring from '../../assets/hero-skills/2026-10-12/yasuo/eq-v2-ring-only/media/e-atlas.png?url';
import ring3 from '../../assets/hero-skills/2026-10-12/yasuo/eq3-v1-layered-ring/refined/media/e-atlas.png?url';
import eqSlash from '../../assets/eq-v3/runtime/slash-atlas.png?url';
import eqStorm from '../../assets/eq-v3/runtime/storm-atlas.png?url';
import towerEnergy from '../../assets/tower-vfx/runtime/energy-atlas.png?url';
import minionAttack from '../../assets/minion-vfx/runtime/energy-atlas.png?url';
import tornado from '../../assets/effects/yasuo-q3-meowa-2026-10-19/runtime/tornado-atlas.png?url';
import stormHit from '../../assets/effects/yasuo-q3-meowa-2026-10-19/runtime/hit-atlas.png?url';
import wall from '../../assets/effects/wind-wall-v2-2026-10-15/runtime/wind-wall-atlas.png?url';
import shield from '../../assets/effects/yasuo-passive-shield-2026-10-15/runtime/shield-atlas.png?url';
import aura from '../../assets/effects/yasuo-aura-summoners-2026-10-15/runtime/vfx-atlas.png?url';
import homeguard from '../../assets/effects/homeguard-v1/generated/Single_isolated_pixel_art_game_VFX_sprite_for_homeguard_movement_speed_boost_Three_delicate_icy_pale_blue_and_99487f23/result_images_0_url.png?url';
import move from '../../assets/ui/move-click-2026-10-15/official/move-click-atlas.png?url';
import attack from '../../assets/ui/move-click-2026-10-15/official/move-click-atlas-red.png?url';
import type { Entity } from '../game/types';
import { YASUO_R, yasuoRFrame } from '../game/YasuoR';
import { W_CAST_SECONDS } from '../game/WindWall';
import { qDrawPose } from '../render/YasuoQDraw';
import { yasuoCastFacing } from '../render/YasuoCastFacing';
import { HERO_EFFECT_SCALE } from '../render/Presentation';

export const COMBAT_ART = {
  qBody: { url: qBody, width: 64, height: 113 }, qSword: { url: qSword, width: 135, height: 39 },
  qWind: { url: qWind, width: 512, height: 256 }, qWindHit: { url: qWindHit, width: 512, height: 512 },
  cast: { url: cast, width: 128, height: 127 }, ultimate: { url: ultimate, width: 176, height: 176 },
  ring: { url: ring, width: 176, height: 144 }, ring3: { url: ring3, width: 176, height: 144 },
  eqSlash: { url: eqSlash, width: 256, height: 512 }, eqStorm: { url: eqStorm, width: 256, height: 512 },
  towerEnergy: { url: towerEnergy, width: 256, height: 256 },
  minionAttack: { url: minionAttack, width: 256, height: 256 },
  tornado: { url: tornado, width: 256, height: 512 }, stormHit: { url: stormHit, width: 512, height: 512 }, wall: { url: wall, width: 560, height: 244 },
  shield: { url: shield, width: 356, height: 556 }, aura: { url: aura, width: 256, height: 320 },
  homeguard: { url: homeguard, width: 0, height: 0 },
  move: { url: move, width: 128, height: 128 }, attack: { url: attack, width: 128, height: 128 },
} as const;
export type CombatArtKey = keyof typeof COMBAT_ART;

/** Same approved clips and anchors as ArenaScene; only heading is projected. */
export function combatBodyPose(entity: Entity, time: number, heading: (facing: number) => number, qAge?: number) {
  if (entity.rCast && time - entity.rCast.startedAt < YASUO_R.animationDuration)
    return { key: 'ultimate' as const, frame: yasuoRFrame(time - entity.rCast.startedAt), ax: 104 / 176, ay: 149 / 176, flip: false, scale: HERO_EFFECT_SCALE };
  const cast = entity.q3Cast ?? (entity.wCast && time < entity.wCast.startedAt + W_CAST_SECONDS ? entity.wCast : null);
  if (cast) {
    const facing = yasuoCastFacing(heading(cast.facing));
    return { key: 'cast' as const, frame: Math.min(7, Math.floor(Math.max(0, time - cast.startedAt) * 10)), ax: facing.originX, ay: facing.originY, flip: facing.flipX, scale: HERO_EFFECT_SCALE };
  }
  if (entity.qCast && !entity.eCast) {
    const pose = qDrawPose(qAge ?? time - entity.qCast.startedAt, heading(entity.qCast.facing));
    return { key: 'qBody' as const, frame: pose.frame, ax: pose.originX, ay: pose.originY, flip: pose.flipX, scale: HERO_EFFECT_SCALE };
  }
  return null;
}
