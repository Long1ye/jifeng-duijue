import type { Entity, GameEvent, Point, Team } from '../game/types';

export const VISION = { hero: 360, melee: 240, ranged: 240, tower: 430, feather: 52, revealSeconds: 1.5 } as const;
export interface VisionSource extends Point { radius: number; brush: string | null }

/** Presentation-side team sight, independent of the camera and of wall-clock time. */
export class TeamVision {
  readonly sources: VisionSource[] = [];
  private readonly revealed = new Map<number, number>();
  constructor(readonly team: Team = 'blue', private readonly brushAt: (point: Point) => string | null = () => null) {}
  reset(): void { this.sources.length = 0; this.revealed.clear(); }
  brush(point: Point): string | null { return this.brushAt(point); }
  update(time: number, entities: readonly Entity[], events: readonly GameEvent[] = [], permanent: readonly (Point & { radius: number })[] = []): void {
    this.sources.length = 0;
    for (const entity of entities) if (entity.team === this.team && entity.hp > 0) this.sources.push({ x: entity.x, y: entity.y, radius: VISION[entity.kind], brush: this.brushAt(entity) });
    for (const source of permanent) this.sources.push({ ...source, brush: this.brushAt(source) });
    for (const [id, until] of this.revealed) if (time >= until) this.revealed.delete(id);
    for (const event of events) if (event.team !== this.team && event.sourceId !== undefined && (event.type === 'attack' || event.type === 'hit')) {
      const target = entities.find(e => e.id === event.targetId);
      if (target?.team === this.team && this.pointVisible(target)) this.revealed.set(event.sourceId, time + VISION.revealSeconds);
    }
  }
  strength(point: Point): number {
    const brush = this.brushAt(point); let value = 0;
    for (const source of this.sources) {
      if (brush !== null && source.brush !== brush) continue;
      const d = Math.hypot(point.x - source.x, point.y - source.y);
      const t = Math.max(0, Math.min(1, (source.radius - d) / VISION.feather));
      value = Math.max(value, t * t * (3 - 2 * t));
      if (value === 1) break;
    }
    return value;
  }
  pointVisible(point: Point): boolean {
    const brush = this.brushAt(point);
    return this.sources.some(source => (brush === null || source.brush === brush) && Math.hypot(point.x - source.x, point.y - source.y) <= source.radius - 8);
  }
  entityVisible(entity: Entity): boolean { return entity.team === this.team || this.revealed.has(entity.id) || this.pointVisible(entity); }
  eventVisible(event: GameEvent): boolean { return event.team === this.team || event.type === 'end' || event.type === 'wave' || this.pointVisible(event); }
}
