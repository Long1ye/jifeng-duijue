import type { Entity, Point } from './types';
import { clampPoint, direction, distance } from './geometry';
import {pickUnit} from './UnitMetrics';
export const E = { range: 100, travel: 128, startup: 0.08, dash: 0.44, recovery: 0.12, duration: 0.64, targetCooldown: 6 } as const;
export const EQ = { radius:50, windup: 0.1, recovery: 0.3, duration: 0.4, frameSeconds: 0.1 } as const;
export interface DashCast { startedAt: number; start: Point; end: Point; facing: number; targetId: number; hit: boolean; }
export function isDashing(hero: Entity, time: number): boolean { return !!hero.eCast && hero.hp > 0 && time < hero.eCast.startedAt + E.duration; }
export function dashEndpoint(hero: Point & {radius?:number}, target: Point & {radius?:number}): Point {
  const dir=direction(hero,target);
  const clearance=(hero.radius??11)+(target.radius??7)+6;
  const travel=Math.min(E.travel,distance(hero,target)+clearance);
  return clampPoint({x:hero.x+dir.x*travel,y:hero.y+dir.y*travel},hero.radius??11);
}
export function pickDashTarget(hero: Entity, entities: Entity[], cursor: Point): Entity | undefined {
  // Resolve the hovered target before eligibility: never silently choose a different unit.
  const target=pickUnit(entities,cursor);
  return target&&target.team!==hero.team&&target.kind!=='tower'?target:undefined;
}

