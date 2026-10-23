import type { AbilityKey, Point, Team } from './types';
import { WIND_WALL } from './WindWall';
import {bridgePoint,bridgeTowerRange,BRIDGE_WORLD,BRIDGE} from './Bridge';
// A headless authority explicitly selects the same map as its browser clients.
export const HOWLING_MAP=(globalThis as typeof globalThis & { __MIDLINE_MAP__?: string }).__MIDLINE_MAP__ === 'howling'
  || typeof location!=='undefined'&&new URLSearchParams(location.search).get('map')==='howling';

// Expand terrain in world space without enlarging actors or changing the camera.
// Keep the source PNG untouched and use integer, nearest-neighbor terrain scale.
export const MAP_LAYOUT = { sourceWidth: 511, sourceHeight: 327, scale: 2 } as const;
export const WORLD = {
  width: HOWLING_MAP?BRIDGE_WORLD.width:MAP_LAYOUT.sourceWidth * MAP_LAYOUT.scale,
  height: HOWLING_MAP?BRIDGE_WORLD.height:MAP_LAYOUT.sourceHeight * MAP_LAYOUT.scale,
  step: 1 / 60,
} as const;
export const VIEWPORT = { width: 480, height: 270 } as const;
export function mapToWorld(point: Point): Point {
  return { x: point.x * MAP_LAYOUT.scale, y: point.y * MAP_LAYOUT.scale };
}
export const BALANCE = {
  csToWin: 100,
  firstWaveAt: 2,
  waveInterval: 30,
  aiInterval: 0.18,
  hero: { hp: 640, mana: 0, speed: 80, range: 58, damage: 43, attackInterval: 0.8, windup: 0.19 },
  melee: { hp: 150, speed: 28, range: 13, damage: 6, attackInterval: 1.25, windup: 0.24 },
  ranged: { hp: 105, speed: 28, range: 76, damage: 6, attackInterval: 1.45, windup: 0.25 },
  tower: { hp: 1000, range: HOWLING_MAP?bridgeTowerRange(BRIDGE.blue.outerTower[0]):78, damage: 90, attackInterval: 1.15, windup: 0.15 },
  projectileSpeed: 190,
  fountainRadius: 22 * MAP_LAYOUT.scale,
  fountainHeal: 42,
} as const;

export const ABILITIES: Record<AbilityKey, { name: string; cost: number; cooldown: number; range: number; damage: number }> = {
  q: { name: '斩钢闪', cost: 0, cooldown: 2.5, range: 145, damage: 85 },
  w: { name: '风之障壁', cost: 0, cooldown: 14, range: WIND_WALL.distance, damage: 0 },
  e: { name: '踏前斩', cost: 0, cooldown: 0.1, range: 100, damage: 55 },
  r: { name: '狂风绝息斩', cost: 0, cooldown: 45, range: 420, damage: 200 },
};

// The study's corner platforms are fountains; combat towers stand further up the lane.
export const BASES: Record<Team, Point> = { blue: mapToWorld({ x: 51, y: 305 }), red: mapToWorld({ x: 459, y: 44 }) };
export const TOWERS: Record<Team, Point> = { blue: mapToWorld({ x: 115, y: 262 }), red: mapToWorld({ x: 395, y: 85 }) };
export const SPAWNS: Record<Team, Point> = { blue: mapToWorld({ x: 145, y: 241 }), red: mapToWorld({ x: 364, y: 109 }) };
/** Exit at the lane-facing rim of each circular Nexus, not inside its stone footprint. */
export const MINION_EXITS: Record<Team, Point> = {blue: BASES.blue, red: BASES.red};
export const AI_HOLD: Point = HOWLING_MAP?bridgePoint(70):mapToWorld({ x: 305, y: 147 });
if(HOWLING_MAP){
 const b=BRIDGE.blue;
 BASES.blue=bridgePoint(b.spawn[0]);BASES.red=bridgePoint(-b.spawn[0]);
 TOWERS.blue=bridgePoint(b.outerTower[0]);TOWERS.red=bridgePoint(-b.outerTower[0]);
 SPAWNS.blue=bridgePoint(b.spawn[0]);SPAWNS.red=bridgePoint(-b.spawn[0]);
 MINION_EXITS.blue=bridgePoint(b.nexus[0]+30);
 MINION_EXITS.red=bridgePoint(-b.nexus[0]-30);
}
