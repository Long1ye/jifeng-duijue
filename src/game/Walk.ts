import { HOWLING_MAP } from './config';
import { bridgeDetour, clearBridgeFootprints } from './BridgeInteraction';
import { clampPoint, distance, moveTowards } from './geometry';
import { HOMEGUARD, homeguardActive } from './Homeguard';
import { inHitStun } from './HitStun';
import { minionMovementSpeed } from './MinionLane';
import type { Entity, Point } from './types';
import {equipmentStats} from './ItemCatalog';

/** Shared locomotion only: never advances combat, damage or other entities. */
export function walkUnit(unit: Entity, target: Point, dt: number, time: number, chasing = false): void {
  if (inHitStun(unit, time)) return;
  const waypoint = HOWLING_MAP ? bridgeDetour(unit, target, unit.radius, unit.id) : target;
  unit.facing = Math.atan2(waypoint.y - unit.y, waypoint.x - unit.x);
  moveTowards(unit, waypoint, minionMovementSpeed(unit, chasing) * dt
    * (unit.slowUntil > time ? 1-.3*(1-Math.min(.75,unit.kind==='hero'?equipmentStats(unit).slowResist:0)) : 1) * (homeguardActive(unit, time) ? HOMEGUARD.multiplier : 1));
  const point = clampPoint(unit, unit.radius);
  Object.assign(unit, HOWLING_MAP ? clampPoint(clearBridgeFootprints(point, unit.radius, unit.id)) : point);
  if (unit.destination && distance(unit, unit.destination) < 1) unit.destination = null;
}
