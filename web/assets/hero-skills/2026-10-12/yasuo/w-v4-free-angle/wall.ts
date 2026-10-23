/** Standalone world-space wind curtain. It never rotates an upright bitmap. */
export interface Point { x: number; y: number }
export interface WallSpec { center: Point; angle: number; width: number; height: number; thickness: number }
export interface Projection { origin: Point; groundScale: number }
export const LIFE = { rise: 420, fade: 3400, end: 3900, windPeriod: 1800 } as const;
export const DEFAULT = { width: 138, height: 57, thickness: 10, distance: 60 } as const;
export const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const smooth = (v: number) => { const x = clamp(v); return x * x * (3 - 2 * x); };
const TAU = Math.PI * 2;
export const normalize = (degrees: number) => ((degrees % 360) + 360) % 360;
export function basis(angle: number) {
  const r = normalize(angle) * Math.PI / 180;
  return { normal: { x: Math.cos(r), y: Math.sin(r) }, tangent: { x: -Math.sin(r), y: Math.cos(r) } };
}
export function makeWall(caster: Point, angle: number, width: number = DEFAULT.width, height: number = DEFAULT.height): WallSpec {
  const { normal } = basis(angle);
  return { center: { x: caster.x + normal.x * DEFAULT.distance, y: caster.y + normal.y * DEFAULT.distance },
    angle: normalize(angle), width, height, thickness: DEFAULT.thickness };
}
export function groundPoint(wall: WallSpec, along: number, across = 0): Point {
  const { normal, tangent } = basis(wall.angle);
  return { x: wall.center.x + tangent.x * along + normal.x * across, y: wall.center.y + tangent.y * along + normal.y * across };
}
export function project(p: Point, z: number, camera: Projection): Point {
  return { x: camera.origin.x + p.x, y: camera.origin.y + p.y * camera.groundScale - z };
}
export function unproject(p: Point, camera: Projection): Point {
  return { x: p.x - camera.origin.x, y: (p.y - camera.origin.y) / camera.groundScale };
}
export function endpoints(wall: WallSpec) { return [groundPoint(wall, -wall.width / 2), groundPoint(wall, wall.width / 2)] as const; }
export function stateAt(age: number, alongFraction = 0) {
  const opacity = 1 - smooth((age - LIFE.fade) / (LIFE.end - LIFE.fade));
  const grow = smooth((age - Math.abs(alongFraction) * 110) / (LIFE.rise - 110));
  return { grow, opacity: age < 0 ? 0 : opacity, active: age >= 0 && age < LIFE.end,
    phase: age < 0 ? '等待' : age < LIFE.rise ? '升起' : age < LIFE.fade ? '持续' : age < LIFE.end ? '消散' : '结束' };
}
const random = (n: number) => { const v = Math.sin(n * 127.1 + 311.7) * 43758.5453; return v - Math.floor(v); };
function path(ctx: CanvasRenderingContext2D, points: Point[]) {
  ctx.beginPath(); points.forEach((p, i) => { if (i === 0) ctx.moveTo(Math.round(p.x), Math.round(p.y)); else ctx.lineTo(Math.round(p.x), Math.round(p.y)); });
}
function stroke(ctx: CanvasRenderingContext2D, points: Point[], color: string, alpha: number, width: number) {
  if (points.length < 2 || alpha <= 0) return;
  ctx.strokeStyle = color; ctx.globalAlpha = clamp(alpha); ctx.lineWidth = width; path(ctx, points); ctx.stroke();
}

