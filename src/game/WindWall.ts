import type { Point, Team } from './types';
export const W_CAST_SECONDS = 0.8;
export const W_DELAY = 0.3;
export const W_DURATION = 3.9;
/** Shared world-space dimensions for interception, previews and rendering. */
export const WIND_WALL = {width:128,height:64,thickness:8,distance:48} as const;
export function circleHit(from: Point, to: Point, center: Point, radius: number): number | null {
  const dx=to.x-from.x, dy=to.y-from.y, ox=from.x-center.x, oy=from.y-center.y;
  const c=ox*ox+oy*oy-radius*radius, a=dx*dx+dy*dy;
  if(c<=0) return 0;
  if(a===0) return null;
  const b=2*(ox*dx+oy*dy), disc=b*b-4*a*c;
  if(disc<0) return null;
  const t=(-b-Math.sqrt(disc))/(2*a);
  return t>=0 && t<=1 ? t : null;
}
export interface WindWall extends Point { id: number; team: Team; angle: number; startsAt: number; }
export function wallEnds(w: WindWall): [Point, Point] {
  const x = -Math.sin(w.angle) * WIND_WALL.width/2, y = Math.cos(w.angle) * WIND_WALL.width/2;
  return [{ x: w.x - x, y: w.y - y }, { x: w.x + x, y: w.y + y }];
}
/** Swept segment versus wall rectangle, including projectile radius. */
export function wallHit(w: WindWall, from: Point, to: Point, radius: number): number | null {
  const c = Math.cos(w.angle), s = Math.sin(w.angle);
  const local = (p: Point) => [(p.x-w.x)*c+(p.y-w.y)*s, -(p.x-w.x)*s+(p.y-w.y)*c];
  const a = local(from), b = local(to), limits = [WIND_WALL.thickness/2 + radius, WIND_WALL.width/2 + radius];
  let lo = 0, hi = 1;
  for (let i = 0; i < 2; i++) {
    const d = b[i]-a[i];
    if (Math.abs(d)<1e-9) { if (Math.abs(a[i])>limits[i]) return null; continue; }
    const t1=(-limits[i]-a[i])/d, t2=(limits[i]-a[i])/d;
    lo=Math.max(lo,Math.min(t1,t2)); hi=Math.min(hi,Math.max(t1,t2));
    if(lo>hi) return null;
  }
  return lo;
}
