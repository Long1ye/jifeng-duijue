import { Box3, Raycaster, Vector2, Vector3, type Object3D } from 'three';
import type { Point, Team } from '../game/types';
import type { ThreeCamera, ViewRect } from './Coordinates';

/** Pick only explicitly supplied entity proxies; scenery cannot capture commands. */
export function pickActorId(view: ThreeCamera, rect: ViewRect, client: Point, actors: Object3D[], raycaster = new Raycaster(), options: { preferredTeam?: Team; paddingCss?: number } = {}): number | null {
  if (!(rect.width > 0 && rect.height > 0)) return null;
  const u = (client.x - rect.left) / rect.width, v = (client.y - rect.top) / rect.height;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  raycaster.setFromCamera(new Vector2(u * 2 - 1, 1 - v * 2), view.camera);
  for (const actor of actors) actor.updateWorldMatrix(true, false);
  const hits = raycaster.intersectObjects(actors, false);
  // Keep the original exact-ray behavior for callers without targeting assistance.
  if (!options.preferredTeam && !options.paddingCss) {
    const hit = hits.find(hit => Number.isSafeInteger(hit.object.userData.entityId));
    return hit ? hit.object.userData.entityId : null;
  }
  const direct = new Map(hits.map(hit => [hit.object, hit.distance]));
  const box = new Box3(), corner = new Vector3();
  const candidates: { id: number; preferred: boolean; direct: boolean; score: number; depth: number }[] = [];
  for (const actor of actors) {
    if (!Number.isSafeInteger(actor.userData.entityId)) continue;
    box.setFromObject(actor);
    if (box.isEmpty()) continue;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      corner.set(x, y, z).project(view.camera);
      const sx = rect.left + (corner.x + 1) * rect.width / 2;
      const sy = rect.top + (1 - corner.y) * rect.height / 2;
      left = Math.min(left, sx); right = Math.max(right, sx);
      top = Math.min(top, sy); bottom = Math.max(bottom, sy);
    }
    const exact = direct.has(actor);
    const outside = Math.hypot(Math.max(left - client.x, 0, client.x - right), Math.max(top - client.y, 0, client.y - bottom));
    // Only assist just outside a body; don't fill the cylinder's empty corner regions.
    if (!exact && (outside === 0 || outside > (options.paddingCss ?? 0))) continue;
    const dx = (client.x - (left + right) / 2) / Math.max(1, (right - left) / 2);
    const dy = (client.y - (top + bottom) / 2) / Math.max(1, (bottom - top) / 2);
    candidates.push({ id: actor.userData.entityId, preferred: actor.userData.entityTeam === options.preferredTeam,
      direct: exact, score: dx * dx + dy * dy, depth: direct.get(actor) ?? Infinity });
  }
  // Hostile bodies remain clickable through allied proxies. No hero-over-minion
  // priority: nearest body center wins within the same hit class, preserving last hits.
  candidates.sort((a, b) => Number(b.preferred) - Number(a.preferred) || Number(b.direct) - Number(a.direct)
    || a.score - b.score || a.depth - b.depth || a.id - b.id);
  return candidates[0]?.id ?? null;
}
