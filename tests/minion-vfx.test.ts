import { afterEach, describe, expect, it, vi } from 'vitest';
import { Mesh, Texture, TextureLoader } from 'three';
import { Match } from '../src/game/Match';
import { CombatEffects } from '../src/render-three/CombatEffects';
import { ActorSprites } from '../src/render-three/ActorSprites';
import { ThreeCamera } from '../src/render-three/Coordinates';
import { RenderPositions } from '../src/render/RenderPositions';
import { minionBoltPose } from '../src/render-three/MinionAttackPresentation';
import type { Projectile } from '../src/game/types';
afterEach(() => vi.restoreAllMocks());
describe('real minion attack presentation', () => {
 it('renders a visible caster missile when simulation velocity fields are zero', () => {
  const pending: (() => void)[] = [];
  vi.spyOn(TextureLoader.prototype, 'load').mockImplementation((_url, done) => { const texture = new Texture({ width: 1024, height: 1024 } as HTMLImageElement); pending.push(() => done?.(texture)); return texture; });
  const effects = new CombatEffects(), actors = new ActorSprites(), camera = new ThreeCamera(), match = new Match({ ai: false, waves: false });
  match.start();
  const source = match.spawnMinion('red', 'ranged', { x: 550, y: 350 }), target = match.spawnMinion('blue', 'melee', { x: 480, y: 350 });
  match.projectiles.push({ id: 999, sourceId: source.id, targetId: target.id, team: 'red', kind: 'attack', startedAt: 0, x: 520, y: 350, speed: 190, vx: 0, vy: 0, damage: 6, remaining: 4, radius: 1.5 });
  pending.forEach(done => done()); const positions = new RenderPositions();
  const frame = { match, alpha: 1, positions, events: [] };
  try {
   effects.consume(frame, actors); effects.update(frame, camera, actors);
   const missile = effects.sprites.group.children.find(c => c.name === 'minion-caster-bolt') as Mesh;
   expect(missile?.visible).toBe(true);
   const p = missile.geometry.getAttribute('position'); expect(Math.abs(p.getX(1) - p.getX(0))).toBeGreaterThan(20);
   match.damage(source, target, 6); match.projectiles = [];
   effects.consume({ ...frame, events: match.drainEvents() }, actors); effects.update(frame, camera, actors);
   expect(effects.sprites.group.children.some(c => c.visible && c.name === 'minion-caster-contact')).toBe(true);
   source.kind = 'melee'; match.damage(source, target, 6);
   effects.consume({ ...frame, events: match.drainEvents() }, actors); effects.update(frame, camera, actors);
   expect(effects.sprites.group.children.some(c => c.visible && c.name === 'minion-melee-contact')).toBe(true);
  } finally { effects.dispose(); actors.dispose(); }
 });
 it('aims a caster bolt at moving targets across all headings and camera candidates', () => {
  const match = new Match({ ai: false, waves: false }), source = match.spawnMinion('blue', 'ranged', { x: 500, y: 350 }), target = match.hero('red'), camera = new ThreeCamera();
  const shot: Projectile = { id: 999, sourceId: source.id, targetId: target.id, team: 'blue', kind: 'attack', x: 500, y: 350, speed: 190, vx: 0, vy: 0, damage: 6, remaining: 4, radius: 1.5 };
  for (const elevation of [45, 60, 75]) for (let i = 0; i < 8; i++) {
   camera.setElevation(elevation); target.x = 500 + Math.cos(i * Math.PI / 4) * 70; target.y = 350 + Math.sin(i * Math.PI / 4) * 70;
   const pose = minionBoltPose(shot, source, target, camera, 1), a = camera.project(pose.point, pose.height), b = camera.project(target, 35);
   expect(Math.cos(pose.angle) * (b.y - a.y) + Math.sin(pose.angle) * (b.x - a.x)).toBeCloseTo(0);
   expect(Math.cos(pose.angle) * (b.x - a.x) - Math.sin(pose.angle) * (b.y - a.y)).toBeGreaterThan(0);
  }
 });
});