/** age controls one-shot birth/death; windTime is independent so a held wall keeps flowing. */
export function drawWindWall(ctx: CanvasRenderingContext2D, wall: WallSpec, camera: Projection, age: number, windTime: number) {
  const life = stateAt(age); if (!life.active || life.opacity <= 0) return;
  const cycle = normalize(windTime / LIFE.windPeriod * 360) / 360;
  const phase = cycle * TAU;
  const point = (u: number, z: number, n = 0) => project(groundPoint(wall, u, n), z, camera);
  const growth = (u: number) => stateAt(age, u / (wall.width / 2)).grow;
  const crest = (u: number) => wall.height * (0.86 + 0.14 * Math.cos(u / wall.width * Math.PI)) * growth(u);
  ctx.save(); ctx.imageSmoothingEnabled = false; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // Soft ground footprint, with thickness retained at edge-on headings.
  const foot = [point(-wall.width / 2, 0, -7), point(wall.width / 2, 0, -7), point(wall.width / 2, 0, 7), point(-wall.width / 2, 0, 7)];
  ctx.fillStyle = '#a4d1c8'; ctx.globalAlpha = life.opacity * life.grow * 0.075; path(ctx, foot); ctx.closePath(); ctx.fill();
  // Extremely faint curtain volume; the moving ribbons supply most of the silhouette.
  for (const side of [-1, 1]) {
    const outline: Point[] = [];
    for (let i = 0; i <= 32; i++) {
      const u = (i / 32 - 0.5) * wall.width;
      outline.push(point(u, crest(u) + Math.sin(i * 0.8 + phase) * 1.7 * growth(u), side * wall.thickness / 2));
    }
    for (let i = 32; i >= 0; i--) outline.push(point((i / 32 - 0.5) * wall.width, 1, side * wall.thickness / 2));
    ctx.fillStyle = '#a7d6d0'; ctx.globalAlpha = life.opacity * life.grow * 0.08; path(ctx, outline); ctx.closePath(); ctx.fill();
  }
  // Sort ribbons by ground depth, not screen height, so all angles preserve front/back order.
  const ribbons = Array.from({ length: 46 }, (_, i) => {
    const u = (i / 45 - 0.5) * (wall.width - 5);
    const across = (random(i + 5) - 0.5) * wall.thickness;
    return { i, u, across, depth: groundPoint(wall, u, across).y };
  }).sort((a, b) => a.depth - b.depth);
  for (const { i, u, across } of ribbons) {
    const local = growth(u), height = crest(u);
    if (height < 1) continue;
    const travel = (cycle + random(i * 3 + 1)) % 1;
    const head = travel * (wall.height + 28);
    const tail = head - 18 - random(i + 70) * 19;
    const points: Point[] = [];
    for (let k = 0; k <= 10; k++) {
      const z = tail + (head - tail) * k / 10;
      if (z < 1 || z > height) continue;
      const sway = Math.sin(z / 10 + phase + i * 0.81) * (1.4 + 2.5 * z / wall.height);
      points.push(point(clamp(u + sway, -wall.width / 2, wall.width / 2), z, across + Math.sin(z / 15 + phase + i) * 1.8));
    }
    const edge = Math.sin(Math.PI * clamp((u + wall.width / 2) / wall.width)) ** 0.3;
    const alpha = life.opacity * local * edge * (0.28 + random(i + 90) * 0.48);
    stroke(ctx, points, '#8cbab6', alpha * 0.25, 4);
    stroke(ctx, points, i % 3 === 0 ? '#e7f6ed' : '#b9dcd4', alpha, i % 4 === 0 ? 2 : 1);
  }
  // Thin transverse sweeps bind individual rising gusts into one continuous wall.
  for (let ribbon = 0; ribbon < 4; ribbon++) {
    const travel = (cycle + ribbon / 4) % 1;
    const z = travel * wall.height;
    const points: Point[] = [];
    for (let i = 0; i <= 38; i++) {
      const u = (i / 38 - 0.5) * wall.width;
      if (z > crest(u)) continue;
      points.push(point(u, z + Math.sin(u / 17 + phase + ribbon) * 2.2, Math.sin(u / 23 + phase + ribbon) * wall.thickness * 0.55));
    }
    const alpha = Math.sin(travel * Math.PI) * life.opacity * life.grow;
    stroke(ctx, points, '#d6ebe0', alpha * 0.32, 1);
  }
  // Feathered particles at the top dissipate instead of forming a hard rectangular edge.
  for (let i = 0; i < 24; i++) {
    const u = (random(i + 101) - 0.5) * wall.width;
    const travel = (cycle + random(i + 155)) % 1;
    const height = crest(u), local = growth(u);
    const p = point(u + Math.sin(phase + i) * 3, height - 8 + travel * 16, Math.sin(phase + i * 2) * wall.thickness);
    ctx.globalAlpha = life.opacity * local * Math.sin(travel * Math.PI) * 0.42;
    ctx.fillStyle = '#d5ece2'; ctx.fillRect(Math.round(p.x), Math.round(p.y), i % 4 === 0 ? 2 : 1, 1);
  }
  ctx.restore();
}

export function drawFootprint(ctx: CanvasRenderingContext2D, wall: WallSpec, camera: Projection, color = '#8bc4c0') {
  const [a, b] = endpoints(wall).map(p => project(p, 0, camera));
  ctx.save(); ctx.globalAlpha = 0.65; ctx.setLineDash([3, 3]); ctx.strokeStyle = color; ctx.lineWidth = 1;
  path(ctx, [a, b]); ctx.stroke(); ctx.setLineDash([]);
  for (const p of [a, b]) { ctx.fillStyle = color; ctx.fillRect(Math.round(p.x) - 1, Math.round(p.y) - 1, 3, 3); }
  ctx.restore();
}
