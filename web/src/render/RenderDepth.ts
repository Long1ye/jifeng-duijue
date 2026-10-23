import { WORLD } from '../game/config';

/** Ground contact determines occlusion, never sprite height, bob or airborne lift. */
export const actorDepth = (footY:number,offset=0) => 10+footY+offset;
/** Keep critical feedback above world-sorted actors AND the weather layer (10000). */
export const RENDER_DEPTH = {
  feedback: Math.max(10001,WORLD.height+100),
  bars: Math.max(10010,WORLD.height+110),
  text: Math.max(10020,WORLD.height+120),
} as const;
